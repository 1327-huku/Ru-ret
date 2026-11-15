// Web Audio API を使ったサイバーパンク・シンセサイザー＆エンジン音響
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const AudioEngine = {
  engineOsc: null,
  engineSubOsc: null,
  engineGain: null,
  engineFilter: null,

  // 回転中の重厚なシンセベース・エンジン音開始
  startEngine() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    this.stopEngine();

    const t = audioCtx.currentTime;
    this.engineOsc = audioCtx.createOscillator();
    this.engineSubOsc = audioCtx.createOscillator();
    this.engineFilter = audioCtx.createBiquadFilter();
    this.engineGain = audioCtx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineSubOsc.type = 'square';
    this.engineOsc.frequency.setValueAtTime(55, t);
    this.engineSubOsc.frequency.setValueAtTime(27.5, t);

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, t);
    this.engineFilter.Q.setValueAtTime(6, t);

    this.engineGain.gain.setValueAtTime(0.01, t);
    this.engineGain.gain.linearRampToValueAtTime(0.16, t + 0.3);

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(audioCtx.destination);

    this.engineOsc.start(t);
    this.engineSubOsc.start(t);
  },

  // 回転速度に応じたエンジン音変調
  updateEngine(speedFactor) {
    if (!this.engineOsc || !this.engineGain) return;
    const t = audioCtx.currentTime;
    const norm = Math.min(Math.max(speedFactor, 0), 1.5);
    const freq = 42 + norm * 85;
    const filterFreq = 120 + norm * 900;

    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.05);
    this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);
    this.engineGain.gain.setTargetAtTime(Math.min(0.18, 0.03 + norm * 0.14), t, 0.05);
  },

  // エンジン音停止
  stopEngine() {
    if (this.engineOsc) {
      try {
        const t = audioCtx.currentTime;
        this.engineGain.gain.setTargetAtTime(0.0001, t, 0.05);
        this.engineOsc.stop(t + 0.15);
        this.engineSubOsc.stop(t + 0.15);
      } catch (e) {}
      this.engineOsc = null;
      this.engineSubOsc = null;
      this.engineGain = null;
      this.engineFilter = null;
    }
  },

  // ピン弾き音（金属的クリック＋低速域のスネアドラムロール）
  playTick(speedFactor = 1.0, isCritical = false) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = isCritical ? 'sawtooth' : 'triangle';
    const freq = 580 + (speedFactor * 450); 
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.055);

    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.055);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.055);

    // 決着前の緊張ドラムロール（ホワイトノイズスネア）
    if (isCritical) {
      const bufSize = Math.floor(audioCtx.sampleRate * 0.06);
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = audioCtx.createBufferSource();
      noise.buffer = buf;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1200;

      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.22, t);
      nGain.gain.exponentialRampToValueAtTime(0.005, t + 0.06);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(audioCtx.destination);
      noise.start(t);
    }
  },

  // 心音（重低音ビート）
  playHeartbeat() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(68, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.42);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.42);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.42);
  },

  // 勝利ファンファーレ＆衝撃波爆発音
  playFanfare(isRed) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    this.stopEngine();
    const t = audioCtx.currentTime;
    
    const baseFreq = isRed ? 440 : 523.25;
    const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2.0];

    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t + (i * 0.09));
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.2, t + (i * 0.09));
      gain.gain.linearRampToValueAtTime(0, t + 2.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(t + (i * 0.09));
      osc.stop(t + 2.2);
    });

    // 重厚な爆発音（ノイズ）
    const bufferSize = audioCtx.sampleRate * 1.2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(120, t + 1.2);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noise.start(t);
  }
};
