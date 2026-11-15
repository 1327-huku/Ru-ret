// 本格物理演算ルーレットエンジン（剛体衝突・バネ振動・ピン抵抗シミュレーション）
const canvas = document.getElementById('roulette-canvas');
const ctx = canvas.getContext('2d');
const btnSpin = document.getElementById('btn-spin');
const statusText = document.getElementById('status-text');

// 元のHTML上の静的ポインターを隠す（Canvas内で物理演算フラッパーを描画するため）
const staticPointer = document.querySelector('.roulette-pointer');
if (staticPointer) staticPointer.style.display = 'none';

let optA = "A";
let optB = "B";

// --- 物理演算パラメータ ---
let wheelAngle = 0;          // ホイールの現在角度 (rad)
let wheelVelocity = 0;       // ホイールの角速度 (rad/frame)
const baseFriction = 0.996;  // 空気・軸受けの微弱な摩擦
const pinDrag = 0.0022;      // ピンが針を弾くときに奪われるエネルギー

// 上部フラッパー（針）のバネ物理パラメータ
let flapperAngle = 0;        // 針の傾き角度 (rad)
let flapperVelocity = 0;     // 針の角速度
const springK = 0.28;        // バネの硬さ（フックの法則）
const springDamping = 0.82;  // 振動の減衰率

let isSpinning = false;
let phase = 'idle';          // idle, spinning, critical, finished
let heartbeatTimer = 0;
let lastPassedPin = -1;

const PI2 = Math.PI * 2;
const numSegments = 8;
const segmentAngle = PI2 / numSegments;
const POINTER_ANGLE = Math.PI * 1.5; // 上部（270度位置）

// サイバーパンクカラーパレット
const COLOR_A_BG = '#22000c';
const COLOR_A_NEON = '#ff003c';
const COLOR_B_BG = '#001a24';
const COLOR_B_NEON = '#00f3ff';
const COLOR_ACCENT = '#ff00ea';
const COLOR_PIN = '#fcee0a';

// 物理演算ステップ更新
function stepPhysics() {
  // 1. ホイールの角速度と摩擦の計算
  if (isSpinning) {
    wheelAngle += wheelVelocity;
    wheelAngle = (wheelAngle % PI2 + PI2) % PI2;

    // 軸受け摩擦
    wheelVelocity *= baseFriction;

    // 現在のピン位置と上部針の衝突判定
    // 各セグメントの境界（i * segmentAngle）にピンがある
    const relativeAngle = (POINTER_ANGLE - wheelAngle + PI2 * 10) % PI2;
    const currentPinIndex = Math.floor(relativeAngle / segmentAngle);
    const distFromPin = relativeAngle % segmentAngle;

    // ピン通過時の物理衝突（針を弾き、ホイールが減速する）
    if (currentPinIndex !== lastPassedPin) {
      lastPassedPin = currentPinIndex;

      // ホイールの速度に応じて針を物理的に蹴り上げる
      const impact = Math.min(Math.abs(wheelVelocity) * 2.8, 0.85);
      flapperVelocity += (wheelVelocity >= 0 ? impact : -impact);

      // 運動エネルギー損失（ピンに当たって減速）
      if (Math.abs(wheelVelocity) > 0.004) {
        wheelVelocity *= (1 - pinDrag * 12);
      }

      // 効果音再生
      AudioEngine.playTick(Math.min(Math.abs(wheelVelocity) * 2.5, 1.5));
    }

    // 停止寸前の「ピン乗り越え／押し戻し」物理シミュレーション
    if (Math.abs(wheelVelocity) < 0.015 && phase !== 'finished') {
      // ピンが針のすぐ手前にある場合、針のバネ反発力で押し戻される力（トルク）が発生
      if (distFromPin < 0.08 && distFromPin > 0.005) {
        wheelVelocity -= 0.00035; // 針に弾かれて逆回転する力
      } else if (distFromPin > segmentAngle - 0.08) {
        wheelVelocity += 0.00035; // ピンを乗り越えて前に落ちる力
      }
    }

    // フェーズ演出の切り替え
    const speed = Math.abs(wheelVelocity);
    if (phase === 'spinning' && speed < 0.06) {
      phase = 'critical';
      statusText.textContent = "CRITICAL PHYSICS PHASE...";
      statusText.style.color = "#fcee0a";
      statusText.style.textShadow = "0 0 12px #fcee0a";
    }

    // 心音演出（低速域）
    if (phase === 'critical' && speed < 0.025 && speed > 0.001) {
      heartbeatTimer++;
      if (heartbeatTimer % 45 === 0) {
        AudioEngine.playHeartbeat();
        statusText.textContent = "VERDICT INCOMING...";
        statusText.style.color = "#ff00ea";
        statusText.style.textShadow = "0 0 15px #ff00ea";
      }
    }

    // 完全停止判定（速度と針の揺れがほぼゼロになったら確定）
    if (speed < 0.0004 && Math.abs(flapperVelocity) < 0.002 && Math.abs(flapperAngle) < 0.01) {
      wheelVelocity = 0;
      finishSpin();
    }
  }

  // 2. フラッパー（針）のバネ振動物理（Hooke's Law: F = -k * x）
  const springForce = -springK * flapperAngle;
  flapperVelocity += springForce;
  flapperVelocity *= springDamping;
  flapperAngle += flapperVelocity;
}

// 描画関数
function drawRoulette() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 32;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- ホイール本体 ---
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelAngle);

  for (let i = 0; i < numSegments; i++) {
    const isRed = i % 2 === 0;
    const startAngle = i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const neonColor = isRed ? COLOR_A_NEON : COLOR_B_NEON;

    // セグメント塗りつぶし
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = isRed ? COLOR_A_BG : COLOR_B_BG;
    ctx.fill();

    // ネオン境界線
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = neonColor;
    ctx.shadowBlur = 16;
    ctx.shadowColor = neonColor;
    ctx.stroke();
    ctx.restore();

    // テキスト
    ctx.save();
    ctx.rotate(startAngle + segmentAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Courier New", "Noto Sans JP", monospace';
    ctx.shadowBlur = 14;
    ctx.shadowColor = neonColor;
    const text = isRed ? optA : optB;
    ctx.fillText(text, radius - 38, 0);
    ctx.restore();

    // 物理衝突ピン（外周に配置）
    ctx.save();
    const pinX = Math.cos(startAngle) * (radius - 10);
    const pinY = Math.sin(startAngle) * (radius - 10);
    ctx.beginPath();
    ctx.arc(pinX, pinY, 6, 0, PI2);
    ctx.fillStyle = COLOR_PIN;
    ctx.shadowBlur = 14;
    ctx.shadowColor = COLOR_PIN;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // --- 外周ネオンリング ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, PI2);
  ctx.strokeStyle = COLOR_B_NEON;
  ctx.lineWidth = 5;
  ctx.shadowBlur = 22;
  ctx.shadowColor = COLOR_B_NEON;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 9, 0, PI2);
  ctx.strokeStyle = COLOR_ACCENT;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 14;
  ctx.shadowColor = COLOR_ACCENT;
  ctx.stroke();
  ctx.restore();

  // --- 物理演算フラッパー（上部でバネ振動する針） ---
  ctx.save();
  ctx.translate(cx, cy - radius - 14); // 針の支点
  ctx.rotate(flapperAngle);            // バネ物理による傾きを適用

  // 針の本体（サイバーパンク・ブレード）
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(14, -8);
  ctx.lineTo(0, 38); // ピンに当たる先端
  ctx.closePath();

  ctx.fillStyle = COLOR_PIN;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_PIN;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // 支点ボルト
  ctx.beginPath();
  ctx.arc(0, -4, 7, 0, PI2);
  ctx.fillStyle = '#050505';
  ctx.fill();
  ctx.strokeStyle = COLOR_B_NEON;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function loop() {
  stepPhysics();
  drawRoulette();
  requestAnimationFrame(loop);
}

function finishSpin() {
  isSpinning = false;
  phase = 'finished';
  btnSpin.classList.remove('spinning');
  btnSpin.textContent = "SPIN!";

  // 最終停止角度から勝者を判定
  const pointerRelAngle = (POINTER_ANGLE - wheelAngle + PI2 * 10) % PI2;
  const winningSegment = Math.floor(pointerRelAngle / segmentAngle);
  const isRedWin = winningSegment % 2 === 0;

  AudioEngine.playFanfare(isRedWin);
  VFX.triggerExplosion(isRedWin);

  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('rouletteFinished', {
      detail: {
        isRedWin,
        winnerText: isRedWin ? optA : optB,
        loserText: isRedWin ? optB : optA
      }
    }));
  }, 1000);
}

const Roulette = {
  init(a, b) {
    optA = a;
    optB = b;
    wheelAngle = 0;
    wheelVelocity = 0;
    flapperAngle = 0;
    flapperVelocity = 0;
    lastPassedPin = -1;
    drawRoulette();
  },
  spin() {
    if (isSpinning) return;
    isSpinning = true;
    phase = 'spinning';
    heartbeatTimer = 0;
    lastPassedPin = -1;
    // ランダムな初速トルクを与える
    wheelVelocity = 0.42 + Math.random() * 0.25;
    btnSpin.classList.add('spinning');
    btnSpin.textContent = "WAIT...";
    statusText.textContent = "ROULETTE IS SPINNING!";
    statusText.style.color = "#00f3ff";
    statusText.style.textShadow = "0 0 12px #00f3ff";
  }
};

btnSpin.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  Roulette.spin();
});

// 物理演算＆描画ループ開始
loop();
