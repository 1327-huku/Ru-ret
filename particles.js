// 物理パーティクル＆VFXエンジン
const fxCanvas = document.getElementById('fx-canvas');
const ctx = fxCanvas.getContext('2d');

let particles = [];
let spotlights = [];
let width, height;

function resize() {
  width = fxCanvas.width = window.innerWidth;
  height = fxCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Confetti {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = (Math.random() - 1) * 20 - 5;
    this.color = color;
    this.size = Math.random() * 8 + 4;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 20;
    this.life = 1.0;
    this.decay = Math.random() * 0.01 + 0.005;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.5; // 重力
    this.vx *= 0.98; // 空気抵抗
    this.rotation += this.rotSpeed;
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
    ctx.restore();
  }
}

class Spotlight {
  constructor(x, color) {
    this.x = x;
    this.color = color;
    this.angle = 0;
    this.targetAngle = (Math.random() - 0.5) * 40;
  }
  update() {
    this.angle += (this.targetAngle - this.angle) * 0.05;
    if (Math.abs(this.targetAngle - this.angle) < 1) {
      this.targetAngle = (Math.random() - 0.5) * 40;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, 0);
    ctx.rotate(this.angle * Math.PI / 180);
    
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, this.color + '88'); // 50% opacity
    grad.addColorStop(1, this.color + '00'); // 0% opacity
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.lineTo(300, height);
    ctx.lineTo(-300, height);
    ctx.fill();
    ctx.restore();
  }
}

const VFX = {
  startSpotlights() {
    spotlights = [
      new Spotlight(width * 0.2, '#00f0ff'),
      new Spotlight(width * 0.8, '#ff003c')
    ];
  },
  stopSpotlights() {
    spotlights = [];
  },
  triggerExplosion(isRed) {
    const color = isRed ? '#ff003c' : '#00f0ff';
    const altColor = '#ffffff';
    for (let i = 0; i < 150; i++) {
      particles.push(new Confetti(
        width / 2, 
        height / 2, 
        Math.random() > 0.5 ? color : altColor
      ));
    }
    
    // 画面シェイク
    document.getElementById('app-container').classList.add('shake-active');
    setTimeout(() => {
      document.getElementById('app-container').classList.remove('shake-active');
    }, 400);
  },
  animate() {
    ctx.clearRect(0, 0, width, height);
    
    // 暗い背景
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, width, height);

    spotlights.forEach(s => {
      s.update();
      s.draw(ctx);
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.life <= 0 || p.y > height) {
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(VFX.animate);
  }
};

VFX.animate();
