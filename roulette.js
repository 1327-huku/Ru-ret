// 物理演算ルーレットエンジン
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

// 描画関数
function drawRoulette() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 20;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentRotation);

  for (let i = 0; i < numSegments; i++) {
    const isRed = i % 2 === 0;
    const startAngle = i * segmentAngle;
    const endAngle = startAngle + segmentAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = isRed ? '#2a000a' : '#001a22';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = isRed ? '#ff003c' : '#00f0ff';
    ctx.stroke();

    // テキスト描画
    ctx.save();
    ctx.rotate(startAngle + segmentAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Noto Sans JP", sans-serif';
    ctx.shadowBlur = 10;
    ctx.shadowColor = isRed ? '#ff003c' : '#00f0ff';
    
    const text = isRed ? optA : optB;
    ctx.fillText(text, radius - 30, 0);
    ctx.restore();
    
    // ピン描画
    ctx.beginPath();
    ctx.arc(Math.cos(startAngle) * (radius - 10), Math.sin(startAngle) * (radius - 10), 5, 0, PI2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  ctx.restore();
  
  // 外枠ネオン
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, PI2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 10;
  ctx.stroke();
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
      statusText.style.color = "#ffcc00";
    }
  } else if (phase === 'slowing') {
    velocity *= 0.985;
    if (velocity < 0.008) {
      phase = 'heartbeats';
      velocity = 0.008; // 超低速固定
      statusText.textContent = "VERDICT INCOMING...";
      statusText.style.color = "#fff";
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
    statusText.style.color = "#00f0ff";
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
