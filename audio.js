// Web Audio API を使ったシンセサイザー効果音エンジン
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const AudioEngine = {
  playTick(speedFactor = 1.0) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // 回転スピードに応じて音の高さと長さを変える
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    // 速いほど高く、遅いほど低く
    const freq = 600 + (speedFactor * 400); 
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  },

  playHeartbeat() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.4);
  },

  playFanfare(isRed) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    
    // 勝者に応じたコード進行
    const baseFreq = isRed ? 440 : 523.25; // A4 or C5
    const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t + (i * 0.1));
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.2, t + (i * 0.1));
      gain.gain.linearRampToValueAtTime(0, t + 2.0);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(t + (i * 0.1));
      osc.stop(t + 2.0);
    });

    // 爆発音（ノイズ）
    const bufferSize = audioCtx.sampleRate * 1.0;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noise.start(t);
  }
};
