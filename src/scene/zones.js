import * as THREE from 'three';
import { basic, box, cyl, lambert, put, sphere } from './geom.js';
import { createBoard, drawNote, roundRect } from './labels.js';
import { createPerson, poseSit } from './people.js';

export function createAlley() {
  const root = new THREE.Group();
  root.position.set(-14.0, 0, -3.4);
  const wet = new THREE.MeshLambertMaterial({
    color: '#343a34',
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 6.4), wet);
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  root.add(floor);
  [[-0.7, 0.4], [0.5, -0.8], [0.2, 1.6]].forEach(([x, z]) => {
    put(root, box(0.55, 0.02, 0.35), lambert('#2a312c'), x, 0.13, z);
  });
  put(root, box(0.16, 2.2, 6.2), lambert('#6e5a48'), -1.55, 1.15, 0, null, true);
  for (let row = 0; row < 5; row += 1) {
    put(root, box(0.04, 0.28, 1.05), lambert(row % 2 ? '#d5ddd8' : '#e7eeea'), -1.42, 0.55 + row * 0.32, 0.2);
  }
  put(root, box(4.2, 0.7, 0.7), lambert('#8d9498'), -0.2, 0.55, -2.6, null, true);
  put(root, box(3.6, 0.08, 0.55), lambert('#d5dbde'), -0.2, 0.92, -2.6);
  put(root, cyl(0.04, 0.04, 0.55, 8), lambert('#d5e7ea'), 1.15, 0.85, -2.55);
  put(root, cyl(0.035, 0.02, 0.35, 8), lambert('#9fd8ea'), 1.15, 0.42, -2.15);
  put(root, box(1.3, 0.9, 0.35), lambert('#b7c0c4'), 1.35, 0.7, -1.2);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    put(root, box(1.15, 0.04, 0.32), lambert('#d7dee2'), 1.35, 1.15 + shelf * 0.28, -1.2);
  }
  for (let level = 0; level < 4; level += 1) {
    put(root, cyl(0.16, 0.14, 0.05, 12), lambert(level % 2 ? '#f4f7f8' : '#d5e1e4'), 1.35, 1.2 + level * 0.06, -1.2);
  }
  put(root, box(0.9, 1.3, 0.08), lambert('#d7c4a2'), -2.2, 1.5, 1.4);

  const sign = createBoard(512, 220, 2.1, 0.86);
  sign.mesh.position.set(0.4, 1.85, -3.3);
  sign.redraw('alley', (ctx, w, h) => drawNote(ctx, w, h, ['後巷', '洗大餅']));
  root.add(sign.mesh);

  const people = Array.from({ length: 8 }, (_, index) => {
    const person = createPerson(index, '#6e8cab');
    person.visible = false;
    root.add(person);
    return person;
  });
  const bowls = Array.from({ length: 8 }, (_, index) => {
    const stack = new THREE.Group();
    const height = 3 + (index % 3);
    for (let level = 0; level < height; level += 1) {
      put(stack, cyl(0.14, 0.12, 0.045, 12), lambert(level % 2 ? '#f7fbfc' : '#d7e3e6'), 0, 0.08 + level * 0.05, 0);
    }
    stack.position.set(-0.4 + (index % 4) * 0.48, 0, 1.2 + Math.floor(index / 4) * 0.7);
    stack.visible = false;
    root.add(stack);
    return stack;
  });

  return {
    root,
    setCounts(peopleCount, bowlCount) {
      people.forEach((person, index) => {
        person.visible = index < peopleCount;
        if (!person.visible) return;
        const { legs, rig } = person.userData;
        if (legs && rig) {
          legs[0].rotation.x = 0.7;
          legs[1].rotation.x = 0.55;
          rig.position.y = -0.16;
          rig.rotation.x = 0.35;
        }
        person.position.set(-1.3 + (index % 4) * 0.7, 0, -0.2 + Math.floor(index / 4) * 0.85);
        person.rotation.y = -0.6;
      });
      bowls.forEach((stack, index) => {
        stack.visible = index < bowlCount;
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
  root.position.set(-13.4, 0, 6.05);
  const wall = lambert('#3e4652');
  const trim = lambert('#2a3038');
  const glass = new THREE.MeshLambertMaterial({
    color: '#ffe3a8',
    emissive: '#ffbf62',
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.42,
  });
  const yellow = lambert('#f0b429');

  put(root, box(4.7, 0.14, 3.05), lambert('#5a5148'), 0, 0.07, -0.15, null, true);
  put(root, box(4.25, 0.05, 2.35), lambert('#f6d7a4'), 0, 0.16, -0.28);
  put(root, box(0.12, 2.2, 2.55), wall, -2.2, 1.22, -0.28, null, true);
  put(root, box(0.12, 2.2, 2.55), wall, 2.2, 1.22, -0.28, null, true);
  put(root, box(4.45, 2.2, 0.12), wall, 0, 1.22, -1.52, null, true);
  put(root, box(4.8, 0.14, 2.15), trim, 0, 2.28, -0.48, null, true);
  put(root, box(4.75, 0.62, 0.34), trim, 0, 2.42, 0.92, null, true);
  put(root, box(4.55, 0.08, 0.5), wall, 0, 2.05, 1.02);
  put(root, box(3.5, 0.1, 0.7), yellow, 0, 2.4, 0.78);
  [-1.45, 1.45].forEach((x) => {
    put(root, box(1.15, 1.42, 0.035), glass, x, 1.18, 1.02);
  });
  put(root, box(1.05, 0.62, 0.035), glass, 0, 1.52, 1.02);
  put(root, box(0.92, 1.05, 0.05), yellow, 0, 0.78, 1.03);
  put(root, box(0.62, 0.72, 0.02), glass, 0, 0.9, 1.07);
  put(root, sphere(0.035, 8, 6), basic('#fff6d0'), 0.28, 0.82, 1.08);
  [-0.72, 0.72].forEach((x) => {
    put(root, box(0.06, 1.55, 0.07), trim, x, 1.15, 1.05);
  });
  put(root, box(4.35, 0.06, 0.07), trim, 0, 0.46, 1.05);
  put(root, box(4.35, 0.06, 0.07), trim, 0, 1.88, 1.05);
  [-1.45, 0, 1.45].forEach((x) => {
    put(root, cyl(0.05, 0.05, 0.04, 8), basic('#fff1c2'), x, 1.98, 1.12);
  });

  [-1.15, 0.15, 1.25].forEach((x) => cafeTable(root, x, -0.72));
  const seats = [
    [-1.45, -0.95, 0.5],
    [-0.85, -0.38, 2.5],
    [-0.15, -1.05, 0.25],
    [0.5, -0.38, 2.7],
    [0.95, -0.98, -0.2],
    [1.55, -0.4, 2.4],
  ];
  seats.forEach(([x, z, rotation]) => cafeChair(root, x, z, rotation));
  put(root, box(1.25, 0.62, 0.38), lambert('#f4f1ea'), 1.4, 0.48, -1.15, null, true);
  put(root, box(0.7, 0.04, 0.22), lambert('#d7c4a2'), 1.4, 0.82, -1.15);

  const staff = createPerson(1, '#f7f4ea', { apron: true });
  staff.position.set(0.55, 0, 0.15);
  put(staff, box(0.14, 0.18, 0.025), yellow, 0, 0.46, 0.09);
  put(staff, cyl(0.1, 0.11, 0.05, 10), yellow, 0, 0.84, 0);
  put(staff, box(0.16, 0.02, 0.1), lambert('#f7f4ea'), 0.18, 0.5, 0.06);
  put(staff, cyl(0.05, 0.05, 0.02, 8), lambert('#f4efe4'), 0.18, 0.53, 0.06);
  root.add(staff);

  const glow = new THREE.PointLight(0xffc56a, 0.55, 7, 2);
  glow.position.set(0, 1.8, -0.2);
  root.add(glow);

  const sign = createBoard(768, 280, 3.15, 1.12);
  sign.mesh.position.set(0, 2.52, 1.12);
  sign.mesh.userData.pick = { type: 'rice-sign' };
  sign.redraw('cafe', drawCafeSign);
  root.add(sign.mesh);

  const inside = seats.map(([x, z, rotation], index) => {
    const person = createPerson(index + 2);
    person.position.set(x, 0.2, z);
    person.rotation.y = rotation;
    person.visible = false;
    poseSit(person);
    root.add(person);
    return person;
  });
  const queue = Array.from({ length: 14 }, (_, index) => {
    const person = createPerson(index + 8);
    person.visible = false;
    root.add(person);
    return person;
  });

  return {
    root,
    setQueue(count) {
      const total = Math.max(0, count);
      inside.forEach((person, index) => {
        person.visible = index < total;
      });
      queue.forEach((person, index) => {
        const place = index + inside.length;
        person.visible = place < total;
        if (!person.visible) return;
        const column = index % 7;
        const row = Math.floor(index / 7);
        person.position.set(-2.35 - column * 0.4, 0, 1.35 + row * 0.42);
        person.rotation.y = -Math.PI / 2;
      });
    },
  };
}
