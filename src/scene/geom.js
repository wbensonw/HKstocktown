import * as THREE from 'three';

const geos = new Map();
const mats = new Map();

export function geo(key, create) {
  if (!geos.has(key)) geos.set(key, create());
  return geos.get(key);
}

export function lambert(color) {
  const key = `l:${color}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color }));
  return mats.get(key);
}

export function basic(color) {
  const key = `b:${color}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color }));
  return mats.get(key);
}

export function box(w, h, d) {
  return geo(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}

export function sphere(r, w = 16, h = 12) {
  return geo(`sp:${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
}

export function cyl(rt, rb, h, s = 18) {
  return geo(`cy:${rt}:${rb}:${h}:${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
}

export function cone(r, h, s = 12) {
  return geo(`co:${r}:${h}:${s}`, () => new THREE.ConeGeometry(r, h, s));
}

export function torus(r, t, rs = 8, ts = 18) {
  return geo(`to:${r}:${t}:${rs}:${ts}`, () => new THREE.TorusGeometry(r, t, rs, ts));
}

export function put(group, geometry, material, x = 0, y = 0, z = 0, rot = null, shadow = false) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  group.add(mesh);
  return mesh;
}

export function plankTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  for (let row = 0; row < 8; row += 1) {
    ctx.fillStyle = row % 2 ? '#7a4c2e' : '#94623f';
    ctx.fillRect(0, row * 32, 256, 32);
    ctx.fillStyle = 'rgba(40, 18, 8, 0.28)';
    ctx.fillRect(0, row * 32 + 30, 256, 2);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.05)';
    ctx.fillRect(18 + (row % 3) * 30, row * 32 + 6, 70, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function windowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#17202e';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 16) {
      const lit = ((x * 13 + y * 7) % 10) > 3;
      ctx.fillStyle = lit ? ((x + y) % 20 > 10 ? '#ffd589' : '#fff1cc') : '#101720';
      ctx.fillRect(x, y, 8, 11);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
