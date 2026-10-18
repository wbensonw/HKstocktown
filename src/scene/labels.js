import * as THREE from 'three';
import { formatPct, formatPrice, tone } from '../services/format.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createBoard(pixelW, pixelH, worldW, worldH) {
  const canvas = document.createElement('canvas');
  canvas.width = pixelW;
  canvas.height = pixelH;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const root = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), material);
  face.position.z = 0.028;
  root.add(face);
  const wood = new THREE.MeshLambertMaterial({ color: '#6b4228' });
  const gold = new THREE.MeshBasicMaterial({ color: '#e6c56a' });
  const depth = 0.035;
  const lip = 0.045;
  const rails = [
    [worldW + lip, lip, depth, 0, worldH / 2],
    [worldW + lip, lip, depth, 0, -worldH / 2],
    [lip, worldH + lip, depth, worldW / 2, 0],
    [lip, worldH + lip, depth, -worldW / 2, 0],
  ];
  rails.forEach(([w, h, d, x, y]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    bar.position.set(x, y, 0);
    root.add(bar);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.28, 0.012), gold);
    edge.position.set(x, y, 0.006);
    root.add(edge);
  });
  return {
    mesh: root,
    key: '',
    redraw(key, draw) {
      if (this.key === key) return;
      this.key = key;
      ctx.clearRect(0, 0, pixelW, pixelH);
      draw(ctx, pixelW, pixelH);
      texture.needsUpdate = true;
    },
  };
}

function framedPanel(ctx, w, h, fill, outer, inner, radius) {
  roundRect(ctx, 10, 10, w - 20, h - 20, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = outer;
  ctx.lineWidth = 8;
  ctx.stroke();
  roundRect(ctx, 22, 22, w - 44, h - 44, Math.max(8, radius - 8));
  ctx.strokeStyle = inner;
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawPrice(ctx, w, h, stock, colors) {
  framedPanel(ctx, w, h, 'rgba(16, 11, 9, 0.92)', colors.gold, '#f3e2b0', 26);
  ctx.fillStyle = colors.gold;
  ctx.font = '700 40px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${stock.symbol}  ${stock.short}`, w / 2, 86);
  ctx.fillStyle = '#fff8ee';
  ctx.font = '700 72px "Segoe UI", sans-serif';
  ctx.fillText(formatPrice(stock.price), w / 2, 168);
  const mood = tone(stock.changePercent);
  ctx.fillStyle = colors[mood];
  ctx.font = '700 36px "Segoe UI", sans-serif';
  const arrow = mood === 'up' ? '▲' : mood === 'down' ? '▼' : '–';
  const change = Number.isFinite(stock.change) ? `${stock.change > 0 ? '+' : ''}${formatPrice(stock.change)}` : '—';
  ctx.fillText(`${arrow} ${change}   ${formatPct(stock.changePercent)}`, w / 2, 248);
}

export function drawNeon(ctx, w, h, index, colors) {
  const mood = tone(index.changePercent);
  framedPanel(ctx, w, h, '#140c10', colors[mood], '#ffe7a8', 32);
  ctx.fillStyle = '#ffe7a8';
  ctx.font = '700 50px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('恆指大茶樓', w / 2, 108);
  ctx.fillStyle = '#fffaf2';
  ctx.font = '700 108px "Segoe UI", sans-serif';
  ctx.fillText(formatPrice(index.price, true), w / 2, 246);
  ctx.fillStyle = colors[mood];
  ctx.font = '700 58px "Microsoft JhengHei", sans-serif';
  const arrow = mood === 'up' ? '▲' : mood === 'down' ? '▼' : '–';
  const change = index.change > 0 ? `+${index.change.toFixed(0)}` : index.change.toFixed(0);
  ctx.fillText(`${arrow} ${change}   ${formatPct(index.changePercent)}`, w / 2, 332);
}

export function drawSession(ctx, w, h, notice) {
  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 8, 8, w - 16, h - 16, 22);
  ctx.fillStyle = '#cbb396';
  ctx.fill();
  roundRect(ctx, 8, 8, w - 16, 108, 22);
  ctx.fillStyle = '#8d2e2e';
  ctx.fill();
  ctx.fillRect(8, 70, w - 16, 46);
  ctx.fillStyle = '#fff6e4';
  ctx.textAlign = 'center';
  ctx.font = '700 48px "Microsoft JhengHei", sans-serif';
  ctx.fillText(notice.title || '', w / 2, 74);
  ctx.fillStyle = '#2a1810';
  ctx.font = '700 56px "Microsoft JhengHei", sans-serif';
  ctx.fillText(notice.label || '', w / 2, 188);
  ctx.fillStyle = '#1a120e';
  ctx.font = '700 68px "Segoe UI", "Microsoft JhengHei", sans-serif';
  ctx.fillText(notice.value || '', w / 2, 268);
}

export function drawNote(ctx, w, h, lines, accent = '#e7c27a') {
  framedPanel(ctx, w, h, '#24160f', accent, '#f3e2b0', 18);
  ctx.fillStyle = '#fff6e8';
  ctx.textAlign = 'center';
  ctx.font = '700 40px "Microsoft JhengHei", sans-serif';
  lines.forEach((line, index) => {
    if (index === lines.length - 1 && lines.length > 1) ctx.fillStyle = accent;
    ctx.fillText(line, w / 2, h * 0.42 + index * 52);
  });
}
