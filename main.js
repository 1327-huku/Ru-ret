// 全体進行管理とUI制御
const inputPhase = document.getElementById('input-phase');
const roulettePhase = document.getElementById('roulette-phase');
const resultPhase = document.getElementById('result-phase');

const inputA = document.getElementById('opt-a');
const inputB = document.getElementById('opt-b');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const btnSave = document.getElementById('btn-save');

// 入力バリデーション
function checkInputs() {
  if (inputA.value.trim() && inputB.value.trim()) {
    btnStart.removeAttribute('disabled');
  } else {
    btnStart.setAttribute('disabled', 'true');
  }
}

inputA.addEventListener('input', checkInputs);
inputB.addEventListener('input', checkInputs);

// プリセットボタン
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    inputA.value = e.target.dataset.a;
    inputB.value = e.target.dataset.b;
    checkInputs();
  });
});

// スタートボタン
btnStart.addEventListener('click', () => {
  const valA = inputA.value.trim() || "OPTION A";
  const valB = inputB.value.trim() || "OPTION B";

  Roulette.init(valA, valB);
  
  inputPhase.classList.add('hidden');
  inputPhase.classList.remove('active-phase');
  
  roulettePhase.classList.remove('hidden');
  roulettePhase.classList.add('active-phase');
  
  VFX.startSpotlights();
});

// 結果受け取り
document.addEventListener('rouletteFinished', (e) => {
  const { isRedWin, winnerText, loserText } = e.detail;
  
  roulettePhase.classList.add('hidden');
  roulettePhase.classList.remove('active-phase');
  
  resultPhase.classList.remove('hidden');
  resultPhase.classList.add('active-phase');

  const winnerEl = document.getElementById('result-winner');
  winnerEl.textContent = winnerText;
  winnerEl.className = 'winner-text ' + (isRedWin ? 'red-win' : 'blue-win');
  
  document.getElementById('result-loser').textContent = `Defeated: ${loserText}`;
});

// リセットボタン
btnReset.addEventListener('click', () => {
  resultPhase.classList.add('hidden');
  resultPhase.classList.remove('active-phase');
  
  inputPhase.classList.remove('hidden');
  inputPhase.classList.add('active-phase');
  
  document.getElementById('status-text').textContent = "WAITING FOR SPIN...";
  document.getElementById('status-text').style.color = "#fff";
  
  VFX.stopSpotlights();
});

// 画像保存 (簡易実装 - 実際のブラウザ環境ではhtml2canvas等が必要な場合あり)
btnSave.addEventListener('click', () => {
  // 結果画面の背景を一時的に描画して保存するダミーロジック
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 418;
  const ctx = c.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, c.width, c.height);
  
  // 装飾
  ctx.strokeStyle = document.getElementById('result-winner').classList.contains('red-win') ? '#ff003c' : '#00f0ff';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 760, 378);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEON DECISION VERDICT', 400, 80);

  ctx.font = 'bold 60px sans-serif';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillText(document.getElementById('result-winner').textContent, 400, 220);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(document.getElementById('result-loser').textContent, 400, 300);

  const link = document.createElement('a');
  link.download = `decision_${Date.now()}.png`;
  link.href = c.toDataURL('image/png');
  link.click();
});
