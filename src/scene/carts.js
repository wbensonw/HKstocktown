import * as THREE from 'three';
import { basic, box, cyl, lambert, put, sphere } from './geom.js';
import { createBoard, drawNote } from './labels.js';
import { createDimsum } from './dimsum.js';
import { createPerson } from './people.js';
import { formatTurnover } from '../services/format.js';

function wheels(group) {
  [-0.28, 0.28].forEach((x) => {
    [-0.18, 0.18].forEach((z) => {
      put(group, cyl(0.07, 0.07, 0.04, 12), lambert('#1c1c1c'), x, 0.07, z, [Math.PI / 2, 0, 0]);
      put(group, cyl(0.03, 0.03, 0.05, 8), lambert('#8d9398'), x, 0.07, z, [Math.PI / 2, 0, 0]);
    });
  });
}

function bed(group, color, length = 0.9) {
  const planks = 4;
  for (let index = 0; index < planks; index += 1) {
    put(group, box(length * 0.92, 0.035, 0.1), lambert(color), 0, 0.2, -0.16 + index * 0.11, null, true);
  }
  put(group, box(length, 0.04, 0.04), lambert('#5c4030'), 0, 0.24, -0.24);
  put(group, box(length, 0.04, 0.04), lambert('#5c4030'), 0, 0.24, 0.24);
  put(group, cyl(0.02, 0.02, length * 0.86, 6), lambert('#c9844a'), 0, 0.42, -0.24, [0, 0, Math.PI / 2]);
  put(group, cyl(0.02, 0.02, length * 0.86, 6), lambert('#c9844a'), 0, 0.42, 0.24, [0, 0, Math.PI / 2]);
  [-0.22, 0.22].forEach((z) => {
    put(group, box(0.04, 0.22, 0.04), lambert('#6b4a32'), -length / 2 + 0.04, 0.32, z);
    put(group, box(0.04, 0.34, 0.04), lambert('#6b4a32'), length / 2 - 0.06, 0.38, z);
  });
  put(group, box(0.04, 0.04, 0.48), lambert('#8b5a38'), length / 2 - 0.06, 0.56, 0);
  put(group, cyl(0.025, 0.025, 0.42, 8), lambert('#d7c4a2'), -length / 2 - 0.02, 0.36, 0, [Math.PI / 2, 0, 0]);
}

function clearGroup(group) {
  for (let index = group.children.length - 1; index >= 0; index -= 1) {
    group.remove(group.children[index]);
  }
}

function placeFood(slots, stocks) {
  const signature = (stocks ?? []).map((stock) => stock?.symbol ?? '').join('|');
  if (slots.signature === signature) return;
  slots.signature = signature;
  slots.holders.forEach((holder) => {
    clearGroup(holder);
    const stock = stocks?.[holder.userData.index];
    if (!stock) return;
    const food = createDimsum(stock.dimsum);
    food.scale.setScalar(holder.userData.foodScale);
    holder.add(food);
  });
}

function makeHolder(parent, x, y, z, index, foodScale) {
  const holder = new THREE.Group();
  holder.position.set(x, y, z);
  holder.userData.index = index;
  holder.userData.foodScale = foodScale;
  parent.add(holder);
  return holder;
}

export function createCarts() {
  const root = new THREE.Group();
  const gain = buildGain();
  const loss = buildLoss();
  const heavy = buildHeavy();
  const anomaly = buildAnomaly();
  root.add(gain.group, loss.group, heavy.group, anomaly.group);

  const carts = [
    { id: 'gain', phase: 0.2, ...gain },
    { id: 'loss', phase: 2.3, ...loss },
    { id: 'turnover', phase: 4.4, ...heavy },
  ];
  let angle = 0;
  let anomalyPhase = 'hidden';
  let anomalyTimer = 0;
  let anomalyKey = '';
  let bell = false;
  const center = new THREE.Vector3(0.15, 0, 2.35);
  const offstage = new THREE.Vector3(0, -12, 48);

  anomaly.group.position.copy(offstage);
  anomaly.group.visible = false;

  function moveAlong(cart, theta) {
    const x = Math.cos(theta) * 7.05;
    const z = Math.sin(theta) * 5.45;
    cart.group.position.set(x, 0, z);
    cart.group.rotation.y = -theta + Math.PI / 2;
  }

  return {
    root,
    consumeBell() {
      const value = bell;
      bell = false;
      return value;
    },
    bubbles() {
      return [
        { id: 'gain', object: gain.anchor, text: '新鮮出爐！今日爆升點心！', show: gain.group.visible },
        { id: 'loss', object: loss.anchor, text: '大特價益街坊！急凍點心跳樓價！', show: loss.group.visible },
        { id: 'turnover', object: heavy.anchor, text: heavy.caption, show: heavy.group.visible },
        { id: 'anomaly', object: anomaly.anchor, text: anomaly.caption, show: anomaly.group.visible && anomalyPhase !== 'hidden' },
      ];
    },
    update(motion, view) {
      const moving = view.session.carts !== 'park';
      if (moving) angle += motion * (view.session.carts === 'rush' ? 0.34 : 0.18);
      carts.forEach((cart) => {
        moveAlong(cart, angle + cart.phase);
        cart.group.visible = true;
      });
      placeFood(gain.slots, view.rankings.gainers);
      placeFood(loss.slots, view.rankings.losers);
      placeFood(heavy.slots, view.rankings.turnover);
      const led = view.rankings.turnover
        .map((stock) => `${stock.symbol} ${formatTurnover(stock.turnover)}`)
        .join('   ');
      heavy.board.redraw(led, (ctx, w, h) => {
        ctx.fillStyle = '#08140f';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#7dffb2';
        ctx.font = '700 42px "Microsoft JhengHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(led || '巨額成交', w / 2, h / 2 + 12);
      });
      heavy.caption = view.rankings.turnover[0]
        ? `巨額成交 ${view.rankings.turnover[0].short}`
        : '巨額成交';

      loss.frost.forEach((particle, index) => {
        particle.y = ((particle.seed + performance.now() / 900) % 1) * 0.6;
        loss.positions[index * 3 + 1] = particle.y;
      });
      loss.geometry.attributes.position.needsUpdate = true;

      const parked = view.session.carts === 'park';
      const active = (view.anomalies ?? []).find((item) => !parked || item.kind === 'test');
      const key = active?.text ?? '';
      if (parked && active?.kind !== 'test') {
        anomalyPhase = 'hidden';
        anomaly.group.visible = false;
        anomaly.group.position.copy(offstage);
        anomalyKey = '';
      } else if (key && key !== anomalyKey && anomalyPhase === 'hidden') {
        anomalyKey = key;
        anomalyPhase = 'in';
        anomaly.caption = key;
        anomaly.group.visible = true;
        bell = true;
      }
      if (!key && (anomalyPhase === 'hold' || anomalyPhase === 'in')) anomalyPhase = 'out';
      if (anomalyPhase === 'in') {
        anomaly.group.position.lerp(center, Math.min(1, motion * 2.2 + 0.02));
        if (anomaly.group.position.distanceTo(center) < 0.25) {
          anomalyPhase = 'hold';
          anomalyTimer = 8;
        }
      } else if (anomalyPhase === 'hold') {
        anomalyTimer -= motion;
        anomaly.lamp.scale.setScalar(1 + Math.sin(performance.now() / 80) * 0.15);
        if (anomalyTimer <= 0) anomalyPhase = 'out';
      } else if (anomalyPhase === 'out') {
        anomaly.group.position.lerp(offstage, Math.min(1, motion * 1.6 + 0.02));
        if (anomaly.group.position.distanceTo(offstage) < 0.4) {
          anomalyPhase = 'hidden';
          anomaly.group.visible = false;
          anomalyKey = '';
        }
      }
    },
  };
}

function buildGain() {
  const group = new THREE.Group();
  group.userData.pick = { type: 'cart', id: 'gain' };
  wheels(group);
  bed(group, '#8d3a32');
  put(group, box(0.7, 0.03, 0.4), basic('#ffb15a'), 0, 0.28, 0);
  const auntie = createPerson(1, '#f2d2c4', { apron: true });
  auntie.position.set(-0.72, 0, 0);
  auntie.rotation.y = Math.PI / 2;
  group.add(auntie);
  const holders = [0, 1, 2].map((index) => makeHolder(group, -0.18 + index * 0.22, 0.34, 0, index, 0.55));
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 1.35, 0);
  group.add(anchor);
  return { group, slots: { holders, signature: '' }, anchor };
}

function buildLoss() {
  const group = new THREE.Group();
  group.userData.pick = { type: 'cart', id: 'loss' };
  wheels(group);
  bed(group, '#31485a');
  const auntie = createPerson(4, '#d5e4ef', { apron: true });
  auntie.position.set(-0.72, 0, 0);
  auntie.rotation.y = Math.PI / 2;
  group.add(auntie);
  const holders = [0, 1, 2].map((index) => makeHolder(group, -0.18 + index * 0.22, 0.34, 0, index, 0.55));
  const count = 36;
  const positions = new Float32Array(count * 3);
  const frost = [];
  for (let index = 0; index < count; index += 1) {
    const seed = Math.random();
    positions[index * 3] = (Math.random() - 0.5) * 0.7;
    positions[index * 3 + 1] = Math.random() * 0.5;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 0.4;
    frost.push({ seed, y: 0 });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#d7f4ff',
    size: 0.045,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }));
  points.position.y = 0.3;
  group.add(points);
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 1.35, 0);
  group.add(anchor);
  return { group, slots: { holders, signature: '' }, anchor, frost, positions, geometry };
}

function buildHeavy() {
  const group = new THREE.Group();
  group.userData.pick = { type: 'cart', id: 'turnover' };
  wheels(group);
  bed(group, '#8a7044', 1.15);
  put(group, box(0.9, 0.06, 0.46), lambert('#d9c29a'), 0, 0.62, 0, null, true);
  put(group, box(0.04, 0.4, 0.04), lambert('#5c4632'), -0.42, 0.46, -0.18);
  put(group, box(0.04, 0.4, 0.04), lambert('#5c4632'), 0.42, 0.46, -0.18);
  put(group, box(0.04, 0.4, 0.04), lambert('#5c4632'), -0.42, 0.46, 0.18);
  put(group, box(0.04, 0.4, 0.04), lambert('#5c4632'), 0.42, 0.46, 0.18);
  const board = createBoard(1024, 128, 1.05, 0.18);
  board.mesh.position.set(0, 0.48, 0.27);
  group.add(board.mesh);
  [3, 5].forEach((shirt, index) => {
    const person = createPerson(shirt);
    person.position.set(-0.95, 0, index === 0 ? -0.16 : 0.16);
    person.rotation.y = Math.PI / 2;
    group.add(person);
  });
  const holders = [0, 1, 2].map((index) => makeHolder(group, -0.22 + index * 0.22, 0.78, 0, index, 0.5));
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 1.55, 0);
  group.add(anchor);
  return { group, slots: { holders, signature: '' }, anchor, board, caption: '巨額成交' };
}

function buildAnomaly() {
  const group = new THREE.Group();
  group.userData.pick = { type: 'cart', id: 'anomaly' };
  wheels(group);
  bed(group, '#7a1d24', 0.85);
  const lamp = put(group, sphere(0.08, 12, 10), basic('#ff2d2d'), 0.2, 0.72, 0);
  put(group, cyl(0.02, 0.02, 0.4, 8), lambert('#ddd'), 0.2, 0.5, 0);
  const auntie = createPerson(0, '#ffd1d1', { apron: true });
  auntie.position.set(-0.7, 0, 0);
  auntie.rotation.y = Math.PI / 2;
  group.add(auntie);
  const anchor = new THREE.Object3D();
  anchor.position.set(0, 1.4, 0);
  group.add(anchor);
  return { group, anchor, lamp, caption: '' };
}
