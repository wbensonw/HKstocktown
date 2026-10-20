import * as THREE from 'three';
import { basic, box, cyl, lambert, put, sphere } from './geom.js';

function lamp(scene, x, z) {
  put(scene, cyl(0.05, 0.07, 2.4, 8), lambert('#3c4046'), x, 1.2, z);
  put(scene, box(0.55, 0.06, 0.08), lambert('#3c4046'), x, 2.35, z);
  put(scene, sphere(0.14, 10, 8), basic('#ffe7b8'), x + 0.18, 2.22, z);
  const light = new THREE.PointLight(0xffe7b8, 0.45, 8, 2);
  light.position.set(x + 0.18, 2.15, z);
  scene.add(light);
}

function tree(scene, x, z, scale = 1) {
  put(scene, cyl(0.08 * scale, 0.12 * scale, 0.9 * scale, 8), lambert('#6b4630'), x, 0.45 * scale, z);
  put(scene, sphere(0.55 * scale, 12, 10), lambert('#2f7a45'), x, 1.15 * scale, z);
  put(scene, sphere(0.38 * scale, 10, 8), lambert('#3e9456'), x + 0.22 * scale, 1.35 * scale, z + 0.08);
}

function bench(scene, x, z, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  put(group, box(1.15, 0.08, 0.36), lambert('#c9844a'), 0, 0.42, 0);
  put(group, box(1.15, 0.28, 0.06), lambert('#a86a38'), 0, 0.62, -0.15);
  put(group, box(0.06, 0.4, 0.06), lambert('#5c4030'), -0.48, 0.22, 0.12);
  put(group, box(0.06, 0.4, 0.06), lambert('#5c4030'), 0.48, 0.22, 0.12);
  scene.add(group);
}

function shade(hex, factor) {
  const color = new THREE.Color(hex);
  color.multiplyScalar(factor);
  return `#${color.getHexString()}`;
}

function wheelAssembly() {
  const wheel = new THREE.Group();
  put(wheel, cyl(0.13, 0.13, 0.08, 14), lambert('#1c1c1c'), 0, 0, 0, [Math.PI / 2, 0, 0]);
  put(wheel, cyl(0.09, 0.09, 0.086, 12), lambert('#3a4046'), 0, 0, 0, [Math.PI / 2, 0, 0]);
  put(wheel, cyl(0.045, 0.045, 0.092, 8), lambert('#d5dbe2'), 0, 0, 0, [Math.PI / 2, 0, 0]);
  return wheel;
}

function taxiRoof() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0b429';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#3a2a10';
  ctx.font = '700 36px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('的士', 64, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), material);
  front.position.z = 0.018;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), material);
  back.rotation.y = Math.PI;
  back.position.z = -0.018;
  sign.add(front, back);
  put(sign, box(0.24, 0.12, 0.02), lambert('#e0a020'), 0, 0, 0);
  return sign;
}

function addWheels(car, points) {
  const wheels = points.map(([x, z]) => {
    const wheel = wheelAssembly();
    wheel.position.set(x, 0.13, z);
    car.add(wheel);
    return wheel;
  });
  car.userData.wheels = wheels;
}

function makeSedan(color, kind) {
  const car = new THREE.Group();
  const paint = lambert(color);
  const door = lambert(shade(color, 0.78));
  const glass = lambert('#b7d4e4');
  const trim = lambert('#2a2e33');
  const chrome = lambert('#c5ccd2');
  put(car, box(1.22, 0.05, 0.62), trim, 0, 0.18, 0);
  put(car, box(1.02, 0.05, 0.035), trim, 0.02, 0.24, 0.34);
  put(car, box(1.02, 0.05, 0.035), trim, 0.02, 0.24, -0.34);
  put(car, box(0.08, 0.1, 0.7), chrome, 0.66, 0.28, 0);
  put(car, box(0.07, 0.09, 0.64), trim, -0.64, 0.28, 0);
  put(car, box(0.4, 0.07, 0.62), paint, 0.36, 0.36, 0, null, true);
  put(car, box(0.3, 0.07, 0.62), paint, -0.4, 0.36, 0, null, true);
  put(car, box(0.56, 0.14, 0.62), paint, 0.02, 0.4, 0, null, true);
  put(car, box(0.42, 0.05, 0.54), paint, 0, 0.56, 0);
  put(car, box(0.035, 0.14, 0.48), glass, 0.26, 0.5, 0);
  put(car, box(0.03, 0.12, 0.44), glass, -0.22, 0.49, 0);
  put(car, box(0.2, 0.1, 0.025), glass, 0.02, 0.5, 0.3);
  put(car, box(0.2, 0.1, 0.025), glass, 0.02, 0.5, -0.3);
  put(car, box(0.26, 0.16, 0.025), door, 0.02, 0.36, 0.325);
  put(car, box(0.26, 0.16, 0.025), door, 0.02, 0.36, -0.325);
  put(car, box(0.05, 0.018, 0.016), trim, 0.08, 0.38, 0.342);
  put(car, box(0.05, 0.018, 0.016), trim, 0.08, 0.38, -0.342);
  [[0.4, 0.33], [0.4, -0.33], [-0.38, 0.33], [-0.38, -0.33]].forEach(([x, z]) => {
    put(car, box(0.24, 0.045, 0.05), door, x, 0.22, z);
  });
  [-0.08, 0, 0.08].forEach((z) => put(car, box(0.018, 0.05, 0.08), trim, 0.7, 0.34, z));
  put(car, box(0.03, 0.055, 0.1), basic('#fff6d0'), 0.7, 0.36, 0.2);
  put(car, box(0.03, 0.055, 0.1), basic('#fff6d0'), 0.7, 0.36, -0.2);
  put(car, box(0.02, 0.028, 0.05), basic('#ffb15a'), 0.7, 0.29, 0.28);
  put(car, box(0.02, 0.028, 0.05), basic('#ffb15a'), 0.7, 0.29, -0.28);
  put(car, box(0.025, 0.05, 0.1), basic('#ff3b3b'), -0.68, 0.36, 0.2);
  put(car, box(0.025, 0.05, 0.1), basic('#ff3b3b'), -0.68, 0.36, -0.2);
  put(car, box(0.05, 0.035, 0.07), paint, 0.18, 0.5, 0.36);
  put(car, box(0.05, 0.035, 0.07), paint, 0.18, 0.5, -0.36);
  put(car, box(0.015, 0.05, 0.12), lambert('#f4efe4'), 0.705, 0.25, 0);
  addWheels(car, [[0.4, 0.36], [0.4, -0.36], [-0.38, 0.36], [-0.38, -0.36]]);
  if (kind === 'taxi') {
    const sign = taxiRoof();
    sign.position.set(0, 0.68, 0);
    car.add(sign);
  }
  return car;
}

function makeVan(color) {
  const car = new THREE.Group();
  const paint = lambert(color);
  const door = lambert(shade(color, 0.78));
  const glass = lambert('#b7d4e4');
  const trim = lambert('#2a2e33');
  put(car, box(1.32, 0.05, 0.66), trim, 0, 0.18, 0);
  put(car, box(1.15, 0.05, 0.035), trim, -0.02, 0.26, 0.36);
  put(car, box(1.15, 0.05, 0.035), trim, -0.02, 0.26, -0.36);
  put(car, box(0.07, 0.12, 0.7), trim, 0.68, 0.32, 0);
  put(car, box(0.07, 0.12, 0.66), trim, -0.68, 0.32, 0);
  put(car, box(1.2, 0.22, 0.66), paint, -0.02, 0.38, 0, null, true);
  put(car, box(1.05, 0.22, 0.62), paint, -0.04, 0.58, 0, null, true);
  put(car, box(1.12, 0.045, 0.68), paint, -0.02, 0.72, 0);
  put(car, box(0.03, 0.16, 0.52), glass, 0.5, 0.58, 0);
  put(car, box(0.03, 0.14, 0.46), glass, -0.54, 0.56, 0);
  [-0.22, 0.08, 0.34].forEach((x) => {
    put(car, box(0.16, 0.1, 0.025), glass, x, 0.58, 0.325);
    put(car, box(0.16, 0.1, 0.025), glass, x, 0.58, -0.325);
  });
  put(car, box(0.34, 0.2, 0.025), door, 0.02, 0.4, 0.34);
  put(car, box(0.34, 0.2, 0.025), door, 0.02, 0.4, -0.34);
  put(car, box(0.08, 0.012, 0.02), trim, 0.08, 0.42, 0.356);
  put(car, box(1.05, 0.012, 0.02), trim, -0.02, 0.5, 0.345);
  [[0.42, 0.35], [0.42, -0.35], [-0.46, 0.35], [-0.46, -0.35]].forEach(([x, z]) => {
    put(car, box(0.22, 0.04, 0.05), door, x, 0.22, z);
  });
  [-0.08, 0, 0.08].forEach((z) => put(car, box(0.016, 0.05, 0.07), trim, 0.72, 0.4, z));
  put(car, box(0.025, 0.06, 0.1), basic('#fff6d0'), 0.72, 0.42, 0.2);
  put(car, box(0.025, 0.06, 0.1), basic('#fff6d0'), 0.72, 0.42, -0.2);
  put(car, box(0.02, 0.05, 0.1), basic('#ff3b3b'), -0.72, 0.4, 0.2);
  put(car, box(0.02, 0.05, 0.1), basic('#ff3b3b'), -0.72, 0.4, -0.2);
  put(car, box(0.05, 0.04, 0.08), paint, 0.28, 0.62, 0.38);
  put(car, box(0.05, 0.04, 0.08), paint, 0.28, 0.62, -0.38);
  put(car, box(0.015, 0.05, 0.14), lambert('#f4efe4'), 0.725, 0.28, 0);
  addWheels(car, [[0.42, 0.38], [0.42, -0.38], [-0.46, 0.38], [-0.46, -0.38]]);
  return car;
}

function makeCar(color, kind) {
  return kind === 'van' ? makeVan(color) : makeSedan(color, kind);
}

function addShoreHaze(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const fade = ctx.createLinearGradient(0, 0, 0, 64);
  fade.addColorStop(0, 'rgba(226, 214, 190, 0)');
  fade.addColorStop(0.4, 'rgba(210, 194, 168, 0.2)');
  fade.addColorStop(1, 'rgba(186, 164, 136, 0.78)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 4, 64);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const band = 1.6;
  const overlap = 0.28;
  const centerX = 2;
  const centerZ = 4;
  const halfX = 25;
  const halfZ = 19;
  [
    { w: 50 + band * 2, h: band, x: centerX, z: centerZ - halfZ - band / 2 + overlap, yaw: 0 },
    { w: 50 + band * 2, h: band, x: centerX, z: centerZ + halfZ + band / 2 - overlap, yaw: Math.PI },
    { w: 38 + band * 2, h: band, x: centerX + halfX + band / 2 - overlap, z: centerZ, yaw: Math.PI / 2 },
    { w: 38 + band * 2, h: band, x: centerX - halfX - band / 2 + overlap, z: centerZ, yaw: -Math.PI / 2 },
  ].forEach((strip) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(strip.w, strip.h), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.y = strip.yaw;
    mesh.position.set(strip.x, -0.03, strip.z);
    mesh.renderOrder = 2;
    scene.add(mesh);
  });
}

export function createBlock(scene) {
  const asphalt = lambert('#2c333c');
  const paint = lambert('#e7e1d4');
  const pavement = lambert('#c8c2b6');
  const curb = lambert('#8e8880');

  put(scene, box(50, 0.24, 38), lambert('#a89074'), 2, -0.2, 4);
  addShoreHaze(scene);
  const roadX = 2;
  const roadLen = 50;
  put(scene, box(roadLen, 0.08, 5.4), asphalt, roadX, -0.04, 12.6, null, true);
  put(scene, box(roadLen - 1, 0.02, 0.1), paint, roadX, 0.02, 10.05);
  put(scene, box(roadLen - 1, 0.02, 0.1), paint, roadX, 0.02, 15.15);
  for (let x = -22; x <= 26; x += 2.5) {
    put(scene, box(1.15, 0.025, 0.1), paint, x, 0.025, 12.6);
  }
  for (let index = 0; index < 9; index += 1) {
    put(scene, box(4.4, 0.04, 0.3), lambert('#f7f4ee'), 0, 0.05, 10.4 + index * 0.56);
  }
  put(scene, box(roadLen, 0.12, 2.5), pavement, roadX, 0.0, 8.55, null, true);
  put(scene, box(2.4, 0.12, 18), pavement, -10.4, 0.0, 0.2, null, true);
  put(scene, box(2.6, 0.12, 16), pavement, 10.8, 0.0, 1.2, null, true);
  put(scene, box(roadLen, 0.14, 0.2), curb, roadX, 0.05, 9.7);
  put(scene, box(roadLen, 0.14, 0.2), curb, roadX, 0.05, 15.5);
  put(scene, box(roadLen, 0.12, 2.2), pavement, roadX, 0.0, 16.85, null, true);

  lamp(scene, -10.3, 8.85);
  lamp(scene, 8.4, 9.15);
  lamp(scene, -8.2, -5.6);
  lamp(scene, 8.6, -5.4);
  bench(scene, 5.6, 8.15, 0);

  tree(scene, -6.4, 18.7, 1.05);
  tree(scene, 5.8, 19.0, 1.15);
  bench(scene, -3.2, 18.6, 0.2);
  bench(scene, 2.4, 18.8, -0.2);
  lamp(scene, -8.8, 18.5);
  lamp(scene, 8.6, 18.9);

  const park = new THREE.Group();
  park.position.set(17.6, 0, -0.45);
  put(park, box(10.4, 0.08, 14.8), lambert('#2d6b45'), 0, 0.02, 0, null, true);
  put(park, box(1.2, 0.04, 13), pavement, -2.2, 0.08, 0);
  put(park, box(7.2, 0.04, 1.1), pavement, 0.8, 0.08, -1.2);
  scene.add(park);
  tree(scene, 13.8, -4.6, 1.05);
  tree(scene, 14.8, 5.8, 1.25);
  tree(scene, 19.4, -6.3, 1.1);
  tree(scene, 21.6, -1.4, 1.15);
  tree(scene, 22.0, 5.7, 0.95);
  bench(scene, 15.4, -2.2, 0.15);
  bench(scene, 19.6, 1.2, -0.25);
  bench(scene, 17.2, 5.5, 1.15);
  lamp(scene, 13.6, 2.4);
  lamp(scene, 22.2, -3.2);

  const colors = ['#d4543c', '#e0a04a', '#3d6ea8', '#f2f4f6', '#3e8f6a', '#8a4d62', '#d7c4a3', '#6a4a34'];
  const cars = colors.map((color, index) => {
    const dir = index % 2 === 0 ? 1 : -1;
    const kind = index === 0 ? 'taxi' : index === 4 ? 'van' : 'sedan';
    const spec = {
      lane: dir > 0 ? 11.5 : 13.85,
      dir,
      x: -16 + index * 4.2,
      color,
    };
    const mesh = makeCar(spec.color, kind);
    mesh.position.set(spec.x, 0, spec.lane);
    mesh.rotation.y = spec.dir > 0 ? 0 : Math.PI;
    scene.add(mesh);
    return { mesh, ...spec };
  });

  return {
    update(dt, visibleCount = cars.length) {
      const shown = Math.max(0, Math.min(cars.length, visibleCount));
      const spin = dt * 2.4 / 0.13;
      cars.forEach((car, index) => {
        car.mesh.visible = index < shown;
        if (!car.mesh.visible) return;
        car.x += car.dir * dt * 2.4;
        if (car.x > 25.2) car.x = -21.2;
        if (car.x < -21.2) car.x = 25.2;
        car.mesh.position.x = car.x;
        car.mesh.userData.wheels?.forEach((wheel) => {
          wheel.rotation.z -= spin;
        });
      });
    },
  };
}
