// 物理演算ルーレットエンジン（サイバーパンク・ネオン同期版）
const canvas = document.getElementById('roulette-canvas');
const ctx = canvas.getContext('2d');
const btnSpin = document.getElementById('btn-spin');
const statusText = document.getElementById('status-text');

let optA = "A";
let optB = "B";

let currentRotation = 0; // 角度(rad)
let velocity = 0;
let isSpinning = false;
let phase = 'idle'; // idle, spinning, slowing, heartbeats, finished

const PI2 = Math.PI * 2;
const numSegments = 8; // AとBが交互に4つずつ
const segmentAngle = PI2 / numSegments;

// サイバーパンクカラーパレット（CSSと完全同期）
const COLOR_A_BG = '#22000c';
const COLOR_A_NEON = '#ff003c'; // Red / Crimson
const COLOR_B_BG = '#001a24';
const COLOR_B_NEON = '#00f3ff'; // Neon Cyan
const COLOR_ACCENT = '#ff00ea'; // Neon Pink

// 描画関数
function drawRoulette() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 24;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentRotation);

  for (let i = 0; i < numSegments; i++) {
    const isRed = i % 2 === 0;
    const startAngle = i * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const neonColor = isRed ? COLOR_A_NEON : COLOR_B_NEON;

    // セグメント背景
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = isRed ? COLOR_A_BG : COLOR_B_BG;
    ctx.fill();

    // ネオン発光する境界線
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = neonColor;
    ctx.shadowBlur = 18;
    ctx.shadowColor = neonColor;
    ctx.stroke();
    ctx.restore();

    // テキスト描画（多重ネオングロー）
    ctx.save();
    ctx.rotate(startAngle + segmentAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Courier New", "Noto Sans JP", monospace';
    ctx.shadowBlur = 16;
    ctx.shadowColor = neonColor;
    
    const text = isRed ? optA : optB;
    ctx.fillText(text, radius - 34, 0);
    // 2度描きで発光を強調
    ctx.shadowBlur = 6;
    ctx.fillText(text, radius - 34, 0);
    ctx.restore();
    
    // ピン描画（ネオンイエロー発光）
    ctx.save();
    const pinX = Math.cos(startAngle) * (radius - 12);
    const pinY = Math.sin(startAngle) * (radius - 12);
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5, 0, PI2);
    ctx.fillStyle = '#fcee0a';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#fcee0a';
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
  
  // 外枠の二重ネオンリング
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, PI2);
  ctx.strokeStyle = COLOR_B_NEON;
  ctx.lineWidth = 6;
  ctx.shadowBlur = 25;
  ctx.shadowColor = COLOR_B_NEON;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, PI2);
  ctx.strokeStyle = COLOR_ACCENT;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_ACCENT;
  ctx.stroke();
  ctx.restore();
}

let lastTickAngle = 0;
let animationId;

function update() {
  if (!isSpinning) {
    drawRoulette();
    return;
  }

  currentRotation += velocity;
  currentRotation %= PI2;

  // ピン通過判定（効果音）
  const normalizedRot = (PI2 - currentRotation) % PI2;
  const currentSegment = Math.floor(normalizedRot / segmentAngle);
  if (currentSegment !== lastTickAngle) {
    AudioEngine.playTick(Math.abs(velocity));
    lastTickAngle = currentSegment;
  }

  if (phase === 'spinning') {
    velocity *= 0.995; // 摩擦減速
    if (velocity < 0.05) {
      phase = 'slowing';
      statusText.textContent = "CRITICAL PHASE...";
      statusText.style.color = "#fcee0a";
      statusText.style.textShadow = "0 0 10px #fcee0a, 0 0 20px #fcee0a";
    }
  } else if (phase === 'slowing') {
    velocity *= 0.985;
    if (velocity < 0.008) {
      phase = 'heartbeats';
      velocity = 0.008; // 超低速固定
      statusText.textContent = "VERDICT INCOMING...";
      statusText.style.color = "#ff00ea";
      statusText.style.textShadow = "0 0 10px #ff00ea, 0 0 25px #ff00ea";
      AudioEngine.playHeartbeat();
      setTimeout(() => AudioEngine.playHeartbeat(), 800);
      setTimeout(() => AudioEngine.playHeartbeat(), 1600);
      
      setTimeout(() => {
        finishSpin();
      }, 2400);
    }
  }

  drawRoulette();
  animationId = requestAnimationFrame(update);
}

function finishSpin() {
  isSpinning = false;
  phase = 'finished';
  cancelAnimationFrame(animationId);
  btnSpin.classList.remove('spinning');
  btnSpin.textContent = "SPIN!";

  // 判定（ポインターは上部 = 270度 = -PI/2）
  const pointerAngle = (Math.PI * 1.5 - currentRotation + PI2 * 10) % PI2;
  const winningSegment = Math.floor(pointerAngle / segmentAngle);
  const isRedWin = winningSegment % 2 === 0;

  AudioEngine.playFanfare(isRedWin);
  VFX.triggerExplosion(isRedWin);

  setTimeout(() => {
    document.dispatchEvent(new CustomEvent('rouletteFinished', { 
      detail: { isRedWin, winnerText: isRedWin ? optA : optB, loserText: isRedWin ? optB : optA } 
    }));
  }, 1000);
}

const Roulette = {
  init(a, b) {
    optA = a;
    optB = b;
    currentRotation = 0;
    drawRoulette();
  },
  spin() {
    if (isSpinning) return;
    isSpinning = true;
    phase = 'spinning';
    velocity = 0.4 + Math.random() * 0.2; // 初速
    btnSpin.classList.add('spinning');
    btnSpin.textContent = "WAIT...";
    statusText.textContent = "ROULETTE IS SPINNING!";
    statusText.style.color = "#00f3ff";
    statusText.style.textShadow = "0 0 10px #00f3ff, 0 0 20px #00f3ff";
    update();
  }
};

btnSpin.addEventListener('click', () => {
  // 初回クリックでAudioContextを有効化
  if (audioCtx.state === 'suspended') audioCtx.resume();
  Roulette.spin();
});

// 初期描画
drawRoulette();
