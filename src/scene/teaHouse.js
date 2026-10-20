import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { getUniverse } from '../config/stocks.js';
import { formatTurnover, tone } from '../services/format.js';
import { createCarts } from './carts.js';
import { createDimsum, createSteamer } from './dimsum.js';
import { basic, box, cyl, lambert, plankTexture, put, sphere, torus, windowTexture } from './geom.js';
import { createBoard, drawNeon, drawNote, drawPrice, drawSession, sharpCanvasTexture } from './labels.js';
import { createPerson, createReader, dinePerson, givePaper, idlePerson, posePhone, poseSit, walkPerson } from './people.js';
import { createAlley, createRiceStall } from './zones.js';
import { createBlock } from './block.js';

const LOOK = {
  prep: { sun: 0.58, zenith: '#5f9fd4', horizon: '#f0c9a4', water: '#3f8eab', hemi: 0.4, lantern: 0.32, neon: 0.75, star: 0, harbour: 0.16 },
  auction: { sun: 0.75, zenith: '#5f9fd4', horizon: '#f0c9a4', water: '#3f8eab', hemi: 0.5, lantern: 0.2, neon: 0.8, star: 0, harbour: 0.12 },
  morning: { sun: 1.22, zenith: '#5f9fd4', horizon: '#f0c9a4', water: '#3f8eab', hemi: 0.78, lantern: 0.04, neon: 0.35, star: 0, harbour: 0.04 },
  lunch: { sun: 1.32, zenith: '#5f9fd4', horizon: '#f0c9a4', water: '#3f8eab', hemi: 0.82, lantern: 0.03, neon: 0.3, star: 0, harbour: 0.03 },
  afternoon: { sun: 1.12, zenith: '#5f9fd4', horizon: '#f0c9a4', water: '#3f8eab', hemi: 0.74, lantern: 0.08, neon: 0.4, star: 0, harbour: 0.05 },
  preclose: { sun: 0.82, zenith: '#e07a55', horizon: '#f3b27a', water: '#c46a58', hemi: 0.55, lantern: 1.3, neon: 1.15, star: 0.25, harbour: 0.55 },
  cas: { sun: 0.48, zenith: '#e07a55', horizon: '#f3b27a', water: '#c46a58', hemi: 0.46, lantern: 1.8, neon: 1.35, star: 0.7, harbour: 0.9 },
  night: { sun: 0.42, zenith: '#1a2744', horizon: '#3a4d78', water: '#163a56', hemi: 0.62, lantern: 2.6, neon: 1.7, star: 1, harbour: 1.15 },
};

const SKY = Object.fromEntries(Object.entries(LOOK).map(([key, value]) => [key, {
  zenith: new THREE.Color(value.zenith),
  horizon: new THREE.Color(value.horizon),
  water: new THREE.Color(value.water),
}]));

export function tablePose(index, count = getUniverse().length) {
  const ang = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(ang) * 6.55, z: Math.sin(ang) * 4.85, ang };
}

function steamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  glow.addColorStop(0, 'rgba(255,255,255,0.9)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let steamMat = null;

function makeSteam(parent) {
  const count = 36;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  if (!steamMat) {
    steamMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.18,
      map: steamTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    });
  }
  const points = new THREE.Points(geometry, steamMat);
  parent.add(points);
  return {
    points,
    positions,
    geometry,
    count,
    seeds: Array.from({ length: count }, () => Math.random()),
  };
}

function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: new THREE.Color('#5f9fd4') },
      uHorizon: { value: new THREE.Color('#f0c9a4') },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
      fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      varying vec3 vWorld;
      void main() {
        float y = normalize(vWorld).y;
        float warm = smoothstep(0.34, -0.04, y);
        gl_FragColor = vec4(mix(uZenith, uHorizon, warm * 0.35), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 20), material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

function buildBasin(scene) {
  const waterMat = new THREE.MeshLambertMaterial({ color: '#3f8eab' });
  const water = new THREE.Mesh(new THREE.BoxGeometry(150, 0.2, 150), waterMat);
  water.position.set(0, -0.46, 4);
  water.receiveShadow = true;
  scene.add(water);

  const hill = lambert('#7d9468');
  const hillShade = lambert('#648256');
  [[-30, -32, 7.5, 0.62], [-14, -34, 9, 0.55], [2, -30, 8, 0.58], [20, -36, 10, 0.52], [36, -32, 7, 0.6]].forEach(([x, z, radius, height], index) => {
    const mesh = put(scene, sphere(radius, 18, 12), index % 2 ? hill : hillShade, x, -0.6, z);
    mesh.scale.y = height;
  });

  const face = lambert('#d7c4aa');
  const roof = lambert('#8d5a45');
  [[-22, 8.4, -26, 2.2], [-8, 11.2, -28, 1.8], [6, 7.6, -25, 2.4], [16, 12.5, -29, 1.7], [28, 9.2, -26, 2.1]].forEach(([x, height, z, width]) => {
    put(scene, box(width, height, width * 0.8), face, x, height / 2 - 0.4, z);
    put(scene, box(width + 0.25, 0.28, width * 0.9), roof, x, height - 0.28, z);
  });
  return waterMat;
}

function buildGround(scene) {
  put(scene, box(20.8, 0.12, 16.6), lambert('#a89074'), -0.25, -0.08, -0.4, null, true);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(19, 0.16, 14.5), new THREE.MeshLambertMaterial({ map: plankTexture() }));
  floor.position.set(-0.25, -0.08, -0.45);
  floor.receiveShadow = true;
  floor.castShadow = false;
  scene.add(floor);
  put(scene, torus(2.1, 0.03, 8, 40), lambert('#c6a15a'), 0, 0.17, 0, [Math.PI / 2, 0, 0]);
}

function coupletBoard(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8d2e2e';
  ctx.fillRect(0, 0, 160, 640);
  ctx.strokeStyle = '#e6c56a';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 140, 620);
  ctx.fillStyle = '#f3e2b0';
  ctx.font = '700 72px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...text].forEach((char, index) => {
    ctx.fillText(char, 80, 110 + index * 108);
  });
  const texture = sharpCanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 1.28),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
}

function buildHall(scene) {
  const wood = lambert('#6b412c');
  const dark = lambert('#4e311f');
  const wall = (x, y, z, w, h, d) => put(scene, box(w, h, d), wood, x, y, z, null, true);
  wall(-5.95, 0.78, -7.85, 7.5, 1.55, 0.16);
  wall(5.7, 0.78, -7.85, 7, 1.55, 0.16);
  wall(-5.75, 0.78, 6.95, 7.9, 1.55, 0.16);
  wall(5.5, 0.78, 6.95, 7.4, 1.55, 0.16);
  wall(-9.8, 0.78, -0.45, 0.16, 1.55, 14.6);
  wall(9.3, 0.78, -0.45, 0.16, 1.55, 14.6);
  [-4.6, -1.2, 2.4].forEach((z) => {
    [-9.97, 9.47].forEach((x) => {
      put(scene, box(0.05, 0.5, 0.62), lambert('#d5e4ea'), x, 0.95, z);
      put(scene, box(0.07, 0.5, 0.04), dark, x, 0.95, z);
      put(scene, box(0.07, 0.04, 0.62), dark, x, 0.95, z);
    });
  });
  for (let index = -3; index <= 3; index += 1) {
    put(scene, box(0.06, 1.35, 0.06), dark, index * 0.42, 0.9, -7.85);
  }
  put(scene, box(2.6, 0.06, 0.06), dark, 0, 1.45, -6.95);
  put(scene, box(2.6, 0.06, 0.06), dark, 0, 0.7, -6.95);
  put(scene, box(1.3, 1.15, 0.08), lambert('#8d2e2e'), -0.55, 0.75, 6.72);
  put(scene, box(1.3, 1.15, 0.08), lambert('#8d2e2e'), 0.55, 0.75, 6.72);
  put(scene, box(2.9, 0.1, 0.1), dark, 0, 1.38, 6.66);
  put(scene, box(0.1, 1.35, 0.1), dark, -1.35, 0.75, 6.66);
  put(scene, box(0.1, 1.35, 0.1), dark, 1.35, 0.75, 6.66);
  put(scene, sphere(0.045, 8, 6), lambert('#e6c56a'), -0.18, 0.72, 6.82);
  put(scene, sphere(0.045, 8, 6), lambert('#e6c56a'), 0.18, 0.72, 6.82);
  put(scene, box(2.6, 0.08, 0.42), lambert('#cbb59a'), 0, 0.1, 7.28);
  put(scene, box(3.0, 0.08, 0.36), lambert('#b7a48c'), 0, 0.18, 7.02);
  [-1.55, 1.55].forEach((x) => {
    put(scene, cyl(0.03, 0.03, 0.28, 6), dark, x, 1.72, 7.05);
    put(scene, sphere(0.1, 10, 8), basic('#ffc56a'), x, 1.5, 7.05);
  });
  const nameNeon = wallNeon('恆指大茶樓', '#ff5a6a', 2.7);
  nameNeon.position.set(0, 1.22, 7.18);
  scene.add(nameNeon);
  [[-8.85, -6.9], [8.35, -6.9], [-8.85, 5.5], [8.35, 5.5]].forEach(([x, z]) => {
    put(scene, box(0.28, 2.3, 0.28), dark, x, 1.15, z, null, true);
  });
  const eave = lambert('#4a2c1c');
  put(scene, box(20.2, 0.1, 0.42), eave, -0.25, 1.62, 7.2, null, true);
  put(scene, box(20.2, 0.1, 0.42), eave, -0.25, 1.62, -8.1, null, true);
  put(scene, box(20.4, 0.045, 0.12), lambert('#e6d2a8'), -0.25, 1.7, 7.38);
  put(scene, box(20.4, 0.045, 0.12), lambert('#e6d2a8'), -0.25, 1.7, -8.28);
  put(scene, box(0.42, 0.1, 15.4), eave, -10.1, 1.62, -0.45, null, true);
  put(scene, box(0.42, 0.1, 15.4), eave, 9.6, 1.62, -0.45, null, true);
  put(scene, box(19.2, 0.1, 0.1), lambert('#3a2418'), -0.25, 0.12, 6.88);
  put(scene, box(19.2, 0.1, 0.1), lambert('#3a2418'), -0.25, 0.12, -7.78);
  const tile = lambert('#2f6b4a');
  const grout = lambert('#d7e4d4');
  [[-4.7, 5.6], [4.8, 5.6]].forEach(([x, width]) => {
    put(scene, box(width, 0.22, 0.05), tile, x, 0.2, 7.06);
    put(scene, box(width, 0.03, 0.02), grout, x, 0.32, 7.09);
  });
  [
    { text: '茶香滿座', x: -2.35 },
    { text: '點心宜人', x: 2.35 },
  ].forEach(({ text, x }) => {
    const board = coupletBoard(text);
    board.position.set(x, 0.85, 7.08);
    scene.add(board);
  });
  [-4.2, 4.2].forEach((x) => {
    put(scene, cyl(0.02, 0.02, 0.22, 6), dark, x, 1.55, 7.12);
    put(scene, sphere(0.11, 10, 8), basic('#d4543c'), x, 1.38, 7.12);
  });
}

function buildHarbour(scene) {
  const tex = windowTexture();
  const mats = [];
  const specs = [[-6, 5.2, 1.6], [-3.2, 7.4, 1.3], [-0.4, 6.1, 1.5], [2.6, 8.2, 1.2], [5.4, 5.4, 1.7]];
  specs.forEach(([x, height, depth], index) => {
    const material = new THREE.MeshLambertMaterial({ map: tex, emissive: '#ffb45a', emissiveMap: tex, emissiveIntensity: 0.2 });
    mats.push(material);
    const tiers = 2 + (index % 2);
    let cursor = -0.2;
    for (let tier = 0; tier < tiers; tier += 1) {
      const h = height * (tier === 0 ? 0.62 : 0.28);
      const shrink = 1 - tier * 0.16;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry((1.55 + (index % 2) * 0.35) * shrink, h, depth * shrink), material);
      mesh.position.set(x, cursor + h / 2, -10.6 - (index % 3) * 0.7);
      scene.add(mesh);
      cursor += h;
    }
  });
  return mats;
}

function buildTeapot(scene) {
  const group = new THREE.Group();
  group.userData.pick = { type: 'index' };
  const clay = lambert('#c45b68');
  const dark = lambert('#6a3038');
  const belly = put(group, sphere(0.58, 28, 22), clay, 0, 0.7, 0, null, true);
  belly.scale.set(1.08, 0.84, 1.08);
  put(group, cyl(0.26, 0.4, 0.18, 20), clay, 0, 1.08, 0, null, true);
  const lid = new THREE.Group();
  put(lid, cyl(0.42, 0.4, 0.06, 24), dark, 0, 0, 0);
  put(lid, cyl(0.34, 0.38, 0.08, 24), clay, 0, 0.06, 0);
  put(lid, sphere(0.08, 12, 10), lambert('#f0d2a4'), 0, 0.16, 0);
  lid.position.y = 1.02;
  group.add(lid);
  put(group, torus(0.2, 0.04, 8, 18), dark, -0.5, 0.78, 0, [0, 0, Math.PI / 2]);
  put(group, cyl(0.05, 0.07, 0.24, 10), clay, 0.48, 0.86, 0, [0, 0, -0.65]);
  put(group, cyl(0.055, 0.045, 0.22, 10), clay, 0.66, 1.02, 0, [0, 0, -1.1]);
  put(group, cyl(0.05, 0.08, 0.16, 10), clay, 0.76, 1.12, 0.02, [0.35, 0, -0.35]);
  put(group, cyl(0.32, 0.4, 0.08, 20), lambert('#c9843a'), 0, 0.24, 0);
  const stream = put(group, cyl(0.04, 0.028, 0.28, 10), basic('#e7b15a'), 0.7, 0.9, 0, [0, 0, 1.15]);
  const steam = makeSteam(group);
  const plaque = createBoard(512, 220, 1.15, 0.5);
  plaque.mesh.position.set(0, 0.78, 0.72);
  group.add(plaque.mesh);
  scene.add(group);
  group.scale.setScalar(1.85);
  return { stream, plaque, lid, steam };
}

function buildNeon(scene) {
  const group = new THREE.Group();
  const panel = new THREE.Group();
  panel.userData.pick = { type: 'index' };
  const board = createBoard(1024, 420, 3.7, 1.52);
  board.mesh.position.z = 0.16;
  panel.add(board.mesh);
  const frame = lambert('#2c261f');
  put(panel, box(0.08, 1.85, 0.08), frame, -2.15, 0, -0.22);
  put(panel, box(0.08, 1.85, 0.08), frame, 2.15, 0, -0.22);
  put(panel, box(4.5, 0.08, 0.08), frame, 0, 0.9, -0.22);
  [-2.15, 2.15].forEach((x) => {
    put(panel, sphere(0.07, 10, 8), basic('#ff4d5a'), x, -0.95, 0.16);
  });
  group.add(panel);
  const light = new THREE.PointLight('#ff4d5a', 1.2, 9, 2);
  light.position.z = 0.4;
  group.add(light);
  scene.add(group);
  return { group, panel, board, light };
}

function buildCashier(scene) {
  const group = new THREE.Group();
  group.position.set(-2.55, 0, 4.55);
  group.userData.pick = { type: 'cashier' };
  put(group, box(1.5, 0.72, 0.62), lambert('#7a5134'), 0, 0.5, 0, null, true);
  const keeper = createPerson(2, '#f4e1c4', { apron: true });
  keeper.position.set(0, 0, -0.45);
  group.add(keeper);
  scene.add(group);
}

function buildKitchen(scene) {
  const group = new THREE.Group();
  group.position.set(-6.3, 0, -5.4);
  put(group, box(1.8, 0.7, 0.7), lambert('#d9d3c8'), 0, 0.5, 0, null, true);
  put(group, cyl(0.22, 0.18, 0.16, 14), lambert('#c0c6cc'), -0.35, 0.92, 0);
  put(group, cyl(0.16, 0.14, 0.2, 12), lambert('#b7bdc2'), 0.4, 0.95, 0);
  const steam = makeSteam(group);
  scene.add(group);
  return steam;
}

function buildStars(scene) {
  const count = 180;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const theta = index * 2.399;
    const radius = 18 + (index % 7) * 3;
    positions[index * 3] = Math.cos(theta) * radius;
    positions[index * 3 + 1] = 8 + (index % 9) * 1.4;
    positions[index * 3 + 2] = Math.sin(theta) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: '#fffaf0', size: 0.08, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

function buildTables(scene) {
  const stocks = getUniverse();
  return stocks.map((stock, index) => {
    const pose = tablePose(index, stocks.length);
    const group = new THREE.Group();
    group.position.set(pose.x, 0, pose.z);
    const dir = new THREE.Vector2(pose.x, pose.z).normalize();
    const tangent = new THREE.Vector2(-dir.y, dir.x);
    put(group, cyl(0.76, 0.76, 0.08, 24), lambert('#8d5a38'), 0, 0.74, 0, null, true);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ff4d5a' });
    put(group, torus(0.78, 0.025, 8, 28), ringMat, 0, 0.8, 0, [Math.PI / 2, 0, 0]);
    [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]].forEach(([x, z]) => {
      put(group, box(0.08, 0.7, 0.08), lambert('#5c3b28'), x, 0.35, z, null, true);
    });
    const people = Array.from({ length: 12 }, (_, n) => {
      const person = createPerson(index + n);
      person.visible = false;
      group.add(person);
      return person;
    });
    const reader = createReader(index);
    reader.userData.pick = { type: 'reader', index };
    reader.position.set(tangent.x * 0.95, 0, tangent.y * 0.95);
    group.add(reader);
    const plateBoard = createBoard(512, 320, 1.46, 0.92);
    group.add(plateBoard.mesh);
    const steam = makeSteam(group);
    const steamer = createSteamer();
    const tableTop = 0.78;
    steamer.position.y = tableTop;
    steamer.userData.pick = { type: 'stock', index };
    const food = createDimsum(stock.dimsum);
    food.position.y = steamer.userData.top;
    steamer.add(food);
    group.add(steamer);
    plateBoard.mesh.position.y = tableTop + steamer.userData.top + 0.7;
    scene.add(group);
    reader.lookAt(0, 0.5, 0);
    return {
      index,
      kind: stock.dimsum,
      group,
      dir,
      tangent,
      people,
      reader,
      ring: ringMat,
      plate: plateBoard.mesh,
      plateBoard,
      steam,
      steamer,
    };
  });
}

function placePeople(table, count, rightCount, closed, time) {
  table.reader.visible = !closed;
  if (table.reader.visible) idlePerson(table.reader, time + table.index);
  const { dir, tangent } = table;
  table.people.forEach((person, index) => {
    person.visible = !closed && index < count;
    if (!person.visible) return;
    const onRight = index < rightCount;
    const slot = onRight ? index : index - rightCount;
    const sideCount = Math.max(1, onRight ? rightCount : count - rightCount);
    const along = (slot - (sideCount - 1) / 2) * 0.38;
    const side = onRight ? 0.2 : -0.2;
    person.position.set(dir.x * 1.16 + tangent.x * (along + side), 0, dir.y * 1.16 + tangent.y * (along + side));
    person.lookAt(table.group.position.x, 0.5, table.group.position.z);
    dinePerson(person, time, index + table.index * 5);
  });
}

function updateSteam(table, amount, motion, sessionId) {
  const closed = sessionId === 'night' || sessionId === 'holiday';
  const heat = Math.min(1, Math.max(0, amount / 48));
  const speed = (closed || sessionId === 'lunch' ? 0.18 : 0.35) + heat * 0.85;
  const cap = Math.round((closed ? 0.45 : 1) * amount);
  const visible = Math.min(table.steam.count, Math.max(closed ? 3 : 6, cap));
  const baseY = (table.steamer?.position.y ?? 0) + (table.steamer?.userData.top ?? 0.4) + 0.16;
  const clock = performance.now() / 1000;
  const spread = 0.16 + heat * 0.14;
  for (let index = 0; index < table.steam.count; index += 1) {
    const slot = index * 3;
    if (index >= visible) {
      table.steam.positions[slot + 1] = -4;
      continue;
    }
    table.steam.seeds[index] = (table.steam.seeds[index] + motion * speed * (0.45 + (index % 4) * 0.08)) % 1;
    const angle = index * 1.7;
    const drift = Math.sin(clock * (1.1 + heat) + index) * (0.05 + heat * 0.08);
    table.steam.positions[slot] = Math.cos(angle) * spread + drift;
    table.steam.positions[slot + 1] = baseY + table.steam.seeds[index] * (0.45 + heat * 0.9);
    table.steam.positions[slot + 2] = Math.sin(angle) * spread;
  }
  table.steam.geometry.attributes.position.needsUpdate = true;
}

function sampleLoop(points, t, target) {
  const scaled = t * points.length;
  const index = Math.floor(scaled) % points.length;
  const next = (index + 1) % points.length;
  target.lerpVectors(points[index], points[next], scaled - Math.floor(scaled));
}

function wallNeon(text, color, width = 2.3) {
  const scale = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2)));
  const canvas = document.createElement('canvas');
  canvas.width = 640 * scale;
  canvas.height = 180 * scale;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, 640, 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 604, 144);
  ctx.fillStyle = color;
  ctx.font = '700 54px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 320, 92);
  const texture = sharpCanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * (180 / 640)),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
}

function birdCage() {
  const group = new THREE.Group();
  const metal = lambert('#e4ded2');
  put(group, torus(0.16, 0.016, 8, 16), metal, 0, 0.3, 0, [Math.PI / 2, 0, 0]);
  put(group, torus(0.16, 0.016, 8, 16), metal, 0, 0.02, 0, [Math.PI / 2, 0, 0]);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    put(group, cyl(0.008, 0.008, 0.28, 6), metal, Math.cos(angle) * 0.16, 0.16, Math.sin(angle) * 0.16);
  }
  put(group, sphere(0.045, 10, 8), lambert('#f2c14e'), 0, 0.14, 0);
  put(group, box(0.012, 0.18, 0.012), metal, 0, 0.42, 0);
  return group;
}

function buildLife(scene) {
  [
    { text: '財源廣進', color: '#ff5b68', x: -9.6, y: 1.15, z: -1.4, ry: Math.PI / 2 },
    { text: '飲啖茶食個包', color: '#ffd15c', x: 9.1, y: 1.15, z: 1.5, ry: -Math.PI / 2, width: 3.15 },
    { text: '賭性堅強', color: '#7dfff0', x: 0.1, y: 1.22, z: -7.68, ry: 0 },
  ].forEach((sign) => {
    const mesh = wallNeon(sign.text, sign.color, sign.width || 2.25);
    mesh.position.set(sign.x, sign.y, sign.z);
    mesh.rotation.y = sign.ry;
    scene.add(mesh);
  });
  const cageA = birdCage();
  cageA.position.set(-3.5, 2.05, -5.15);
  const cageB = birdCage();
  cageB.position.set(3.7, 2.05, 1.5);
  scene.add(cageA, cageB);

  const wood = new THREE.Group();
  wood.position.set(-3.55, 0, 7.55);
  const post = lambert('#6b4228');
  const brass = lambert('#e6c56a');
  [-0.78, 0.78].forEach((x) => {
    put(wood, cyl(0.04, 0.055, 1.45, 10), post, x, 0.72, 0);
    put(wood, sphere(0.07, 10, 8), brass, x, 1.48, 0);
  });
  put(wood, box(1.85, 0.06, 0.28), lambert('#4a2c1c'), 0, 1.55, 0.04);
  put(wood, box(1.7, 0.045, 0.18), lambert('#8d2e2e'), 0, 1.48, 0.08);
  const board = createBoard(640, 360, 1.7, 0.96);
  board.mesh.position.set(0, 0.92, 0.04);
  wood.add(board.mesh);
  scene.add(wood);

  const queue = Array.from({ length: 6 }, (_, index) => {
    const person = createPerson(index + 1);
    person.position.set(-1.05 + index * 0.42, 0, 8.15);
    person.rotation.y = Math.PI;
    scene.add(person);
    return person;
  });
  const rails = new THREE.Group();
  scene.add(rails);
  [7.85, 8.55].forEach((z, side) => {
    const color = side === 0 ? '#d4543c' : '#3f8f4a';
    [-1.4, 0, 1.4].forEach((x) => {
      put(rails, cyl(0.03, 0.035, 0.72, 6), lambert(color), x, 0.36, z);
    });
    put(rails, box(2.8, 0.025, 0.025), lambert(color), 0, 0.64, z);
  });
  const readers = [createPerson(8, '#d7c4a3'), createPerson(9, '#8d4d62')];
  readers.forEach((person, index) => {
    person.position.set(index === 0 ? 15.4 : 19.6, 0.36, index === 0 ? -2.05 : 1.35);
    person.rotation.y = index === 0 ? 0.2 : -0.3;
    poseSit(person);
    if (index === 0) givePaper(person);
    else posePhone(person);
    scene.add(person);
  });
  const phoneStand = createPerson(10, '#3d568a');
  phoneStand.position.set(18.4, 0, 3.2);
  phoneStand.rotation.y = -0.4;
  posePhone(phoneStand);
  scene.add(phoneStand);
  const players = [createPerson(11, '#c56b38'), createPerson(12, '#3e6b4c')];
  players.forEach((person) => scene.add(person));
  const walkers = Array.from({ length: 8 }, (_, index) => createPerson(13 + index));
  walkers.forEach((person) => scene.add(person));
  const farWalkers = Array.from({ length: 8 }, (_, index) => createPerson(30 + index));
  farWalkers.forEach((person) => scene.add(person));
  const parkLoop = [
    [13.8, -5.8], [17.4, -6.4], [21.4, -5.2], [21.8, 3.6], [17.6, 6.2], [14.4, 5.6],
  ];
  let clock = 0;
  return {
    board,
    update(dt, closed, walkerCount = 5) {
      clock += Math.max(dt, 0);
      queue.forEach((person, index) => {
        person.visible = closed;
        if (closed) idlePerson(person, clock + index);
      });
      rails.visible = closed;
      readers.forEach((person, index) => idlePerson(person, clock + index * 0.4));
      idlePerson(phoneStand, clock);
      players.forEach((person, index) => {
        const travel = (clock * 0.08 + index * 0.5) % 1;
        const scaled = travel * parkLoop.length;
        const at = Math.floor(scaled) % parkLoop.length;
        const next = (at + 1) % parkLoop.length;
        const mix = scaled - Math.floor(scaled);
        const from = parkLoop[at];
        const to = parkLoop[next];
        person.position.set(from[0] + (to[0] - from[0]) * mix, 0, from[1] + (to[1] - from[1]) * mix);
        person.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]);
        walkPerson(person, clock + index, true);
      });
      const placeWalkers = (group, z) => {
        group.forEach((person, index) => {
          person.visible = index < walkerCount;
          if (!person.visible) return;
          const forward = index % 2 === 0;
          const span = (clock * 0.045 + index * 0.18) % 1;
          const t = forward ? span : 1 - span;
          person.position.set(-8 + t * 16, 0, z + (index % 3) * 0.18);
          person.rotation.y = forward ? Math.PI / 2 : -Math.PI / 2;
          walkPerson(person, clock * 1.15 + index, true);
        });
      };
      placeWalkers(walkers, 8.25);
      placeWalkers(farWalkers, 16.85);
    },
  };
}

function appleTouch() {
  const agent = navigator.userAgent || '';
  return /iPhone|iPad|iPod|CriOS/.test(agent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function drawingRatio(width) {
  const density = window.devicePixelRatio || 1;
  if (width < 900) return Math.min(3, Math.max(density, 2));
  return Math.min(density, 1.5);
}

export function createWorld(parent) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f0c9a4');
  scene.fog = new THREE.Fog('#f0c9a4', 55, 130);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 180);
  camera.position.set(16, 22, 22);
  const ios = appleTouch();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: ios ? 'default' : 'high-performance',
  });
  renderer.setPixelRatio(drawingRatio(window.innerWidth));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  parent.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.4, 4);
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.minDistance = 5;
  controls.maxDistance = 52;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };

  const fill = new THREE.AmbientLight(0xfff4e6, 0.34);
  scene.add(fill);
  const hemi = new THREE.HemisphereLight(0xd7e7ff, 0x3a2a22, 0.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d4, 0.2);
  sun.position.set(12, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -26;
  sun.shadow.camera.right = 26;
  sun.shadow.camera.top = 26;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.00045;
  scene.add(sun);
  const lanternLights = [[-7.4, 2.15, -5.2], [7.4, 2.15, -5.2], [-7.4, 2.15, 5.2], [7.4, 2.15, 5.2]].map(([x, y, z]) => {
    const light = new THREE.PointLight(0xffb15a, 0.2, 8, 2);
    light.position.set(x, y, z);
    scene.add(light);
    put(scene, sphere(0.14, 12, 10), basic('#ffc56a'), x, y, z);
    return light;
  });

  const skyDome = createSky();
  scene.add(skyDome.mesh);
  const waterMat = buildBasin(scene);
  buildGround(scene);
  const traffic = createBlock(scene);
  buildHall(scene);
  const harbourMats = buildHarbour(scene);
  const teapot = buildTeapot(scene);
  const neon = buildNeon(scene);
  buildCashier(scene);
  const tables = buildTables(scene);
  const kitchen = buildKitchen(scene);
  const alley = createAlley();
  const rice = createRiceStall();
  scene.add(alley.root, rice.root);
  const life = buildLife(scene);
  const carts = createCarts();
  scene.add(carts.root);
  const stars = buildStars(scene);

  const composerTarget = new THREE.WebGLRenderTarget(
    Math.floor(window.innerWidth * renderer.getPixelRatio()),
    Math.floor(window.innerHeight * renderer.getPixelRatio()),
    ios ? { type: THREE.HalfFloatType } : { samples: 4, type: THREE.HalfFloatType },
  );
  const composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.24, 0.38, 0.86);
  composer.addPass(bloom);

  const lookNow = { sun: 0.2, hemi: 0.3, lantern: 0.4, neon: 1, star: 0, harbour: 0.2 };
  const zenith = new THREE.Color('#5f9fd4');
  const horizon = new THREE.Color('#f0c9a4');
  const waterColor = new THREE.Color('#3f8eab');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const forward = new THREE.Vector3();
  let lastSession = null;
  const renderState = { plain: false };

  function resize() {
    const frame = renderer.domElement.parentElement;
    const width = Math.max(1, Math.round(frame?.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.round(frame?.clientHeight || window.innerHeight));
    const aspect = width / height;
    const wide = Math.max(0, aspect - 1.7);
    const narrow = width < 900;
    camera.aspect = aspect;
    camera.fov = narrow ? 46 : Math.max(24, 34 - wide * 10);
    camera.updateProjectionMatrix();
    const ratio = drawingRatio(width);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height);
    composer.setPixelRatio(ratio);
    bloom.strength = narrow ? 0.08 : 0.24;
    bloom.radius = narrow ? 0.22 : 0.38;
  }

  function overviewFrame() {
    const aspect = camera.aspect || (window.innerWidth / Math.max(1, window.innerHeight));
    const wide = Math.max(0, aspect - 1.7);
    const narrow = Math.max(0, 1 - aspect);
    const scale = (1 - Math.min(0.16, wide * 0.12)) * (1 + narrow * 0.42);
    return {
      position: new THREE.Vector3(16 * scale, 22 * scale, 22 * scale),
      target: new THREE.Vector3(0, 1.4, 4),
    };
  }

  function update(dt, motion, frame) {
    const preset = LOOK[frame.session.look] ?? LOOK.night;
    const blend = 1 - Math.exp(-Math.max(dt, 0.001) * 1.4);
    lookNow.sun += (preset.sun - lookNow.sun) * blend;
    lookNow.hemi += (preset.hemi - lookNow.hemi) * blend;
    lookNow.lantern += (preset.lantern - lookNow.lantern) * blend;
    lookNow.neon += (preset.neon - lookNow.neon) * blend;
    lookNow.star += (preset.star - lookNow.star) * blend;
    lookNow.harbour += (preset.harbour - lookNow.harbour) * blend;
    const sky = SKY[frame.session.look] ?? SKY.night;
    zenith.lerp(sky.zenith, blend);
    horizon.lerp(sky.horizon, blend);
    waterColor.lerp(sky.water, blend);
    const fogColor = horizon.clone().lerp(zenith, 0.62);
    skyDome.material.uniforms.uZenith.value.copy(zenith);
    skyDome.material.uniforms.uHorizon.value.copy(horizon);
    waterMat.color.copy(waterColor);
    scene.background.copy(fogColor);
    scene.fog.color.copy(fogColor);
    document.documentElement.style.backgroundColor = `#${fogColor.getHexString()}`;
    const day = ['prep', 'auction', 'morning', 'lunch', 'afternoon'].includes(frame.session.look);
    scene.fog.near = day ? 55 : 28;
    scene.fog.far = day ? 130 : 78;
    sun.intensity = lookNow.sun;
    hemi.intensity = lookNow.hemi;
    lanternLights.forEach((light) => {
      light.intensity = lookNow.lantern;
    });
    stars.material.opacity = lookNow.star;
    harbourMats.forEach((material) => {
      material.emissiveIntensity = 0.08 + lookNow.harbour * 0.95;
    });

    const { palette, view, session } = frame;
    const closed = session.summary === 'close' || session.id === 'night' || session.id === 'holiday';
    const lift = Math.max(-0.5, Math.min(0.5, (view.index.changePercent || 0) * 0.15));
    neon.group.position.set(0, 4.7 + lift, -1.8);
    const flicker = (view.index.changePercent || 0) <= -2 ? 0.55 + Math.abs(Math.sin(performance.now() / 70)) * 0.45 : 1;
    neon.light.intensity = lookNow.neon * flicker;
    neon.light.color.set(palette[tone(view.index.changePercent)]);
    neon.board.redraw(
      `${view.index.price}|${view.index.changePercent}|${palette.mode}`,
      (ctx, w, h) => drawNeon(ctx, w, h, view.index, palette),
    );

    const heat = Math.max(0.35, Math.min(1.6, ((view.index.turnover || 0) - 8e10) / 1.4e11));
    const pour = closed ? 0.4 : heat;
    const wave = (performance.now() / (closed ? 1400 : 700)) % 1;
    teapot.stream.position.set(0.52 + wave * 0.32, 1.02 - wave * 0.48, 0.02);
    teapot.stream.scale.set(0.55 + pour * 0.35, 0.45 + pour * 0.7, 0.55 + pour * 0.35);
    teapot.lid.position.y = 1.02 + Math.sin(performance.now() / 800) * 0.018;
    teapot.steam.seeds.forEach((seed, index) => {
      teapot.steam.seeds[index] = (seed + (motion || 0.004) * (0.25 + pour * 0.8)) % 1;
      const slot = index * 3;
      teapot.steam.positions[slot] = Math.cos(index) * 0.12;
      teapot.steam.positions[slot + 1] = 1.25 + teapot.steam.seeds[index] * (0.35 + pour * 0.45);
      teapot.steam.positions[slot + 2] = Math.sin(index) * 0.12;
    });
    teapot.steam.geometry.attributes.position.needsUpdate = true;
    teapot.plaque.redraw(`pot|${Math.round(view.index.turnover || 0)}`, (ctx, w, h) => {
      drawNote(ctx, w, h, ['大市成交', formatTurnover(view.index.turnover)]);
    });

    const notice = session.countdown
      ? { title: session.title, label: session.countdown.label, value: session.countdown.text }
      : { title: session.title, label: '香港時間', value: session.clock };
    life.board.redraw(`${notice.title}|${notice.label}|${notice.value}`, (ctx, w, h) => drawSession(ctx, w, h, notice));

    tables.forEach((table, index) => {
      const stock = view.stocks[index];
      if (!stock) return;
      table.ring.color.set(palette[tone(stock.changePercent)]);
      table.plateBoard.redraw(
        `${stock.symbol}|${stock.price}|${stock.change}|${stock.changePercent}|${palette.mode}`,
        (ctx, w, h) => drawPrice(ctx, w, h, stock, palette),
      );
      table.plate.lookAt(camera.position);
      placePeople(table, stock.guests, stock.guestsRight, closed, performance.now() / 1000);
      updateSteam(table, stock.steam, motion, session.id);
    });

    kitchen.seeds.forEach((seed, index) => {
      kitchen.seeds[index] = (seed + motion * (session.id === 'prep' ? 0.5 : 0.08)) % 1;
      kitchen.positions[index * 3] = Math.cos(index) * 0.2;
      kitchen.positions[index * 3 + 1] = 1 + kitchen.seeds[index] * 0.8;
      kitchen.positions[index * 3 + 2] = Math.sin(index) * 0.2;
    });
    kitchen.geometry.attributes.position.needsUpdate = true;

    alley.setCounts(view.alley.people, view.alley.bowls);
    rice.setCrowd(view.rice.seated, view.rice.queue);
    const turnover = view.index.turnover || 0;
    const low = Math.log10(5e10);
    const high = Math.log10(4e11);
    const span = high - low;
    const ratio = span <= 0 ? 0.5 : Math.min(1, Math.max(0, (Math.log10(Math.max(turnover, 1)) - low) / span));
    const carCount = 2 + Math.round(ratio * 6);
    const walkerCount = 3 + Math.round(ratio * 5);
    life.update(motion, closed, walkerCount);
    traffic.update(motion || dt * 0.35, carCount);
    carts.update(motion, { ...view, session }, dt);
    lastSession = session;
  }

  function pick(x, y) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((x - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((y - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object) {
        if (object.userData?.pick) return object.userData.pick;
        object = object.parent;
      }
    }
    return null;
  }

  function project(object) {
    object.getWorldPosition(projected);
    camera.getWorldDirection(forward);
    const inFront = projected.clone().sub(camera.position).dot(forward) > 0.2;
    projected.project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
      visible: inFront && projected.z < 1,
    };
  }

  resize();
  const framed = overviewFrame();
  camera.position.copy(framed.position);
  controls.target.copy(framed.target);

  return {
    camera,
    controls,
    resize,
    update,
    render() {
      const context = renderer.getContext();
      if (context?.isContextLost?.()) throw new Error('WebGL context lost');
      if (renderState.plain) {
        renderer.render(scene, camera);
        return;
      }
      try {
        composer.render();
      } catch (error) {
        renderState.plain = true;
        renderer.render(scene, camera);
      }
    },
    pick,
    project,
    pose: tablePose,
    overviewFrame,
    consumeBell: () => carts.consumeBell(),
    bubbles() {
      return carts.bubbles().map((item) => {
        if (item.id !== 'anomaly' && lastSession?.carts === 'park') return { ...item, show: false };
        return item;
      });
    },
  };
}
