/**
 * EarthDrive Radar & Mini-Map HUD
 * High-performance 2D Canvas tactical radar displaying:
 * - Dynamic road topology around player
 * - Player vehicle position & heading cone
 * - North pointer compass
 * - Nearby traffic blips
 */

class MiniMap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.scale = 0.35; // Meters to pixels
    this.radarRadius = this.canvas.width / 2;
  }

  update(playerPos, heading, roads, traffic) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Save state for circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, this.radarRadius - 2, 0, Math.PI * 2);
    ctx.clip();

    // Dark glassmorphic background
    ctx.fillStyle = 'rgba(12, 17, 26, 0.82)';
    ctx.fillRect(0, 0, w, h);

    // Concentric range circles
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.12)';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // Transform coordinate system so player is at center, facing upwards
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-heading);

    // Draw Roads
    ctx.lineCap = 'round';
    if (roads && roads.length) {
      roads.forEach(road => {
        const x1 = (road.x1 - playerPos.x) * this.scale;
        const z1 = (road.z1 - playerPos.z) * this.scale;
        const x2 = (road.x2 - playerPos.x) * this.scale;
        const z2 = (road.z2 - playerPos.z) * this.scale;

        // Asphalt body
        ctx.strokeStyle = 'rgba(180, 205, 230, 0.35)';
        ctx.lineWidth = Math.max(3, road.width * this.scale);
        ctx.beginPath();
        ctx.moveTo(x1, z1);
        ctx.lineTo(x2, z2);
        ctx.stroke();

        // Centerline
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, z1);
        ctx.lineTo(x2, z2);
        ctx.stroke();
      });
    }

    // Draw Civilian Traffic blips
    if (traffic && traffic.length) {
      ctx.fillStyle = '#ffcc00';
      traffic.forEach(car => {
        const p = car.group.position;
        const tx = (p.x - playerPos.x) * this.scale;
        const tz = (p.z - playerPos.z) * this.scale;
        if (Math.hypot(tx, tz) < this.radarRadius) {
          ctx.beginPath();
          ctx.arc(tx, tz, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.restore();

    // Player vehicle indicator (always centered and facing up)
    ctx.fillStyle = '#00d2ff';
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx - 6, cy + 7);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 6, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore(); // restore clipping

    // Outer cyber border ring
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, this.radarRadius - 2, 0, Math.PI * 2);
    ctx.stroke();

    // North Compass indicator on the rim
    const northAngle = -heading - Math.PI / 2;
    const nx = cx + Math.cos(northAngle) * (this.radarRadius - 10);
    const ny = cy + Math.sin(northAngle) * (this.radarRadius - 10);

    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);
  }
}

window.MiniMap = MiniMap;
