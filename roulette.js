// 本格物理演算ルーレットエンジン（剛体衝突・バネ振動・火花スパーク・BGM＆ドラムロール同期版）
const canvas = document.getElementById('roulette-canvas');
const ctx = canvas.getContext('2d');
const btnSpin = document.getElementById('btn-spin');
const statusText = document.getElementById('status-text');

const staticPointer = document.querySelector('.roulette-pointer');
if (staticPointer) staticPointer.style.display = 'none';

let optA = "A";
let optB = "B";

// --- 物理演算パラメータ ---
let wheelAngle = 0;          // ホイールの現在角度 (rad)
let wheelVelocity = 0;       // ホイールの角速度 (rad/frame)
const baseFriction = 0.996;  // 軸受け摩擦
const pinDrag = 0.0022;      // ピン衝突時のエネルギー損失

// 上部フラッパー（針）のバネ物理パラメータ
let flapperAngle = 0;        // 針の傾き角度 (rad)
let flapperVelocity = 0;     // 針の角速度
const springK = 0.28;        // バネ定数
const springDamping = 0.82;  // 減衰係数

let isSpinning = false;
let phase = 'idle';          // idle, spinning, critical, finished
let heartbeatTimer = 0;
let lastPassedPin = -1;

const PI2 = Math.PI * 2;
const numSegments = 8;
const segmentAngle = PI2 / numSegments;
const POINTER_ANGLE = Math.PI * 1.5;

const COLOR_A_BG = '#22000c';
const COLOR_A_NEON = '#ff003c';
const COLOR_B_BG = '#001a24';
const COLOR_B_NEON = '#00f3ff';
const COLOR_ACCENT = '#ff00ea';
const COLOR_PIN = '#fcee0a';

function stepPhysics() {
  if (isSpinning) {
    wheelAngle += wheelVelocity;
    wheelAngle = (wheelAngle % PI2 + PI2) % PI2;

    wheelVelocity *= baseFriction;
    const speed = Math.abs(wheelVelocity);

    // シンセエンジン音のピッチ・フィルターを速度に同期
    if (typeof AudioEngine.updateEngine === 'function') {
      AudioEngine.updateEngine(speed * 2.2);
    }

    const relativeAngle = (POINTER_ANGLE - wheelAngle + PI2 * 10) % PI2;
    const currentPinIndex = Math.floor(relativeAngle / segmentAngle);
    const distFromPin = relativeAngle % segmentAngle;

    // ピン通過時の物理衝突
    if (currentPinIndex !== lastPassedPin) {
      lastPassedPin = currentPinIndex;

      const impact = Math.min(speed * 2.8, 0.85);
      flapperVelocity += (wheelVelocity >= 0 ? impact : -impact);

      if (speed > 0.004) {
        wheelVelocity *= (1 - pinDrag * 12);
      }

      // 針先から火花（スパーク）を散らす
      if (typeof VFX.spawnSparks === 'function') {
        const rect = canvas.getBoundingClientRect();
        const sparkX = rect.left + rect.width / 2;
        const sparkY = rect.top + 28;
        VFX.spawnSparks(sparkX, sparkY, speed * 2.5);
      }

      // 効果音＋低速域スネアドラムロール再生
      const isCritical = (phase === 'critical');
      AudioEngine.playTick(Math.min(speed * 2.5, 1.5), isCritical);
    }

    // 停止寸前の「ピン乗り越え／押し戻し」物理シミュレーション
    if (speed < 0.015 && phase !== 'finished') {
      if (distFromPin < 0.08 && distFromPin > 0.005) {
        wheelVelocity -= 0.00035;
      } else if (distFromPin > segmentAngle - 0.08) {
        wheelVelocity += 0.00035;
      }
    }

    // フェーズ演出切り替え
    if (phase === 'spinning' && speed < 0.065) {
      phase = 'critical';
      statusText.textContent = "CRITICAL PHYSICS PHASE...";
      statusText.style.color = "#fcee0a";
      statusText.style.textShadow = "0 0 12px #fcee0a";
    }

    if (phase === 'critical' && speed < 0.025 && speed > 0.001) {
      heartbeatTimer++;
      if (heartbeatTimer % 45 === 0) {
        AudioEngine.playHeartbeat();
        statusText.textContent = "VERDICT INCOMING...";
        statusText.style.color = "#ff00ea";
        statusText.style.textShadow = "0 0 15px #ff00ea";
      }
    }

    // 完全停止判定
    if (speed < 0.0004 && Math.abs(flapperVelocity) < 0.002 && Math.abs(flapperAngle) < 0.01) {
      wheelVelocity = 0;
      finishSpin();
    }
  }

  // フラッパー（針）のバネ振動物理
  const springForce = -springK * flapperAngle;
  flapperVelocity += springForce;
  flapperVelocity *= springDamping;
  flapperAngle += flapperVelocity;
}

function drawRoulette() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 32;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelAngle);

  for (let i = 0; i < numSegments; i++) {
    const isRed = i % 2 === 0;
    const startAngle = i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const neonColor = isRed ? COLOR_A_NEON : COLOR_B_NEON;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = isRed ? COLOR_A_BG : COLOR_B_BG;
    ctx.fill();

    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = neonColor;
    ctx.shadowBlur = 16;
    ctx.shadowColor = neonColor;
    ctx.stroke();
    ctx.restore();

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

  // 外周二重ネオンリング
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

  // 物理演算フラッパー（上部でバネ振動する針）
  ctx.save();
  ctx.translate(cx, cy - radius - 14);
  ctx.rotate(flapperAngle);

  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(14, -8);
  ctx.lineTo(0, 38);
  ctx.closePath();

  ctx.fillStyle = COLOR_PIN;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_PIN;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

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
    if (typeof AudioEngine.stopEngine === 'function') AudioEngine.stopEngine();
    drawRoulette();
  },
  spin() {
    if (isSpinning) return;
    isSpinning = true;
    phase = 'spinning';
    heartbeatTimer = 0;
    lastPassedPin = -1;
    wheelVelocity = 0.42 + Math.random() * 0.25;
    btnSpin.classList.add('spinning');
    btnSpin.textContent = "WAIT...";
    statusText.textContent = "ROULETTE IS SPINNING!";
    statusText.style.color = "#00f3ff";
    statusText.style.textShadow = "0 0 12px #00f3ff";
    if (typeof AudioEngine.startEngine === 'function') AudioEngine.startEngine();
  }
};

btnSpin.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  Roulette.spin();
});

loop();
