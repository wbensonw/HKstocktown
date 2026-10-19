import * as THREE from 'three';
import { basic, box, cone, cyl, lambert, put, sphere, torus } from './geom.js';

let bambooMat = null;

function bambooMaterial() {
  if (bambooMat) return bambooMat;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#efd7ad';
  ctx.fillRect(0, 0, 128, 64);
  for (let x = 0; x < 128; x += 8) {
    ctx.strokeStyle = x % 16 === 0 ? '#b8894e' : '#f6e6c4';
    ctx.lineWidth = x % 16 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 64);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(120, 72, 32, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(128, 32);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  bambooMat = new THREE.MeshLambertMaterial({ map: texture });
  return bambooMat;
}

function penguin(group) {
  put(group, sphere(0.2, 18, 14), lambert('#f7f4ef'), 0, 0.2, 0);
  put(group, sphere(0.12, 14, 12), lambert('#f2d7c4'), 0, 0.18, 0.08);
  put(group, sphere(0.11, 14, 12), lambert('#1c1c1c'), 0, 0.36, 0.02);
  put(group, sphere(0.025, 8, 8), lambert('#fff'), -0.035, 0.39, 0.08);
  put(group, sphere(0.025, 8, 8), lambert('#fff'), 0.035, 0.39, 0.08);
  put(group, cone(0.045, 0.08, 8), lambert('#ff8a2a'), 0, 0.34, 0.12, [Math.PI / 2, 0, 0]);
  put(group, box(0.16, 0.045, 0.1), lambert('#d23a3a'), 0, 0.24, 0.02);
  const leftWing = put(group, sphere(0.07, 10, 8), lambert('#f4f1ea'), -0.18, 0.2, 0);
  leftWing.scale.set(0.45, 1, 0.7);
  const rightWing = put(group, sphere(0.07, 10, 8), lambert('#f4f1ea'), 0.18, 0.2, 0);
  rightWing.scale.set(0.45, 1, 0.7);
  put(group, box(0.05, 0.03, 0.07), lambert('#ffb15a'), -0.05, 0.02, 0.04);
  put(group, box(0.05, 0.03, 0.07), lambert('#ffb15a'), 0.05, 0.02, 0.04);
}

function siuMai(group) {
  put(group, cyl(0.18, 0.13, 0.26, 16), lambert('#f08a1f'), 0, 0.13, 0);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    put(group, box(0.03, 0.12, 0.015), lambert('#ffd089'), Math.cos(angle) * 0.15, 0.2, Math.sin(angle) * 0.15);
  }
  put(group, sphere(0.04, 8, 8), lambert('#ffe08a'), -0.05, 0.26, 0.03);
  put(group, sphere(0.035, 8, 8), lambert('#ffe08a'), 0.05, 0.27, 0.01);
  put(group, sphere(0.03, 8, 8), lambert('#fff4c8'), 0, 0.28, -0.03);
}

function ears(group) {
  put(group, sphere(0.18, 16, 12), lambert('#ffd23a'), 0, 0.18, 0);
  put(group, sphere(0.08, 12, 10), lambert('#ffbf12'), -0.1, 0.34, 0);
  put(group, sphere(0.08, 12, 10), lambert('#ffbf12'), 0.1, 0.34, 0);
  put(group, sphere(0.02, 8, 8), lambert('#3a2a16'), -0.045, 0.2, 0.14);
  put(group, sphere(0.02, 8, 8), lambert('#3a2a16'), 0.045, 0.2, 0.14);
  put(group, box(0.04, 0.015, 0.02), lambert('#c47a3a'), 0, 0.16, 0.16);
}

function lion(group) {
  put(group, sphere(0.18, 16, 12), lambert('#e7b84a'), 0, 0.18, 0);
  put(group, torus(0.15, 0.05, 8, 18), lambert('#c89022'), 0, 0.22, 0, [Math.PI / 2, 0, 0]);
  put(group, sphere(0.03, 8, 8), lambert('#3a2a16'), -0.05, 0.24, 0.14);
  put(group, sphere(0.03, 8, 8), lambert('#3a2a16'), 0.05, 0.24, 0.14);
  put(group, cone(0.05, 0.1, 8), lambert('#f0cf74'), -0.1, 0.36, 0);
  put(group, cone(0.05, 0.1, 8), lambert('#f0cf74'), 0.1, 0.36, 0);
  put(group, box(0.06, 0.03, 0.04), lambert('#f2d48a'), 0, 0.16, 0.16);
}

function harGow(group) {
  const body = put(group, sphere(0.18, 18, 14), lambert('#f6c9c4'), 0, 0.12, 0);
  body.scale.set(1.45, 0.62, 1.05);
  const shrimp = put(group, sphere(0.08, 12, 10), lambert('#ee8d97'), 0.02, 0.14, 0.05);
  shrimp.scale.set(1.4, 0.55, 0.7);
  put(group, box(0.1, 0.02, 0.07), lambert('#f2d36b'), 0.06, 0.2, 0.02);
}

function car(group) {
  put(group, box(0.4, 0.11, 0.18), lambert('#d7e36a'), 0, 0.12, 0);
  put(group, box(0.18, 0.09, 0.15), lambert('#eef6c8'), -0.02, 0.21, 0);
  put(group, box(0.07, 0.04, 0.01), lambert('#9fd0ea'), -0.02, 0.22, 0.076);
  [-0.12, 0.12].forEach((x) => {
    [-0.08, 0.08].forEach((z) => {
      put(group, cyl(0.05, 0.05, 0.04, 12), lambert('#222'), x, 0.05, z, [Math.PI / 2, 0, 0]);
    });
  });
}

function square(group) {
  put(group, box(0.28, 0.18, 0.28), lambert('#ff7a18'), 0, 0.09, 0);
  put(group, box(0.1, 0.035, 0.1), lambert('#fff7ea'), 0, 0.19, 0);
  put(group, box(0.22, 0.02, 0.02), lambert('#ffe1b8'), 0, 0.1, 0.145);
}

function peach(group) {
  put(group, sphere(0.16, 16, 12), lambert('#ff9eb5'), -0.04, 0.16, 0);
  put(group, sphere(0.16, 16, 12), lambert('#ffb3c4'), 0.05, 0.16, 0.02);
  put(group, cone(0.06, 0.12, 8), lambert('#3e9a4a'), 0.02, 0.32, 0, [0.2, 0, 0.4]);
  put(group, box(0.08, 0.02, 0.05), lambert('#2f7a3a'), 0.06, 0.3, 0.02, [0, 0.4, 0.6]);
}

function tower(group) {
  put(group, box(0.3, 0.07, 0.3), lambert('#f4e2b0'), 0, 0.035, 0);
  put(group, box(0.22, 0.07, 0.22), lambert('#e7c98a'), 0, 0.1, 0);
  put(group, box(0.15, 0.07, 0.15), lambert('#f7edd2'), 0, 0.17, 0);
  put(group, cyl(0.02, 0.02, 0.18, 8), lambert('#d7dde6'), 0, 0.28, 0);
  put(group, sphere(0.035, 8, 8), basic('#d7ecff'), 0, 0.39, 0);
  put(group, box(0.08, 0.015, 0.015), lambert('#9eb4c8'), 0, 0.34, 0);
}

function coin(group) {
  put(group, cyl(0.18, 0.18, 0.07, 22), lambert('#c9844a'), 0, 0.045, 0);
  put(group, torus(0.1, 0.025, 8, 18), lambert('#8a5428'), 0, 0.09, 0, [Math.PI / 2, 0, 0]);
  put(group, cyl(0.04, 0.04, 0.08, 12), lambert('#a32020'), 0, 0.09, 0);
  put(group, box(0.16, 0.015, 0.015), lambert('#f0d7a4'), 0, 0.09, 0, [Math.PI / 2, 0, 0.4]);
}

function oil(group) {
  put(group, sphere(0.17, 16, 12), lambert('#1b1d22'), 0, 0.17, 0);
  put(group, torus(0.12, 0.035, 8, 16), lambert('#e6c15a'), 0, 0.22, 0, [Math.PI / 2.4, 0, 0]);
  put(group, box(0.045, 0.16, 0.045), lambert('#6d6258'), 0.12, 0.2, 0);
  put(group, box(0.12, 0.035, 0.045), lambert('#8d8074'), 0.14, 0.28, 0);
  put(group, sphere(0.03, 8, 8), lambert('#e6c15a'), 0, 0.3, 0.08);
}

function mochi(group) {
  put(group, sphere(0.11, 14, 10), lambert('#ff7aa2'), -0.08, 0.11, 0);
  put(group, sphere(0.11, 14, 10), lambert('#7ddec8'), 0.08, 0.11, 0.02);
  put(group, sphere(0.1, 14, 10), lambert('#ffe07a'), 0, 0.2, -0.02);
  put(group, sphere(0.045, 8, 8), lambert('#fff'), 0.02, 0.24, 0.04);
}

const builders = { penguin, siuMai, ears, lion, harGow, car, square, peach, tower, coin, oil, mochi };

export function createDimsum(kind) {
  const group = new THREE.Group();
  (builders[kind] ?? mochi)(group);
  group.scale.setScalar(1.28);
  return group;
}

export function createSteamer() {
  const group = new THREE.Group();
  const skin = bambooMaterial();
  const band = lambert('#c49a62');
  const lidMat = lambert('#d7b483');
  const y = 0.16;
  put(group, cyl(0.5, 0.52, 0.28, 24), skin, 0, y, 0, null, true);
  put(group, cyl(0.56, 0.56, 0.04, 24), band, 0, y + 0.13, 0);
  put(group, cyl(0.56, 0.56, 0.03, 24), lambert('#a67c45'), 0, y - 0.13, 0);
  const top = 0.34;
  put(group, cyl(0.53, 0.53, 0.07, 24), lidMat, 0, top, 0);
  put(group, sphere(0.06, 12, 8), lambert('#f6e7c8'), 0, top + 0.08, 0);
  put(group, box(0.12, 0.06, 0.18), band, 0.58, top - 0.02, 0);
  put(group, box(0.12, 0.06, 0.18), band, -0.58, top - 0.02, 0);
  group.userData.top = top + 0.12;
  return group;
}
