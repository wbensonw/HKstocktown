import * as THREE from 'three';
import { basic, box, cyl, lambert, put, sphere } from './geom.js';
import { createBoard, roundRect, sharpCanvasTexture } from './labels.js';
import { createPerson, eatPerson, queueIdle, washPerson } from './people.js';

function drawAlleySign(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#4f6d5c';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6d8b78';
  ctx.fillRect(36, 28, w * 0.46, h * 0.38);
  ctx.fillStyle = 'rgba(34, 42, 36, 0.35)';
  for (let index = 0; index < 8; index += 1) {
    ctx.fillRect(48 + index * 88, 16, 5, 26 + (index % 3) * 22);
  }
  const rust = ['#8a4b2a', '#6e3a22', '#a15a32'];
  [[54, 40, 26], [w - 80, 36, 22], [w * 0.48, h - 46, 18], [150, h * 0.62, 14], [w - 160, h * 0.42, 20]].forEach(([x, y, r], index) => {
    ctx.fillStyle = rust[index % rust.length];
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, 0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(236, 226, 198, 0.38)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 90);
  ctx.lineTo(w - 40, 140);
  ctx.moveTo(70, h - 36);
  ctx.lineTo(w - 90, 70);
  ctx.stroke();
  ctx.fillStyle = '#f4ecdc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 92px "Microsoft JhengHei", sans-serif';
  ctx.fillText('後巷洗大餅', w / 2 + 8, h * 0.54);
  ctx.globalCompositeOperation = 'destination-out';
  [[168, 78, 18, 12], [390, 96, 26, 10], [250, 150, 14, 16], [520, 128, 20, 11], [120, 118, 12, 14], [610, 150, 16, 9]].forEach(([x, y, rw, rh]) => {
    ctx.fillRect(x, y, rw, rh);
  });
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3c342e';
  [[28, 24], [w - 28, 24], [28, h - 24], [w - 28, h - 24]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.strokeStyle = '#3a463c';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
}

function makeTinSign() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 332;
  drawAlleySign(canvas.getContext('2d'), 768, 332);
  const material = new THREE.MeshBasicMaterial({
    map: sharpCanvasTexture(canvas),
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const group = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.25), material);
  face.position.z = 0.03;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.25), material);
  back.rotation.y = Math.PI;
  back.position.z = -0.03;
  group.add(face, back);
  const rust = lambert('#6a4634');
  put(group, box(3.05, 0.07, 0.05), rust, 0, 0.66, 0);
  put(group, box(3.05, 0.07, 0.05), rust, 0, -0.66, 0);
  put(group, box(0.07, 1.34, 0.05), rust, 1.5, 0, 0);
  put(group, box(0.07, 1.34, 0.05), rust, -1.5, 0, 0);
  return group;
}

function sinkSplashes(parent, x, z) {
  const count = 16;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#d7f2f8',
    size: 0.04,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }));
  points.position.set(x, 0.9, z);
  parent.add(points);
  return {
    positions,
    geometry,
    seeds: Array.from({ length: count }, () => Math.random()),
    spread: Array.from({ length: count }, () => [(Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.28]),
  };
}

export function createAlley() {
  const root = new THREE.Group();
  root.position.set(-15.2, 0, -4.2);
  const wet = new THREE.MeshLambertMaterial({
    color: '#343a34',
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 8), wet);
  floor.position.set(0.6, 0.09, 0);
  floor.receiveShadow = true;
  root.add(floor);
  [[-1.1, 0.2], [0.8, -1.1], [0.2, 1.8], [-0.6, 2.6]].forEach(([x, z]) => {
    put(root, box(0.6, 0.02, 0.38), lambert('#2a312c'), x, 0.13, z);
  });
  put(root, box(0.16, 2.35, 7.6), lambert('#6e5a48'), -2.25, 1.22, 0, null, true);
  for (let row = 0; row < 6; row += 1) {
    put(root, box(0.04, 0.28, 1.2), lambert(row % 2 ? '#d5ddd8' : '#e7eeea'), -2.12, 0.48 + row * 0.3, 0.5);
  }
  put(root, box(5.2, 0.62, 0.72), lambert('#8d9498'), 0.5, 0.5, -3.15, null, true);
  put(root, box(5, 0.06, 0.52), lambert('#d5dbde'), 0.5, 0.84, -3.15);
  put(root, cyl(0.04, 0.04, 0.5, 8), lambert('#d5e7ea'), 1.75, 0.78, -2.95);
  put(root, cyl(0.035, 0.02, 0.32, 8), lambert('#9fd8ea'), 1.75, 0.4, -2.7);
  put(root, box(4.5, 0.55, 0.62), lambert('#8d9498'), 0.3, 0.46, 2.2, null, true);
  put(root, box(4.3, 0.05, 0.46), lambert('#d5dbde'), 0.3, 0.76, 2.2);
  put(root, box(1.15, 0.9, 0.32), lambert('#b7c0c4'), 2.05, 0.7, -0.8);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    put(root, box(1.05, 0.04, 0.3), lambert('#d7dee2'), 2.05, 1.15 + shelf * 0.28, -0.8);
  }
  for (let level = 0; level < 4; level += 1) {
    put(root, cyl(0.16, 0.14, 0.05, 12), lambert(level % 2 ? '#f4f7f8' : '#d5e1e4'), 2.05, 1.2 + level * 0.06, -0.8);
  }
  put(root, box(0.9, 1.35, 0.08), lambert('#d7c4a2'), -2.55, 1.55, 1.2);

  const hanger = new THREE.Group();
  hanger.position.set(0.8, 0, -3.85);
  [-1.45, 1.45].forEach((x) => {
    put(hanger, box(0.07, 1.7, 0.07), lambert('#5c4638'), x, 1.15, -0.06);
  });
  const sign = makeTinSign();
  sign.position.set(0, 1.85, 0);
  hanger.add(sign);
  root.add(hanger);

  const people = Array.from({ length: 12 }, (_, index) => {
    const person = createPerson(index, '#6e8cab');
    person.visible = false;
    root.add(person);
    return person;
  });
  const bowls = Array.from({ length: 12 }, (_, index) => {
    const stack = new THREE.Group();
    const height = 3 + (index % 3);
    for (let level = 0; level < height; level += 1) {
      put(stack, cyl(0.14, 0.12, 0.045, 12), lambert(level % 2 ? '#f7fbfc' : '#d7e3e6'), 0, 0.08 + level * 0.05, 0);
    }
    stack.position.set(-1.55 + (index % 6) * 0.62, 0, -0.55 + Math.floor(index / 6) * 0.9);
    stack.visible = false;
    root.add(stack);
    return stack;
  });
  const splashes = [sinkSplashes(root, 0.5, -3.15), sinkSplashes(root, 0.3, 2.2)];

  return {
    root,
    setCounts(peopleCount, bowlCount) {
      const time = performance.now() / 1000;
      people.forEach((person, index) => {
        person.visible = index < peopleCount;
        if (!person.visible) return;
        const col = index % 6;
        const back = index < 6;
        person.position.set(-1.35 + col * 0.78, 0, back ? -2.45 : 1.55);
        person.rotation.y = back ? Math.PI : 0;
        washPerson(person, time, index);
      });
      bowls.forEach((stack, index) => {
        stack.visible = index < bowlCount;
      });
      splashes.forEach((splash) => {
        splash.seeds.forEach((seed, index) => {
          const next = peopleCount > 0 ? (seed + 0.012 + (index % 3) * 0.004) % 1 : seed;
          splash.seeds[index] = next;
          const [x, z] = splash.spread[index];
          splash.positions[index * 3] = x;
          splash.positions[index * 3 + 1] = peopleCount > 0 ? next * 0.45 : -4;
          splash.positions[index * 3 + 2] = z;
        });
        splash.geometry.attributes.position.needsUpdate = true;
      });
    },
  };
}

function drawCafeSign(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 18, 16, w - 36, h - 32, 46);
  ctx.fillStyle = '#f5b400';
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#e08a00';
  ctx.stroke();
  ctx.fillStyle = '#3a2a10';
  ctx.textAlign = 'center';
  ctx.font = '700 86px "Microsoft JhengHei", sans-serif';
  ctx.fillText('大家樂', w / 2, h * 0.58);
  ctx.font = '600 26px "Segoe UI", sans-serif';
  ctx.fillText('CAFE DE CORAL', w / 2, h * 0.78);
}

function cafeChair(parent, x, z, rotation) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  put(chair, box(0.28, 0.05, 0.26), lambert('#c9844a'), 0, 0.34, 0);
  put(chair, box(0.28, 0.26, 0.04), lambert('#a86a38'), 0, 0.5, -0.12);
  put(chair, box(0.04, 0.3, 0.04), lambert('#6b4228'), -0.11, 0.18, 0.08);
  put(chair, box(0.04, 0.3, 0.04), lambert('#6b4228'), 0.11, 0.18, 0.08);
  parent.add(chair);
}

function cafeTable(parent, x, z) {
  put(parent, cyl(0.05, 0.05, 0.4, 8), lambert('#8a6238'), x, 0.36, z);
  put(parent, cyl(0.32, 0.32, 0.045, 14), lambert('#f3e2c4'), x, 0.58, z);
  put(parent, cyl(0.1, 0.09, 0.03, 10), lambert('#f7f4ea'), x, 0.63, z);
  put(parent, sphere(0.04, 8, 6), lambert('#e07a3a'), x + 0.08, 0.66, z);
}

export function createRiceStall() {
  const root = new THREE.Group();
  root.position.set(-14.6, 0, 5.7);
  const wall = lambert('#3e4652');
  const trim = lambert('#2a3038');
  const yellow = lambert('#f0b429');

  put(root, box(6, 0.14, 3.7), lambert('#5a5148'), 0, 0.07, -0.35, null, true);
  put(root, box(5.5, 0.05, 2.9), lambert('#f6d7a4'), 0, 0.16, -0.45);
  put(root, box(0.12, 2.35, 3.05), wall, -2.94, 1.28, -0.55, null, true);
  put(root, box(0.12, 2.35, 3.05), wall, 2.94, 1.28, -0.55, null, true);
  put(root, box(5.78, 2.35, 0.12), wall, 0, 1.28, -2.05, null, true);
  put(root, box(6.15, 0.14, 2.9), trim, 0, 2.48, -0.55, null, true);
  put(root, box(0.85, 1.75, 0.1), wall, -2.35, 0.98, 1.18);
  put(root, box(0.85, 1.75, 0.1), wall, 2.35, 0.98, 1.18);
  [-0.72, 0.72].forEach((x) => {
    put(root, box(0.08, 1.7, 0.08), trim, x, 0.95, 1.22);
  });
  put(root, box(1.52, 0.08, 0.08), trim, 0, 1.76, 1.22);
  put(root, box(5.7, 0.08, 0.08), trim, 0, 1.9, 1.2);
  [-1.9, 0, 1.9].forEach((x) => {
    put(root, cyl(0.05, 0.05, 0.04, 8), basic('#fff1c2'), x, 2.08, 1.28);
  });

  [[-1.45, -0.5], [0.15, -0.5], [1.75, -1.35], [-0.75, -1.45]].forEach(([x, z]) => cafeTable(root, x, z));
  const seats = [
    [-1.8, -0.82, 0.45],
    [-1.05, -0.15, 2.5],
    [-0.2, -0.85, 0.25],
    [0.55, -0.15, 2.6],
    [1.4, -1.68, 0.35],
    [2.15, -1.05, 2.3],
    [-1.1, -1.78, 0.2],
    [-0.35, -1.1, 2.55],
  ];
  seats.forEach(([x, z, rotation]) => cafeChair(root, x, z, rotation));
  put(root, box(1.45, 0.62, 0.4), lambert('#f4f1ea'), 1.85, 0.48, -1.65, null, true);
  put(root, box(0.85, 0.04, 0.24), lambert('#d7c4a2'), 1.85, 0.82, -1.65);

  const staff = createPerson(1, '#f7f4ea', { apron: true });
  staff.position.set(0.45, 0, -0.15);
  put(staff, box(0.14, 0.18, 0.025), yellow, 0, 0.46, 0.09);
  put(staff, cyl(0.1, 0.11, 0.05, 10), yellow, 0, 0.84, 0);
  put(staff, box(0.16, 0.02, 0.1), lambert('#f7f4ea'), 0.18, 0.5, 0.06);
  put(staff, cyl(0.05, 0.05, 0.02, 8), lambert('#f4efe4'), 0.18, 0.53, 0.06);
  root.add(staff);

  const glow = new THREE.PointLight(0xffc56a, 0.55, 8, 2);
  glow.position.set(0, 1.9, -0.2);
  root.add(glow);

  const sign = createBoard(768, 280, 3.4, 1.2);
  sign.mesh.position.set(0, 3.2, 1.55);
  sign.mesh.userData.pick = { type: 'rice-sign' };
  sign.redraw('cafe', drawCafeSign);
  root.add(sign.mesh);

  const inside = seats.map(([x, z, rotation], index) => {
    const person = createPerson(index + 2);
    person.position.set(x, 0.2, z);
    person.rotation.y = rotation;
    person.visible = false;
    root.add(person);
    return person;
  });
  const queue = Array.from({ length: 10 }, (_, index) => {
    const person = createPerson(index + 12);
    person.visible = false;
    root.add(person);
    return person;
  });
  const doorPoint = new THREE.Vector3();

  return {
    root,
    setCrowd(seated, queueCount) {
      const time = performance.now() / 1000;
      queueIdle(staff, time, 2);
      staff.userData.rig.position.y = 0;
      inside.forEach((person, index) => {
        person.visible = index < seated;
        if (person.visible) eatPerson(person, time, index);
      });
      root.updateWorldMatrix(true, false);
      doorPoint.set(0, 0.7, 1.15);
      root.localToWorld(doorPoint);
      queue.forEach((person, index) => {
        person.visible = index < queueCount;
        if (!person.visible) return;
        person.position.set(1.05 + index * 0.48, 0, 1.32);
        person.lookAt(doorPoint);
        queueIdle(person, time, index);
      });
    },
  };
}
