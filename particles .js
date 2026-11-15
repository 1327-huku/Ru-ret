// 物理パーティクル＆VFXエンジン（火花スパーク・衝撃波・ネオン同期版）
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');

let particles = [];
let sparks = [];
let shockwaves = [];
let spotlights = [];
let width, height;

function resize() {
  width = fxCanvas.width = window.innerWidth;
  height = fxCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ピン衝突時のネオン火花（スパーク）
class Spark {
  constructor(x, y, color, power = 1.0) {
    this.x = x;
    this.y = y;
    const angle = Math.PI * 0.1 + Math.random() * Math.PI * 0.8; // 下〜左右方向に飛び散る
    const speed = (3 + Math.random() * 10) * Math.min(power + 0.4, 1.8);
    this.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    this.vy = Math.sin(angle) * speed * 0.7 - 2;
    this.color = color;
    this.life = 1.0;
    this.decay = 0.04 + Math.random() * 0.04;
    this.length = 6 + Math.random() * 10;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.35; // 重力
    this.vx *= 0.96;
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 1.4, this.y - this.vy * 1.4);
    ctx.stroke();
    ctx.restore();
  }
}

// 決着時の衝撃波リング
class Shockwave {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.maxRadius = Math.max(width, height) * 0.85;
    this.color = color;
    this.life = 1.0;
  }
  update() {
    this.radius += (this.maxRadius - this.radius) * 0.08 + 12;
    this.life -= 0.025;
  }
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 14 * this.life;
    ctx.shadowBlur = 30;
    ctx.shadowColor = this.color;
    ctx.globalAlpha = Math.max(0, this.life * 0.85);
    ctx.stroke();
    ctx.restore();
  }
}

// 紙吹雪パーティクル
class Confetti {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 26;
    this.vy = (Math.random() - 1) * 24 - 6;
    this.color = color;
    this.size = Math.random() * 9 + 4;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 24;
    this.life = 1.0;
    this.decay = Math.random() * 0.011 + 0.005;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.52;
    this.vx *= 0.98;
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
    grad.addColorStop(0, this.color + '99');
    grad.addColorStop(1, this.color + '00');
    
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
    spotlights = [
      new Spotlight(width * 0.2, '#00f3ff'),
      new Spotlight(width * 0.8, '#ff00ea')
    ];
  },
  stopSpotlights() {
    spotlights = [];
  },
  // ピン弾き時の火花発生（画面座標指定）
  spawnSparks(screenX, screenY, power = 1.0) {
    const count = Math.min(18, Math.floor(6 + power * 14));
    const colors = ['#fcee0a', '#00f3ff', '#ff00ea', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      sparks.push(new Spark(screenX, screenY, c, power));
    }
  },
  triggerExplosion(isRed) {
    const mainColor = isRed ? '#ff003c' : '#00f3ff';
    const subColor = isRed ? '#ff00ea' : '#bd00ff';
    const sparkColor = '#fcee0a';

    // 二重衝撃波リング発生
    shockwaves.push(new Shockwave(width / 2, height / 2, mainColor));
    setTimeout(() => {
      shockwaves.push(new Shockwave(width / 2, height / 2, '#ffffff'));
    }, 120);

    for (let i = 0; i < 200; i++) {
      const rand = Math.random();
      let pColor = mainColor;
      if (rand > 0.7) pColor = subColor;
      else if (rand > 0.5) pColor = sparkColor;
      else if (rand > 0.35) pColor = '#ffffff';

      particles.push(new Confetti(width / 2, height / 2, pColor));
    }
    
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
    
    fxCtx.fillStyle = 'rgba(5, 5, 5, 0.25)';
    fxCtx.fillRect(0, 0, width, height);

    spotlights.forEach(s => {
      s.update();
      s.draw(fxCtx);
    });

    for (let i = shockwaves.length - 1; i >= 0; i--) {
      shockwaves[i].update();
      shockwaves[i].draw(fxCtx);
      if (shockwaves[i].life <= 0) shockwaves.splice(i, 1);
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].update();
      sparks[i].draw(fxCtx);
      if (sparks[i].life <= 0) sparks.splice(i, 1);
    }

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
