// 物理パーティクル＆VFXエンジン（サイバーパンク・ネオン同期版）
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');

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
    this.vx = (Math.random() - 0.5) * 24;
    this.vy = (Math.random() - 1) * 22 - 6;
    this.color = color;
    this.size = Math.random() * 9 + 4;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 24;
    this.life = 1.0;
    this.decay = Math.random() * 0.012 + 0.005;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.52; // 重力
    this.vx *= 0.98; // 空気抵抗
    this.rotation += this.rotSpeed;
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class Spotlight {
  constructor(x, color) {
    this.x = x;
    this.color = color;
    this.angle = 0;
    this.targetAngle = (Math.random() - 0.5) * 45;
  }
  update() {
    this.angle += (this.targetAngle - this.angle) * 0.05;
    if (Math.abs(this.targetAngle - this.angle) < 1) {
      this.targetAngle = (Math.random() - 0.5) * 45;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, 0);
    ctx.rotate(this.angle * Math.PI / 180);
    
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, this.color + '99'); // 60% opacity
    grad.addColorStop(1, this.color + '00'); // 0% opacity
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.lineTo(340, height);
    ctx.lineTo(-340, height);
    ctx.fill();
    ctx.restore();
  }
}

const VFX = {
  startSpotlights() {
    // CSSのメインカラー（シアン＆ピンク）に統一
    spotlights = [
      new Spotlight(width * 0.2, '#00f3ff'),
      new Spotlight(width * 0.8, '#ff00ea')
    ];
  },
  stopSpotlights() {
    spotlights = [];
  },
  triggerExplosion(isRed) {
    // 勝者カラー + CSSアクセント（ピンク・イエロー・ホワイト）で華やかに爆発
    const mainColor = isRed ? '#ff003c' : '#00f3ff';
    const subColor = isRed ? '#ff00ea' : '#bd00ff';
    const sparkColor = '#fcee0a';

    for (let i = 0; i < 180; i++) {
      const rand = Math.random();
      let pColor = mainColor;
      if (rand > 0.7) pColor = subColor;
      else if (rand > 0.5) pColor = sparkColor;
      else if (rand > 0.35) pColor = '#ffffff';

      particles.push(new Confetti(
        width / 2, 
        height / 2, 
        pColor
      ));
    }
    
    // 画面シェイク
    const container = document.getElementById('app-container');
    if (container) {
      container.classList.add('shake-active');
      setTimeout(() => {
        container.classList.remove('shake-active');
      }, 450);
    }
  },
  animate() {
    fxCtx.clearRect(0, 0, width, height);
    
    // サイバーブラックの残像オーバーレイ
    fxCtx.fillStyle = 'rgba(5, 5, 5, 0.25)';
    fxCtx.fillRect(0, 0, width, height);

    spotlights.forEach(s => {
      s.update();
      s.draw(fxCtx);
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.update();
      p.draw(fxCtx);
      if (p.life <= 0 || p.y > height) {
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(VFX.animate);
  }
};

VFX.animate();
