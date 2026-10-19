import * as THREE from 'three';
import { box, lambert, put, sphere } from './geom.js';

const SHIRTS = ['#d4544a', '#3e6b4c', '#d7a441', '#3d568a', '#8a4d62', '#6a4a34', '#c56b38', '#2f6d70'];
const skin = lambert('#f0c7a4');
const hairMat = lambert('#2b211c');
const shoeMat = lambert('#2a2420');
const apronMat = lambert('#f4efe4');
const legMat = lambert('#3e4450');
const cuff = lambert('#f7f1e4');
const legGeo = box(0.07, 0.14, 0.07);
const shinGeo = box(0.06, 0.12, 0.06);
const armGeo = box(0.055, 0.12, 0.055);
const forearmGeo = box(0.045, 0.1, 0.045);
const shoeGeo = box(0.08, 0.04, 0.1);
const handGeo = box(0.04, 0.04, 0.04);

function limb(parts, y) {
  const pivot = new THREE.Group();
  pivot.position.y = y;
  parts.forEach(([geometry, material, py]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = py;
    pivot.add(mesh);
  });
  return pivot;
}

export function createPerson(index = 0, shirt, options = {}) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const cloth = lambert(shirt || SHIRTS[index % SHIRTS.length]);
  const hairColor = options.apron ? hairMat : lambert(index % 5 === 0 ? '#6a4a32' : '#241c18');

  const leftLeg = limb([
    [legGeo, legMat, -0.09],
    [shinGeo, legMat, -0.2],
    [shoeGeo, shoeMat, -0.28],
  ], 0.34);
  const rightLeg = limb([
    [legGeo, legMat, -0.09],
    [shinGeo, legMat, -0.2],
    [shoeGeo, shoeMat, -0.28],
  ], 0.34);
  leftLeg.position.x = -0.05;
  rightLeg.position.x = 0.05;
  rig.add(leftLeg, rightLeg);

  put(rig, box(0.16, 0.12, 0.1), cloth, 0, 0.5, 0);
  put(rig, box(0.15, 0.08, 0.09), legMat, 0, 0.38, 0);
  put(rig, box(0.12, 0.03, 0.11), cuff, 0, 0.57, 0);
  if (options.apron) {
    put(rig, box(0.13, 0.1, 0.02), apronMat, 0, 0.46, 0.06);
  }

  const leftArm = limb([
    [armGeo, cloth, -0.07],
    [forearmGeo, skin, -0.16],
    [handGeo, skin, -0.22],
  ], 0.56);
  const rightArm = limb([
    [armGeo, cloth, -0.07],
    [forearmGeo, skin, -0.16],
    [handGeo, skin, -0.22],
  ], 0.56);
  leftArm.position.x = -0.12;
  rightArm.position.x = 0.12;
  rig.add(leftArm, rightArm);

  put(rig, box(0.11, 0.11, 0.11), skin, 0, 0.7, 0);
  put(rig, box(0.12, 0.04, 0.12), hairColor, 0, 0.77, -0.01);
  put(rig, sphere(0.03, 8, 6), hairColor, -0.065, 0.71, 0);
  put(rig, sphere(0.03, 8, 6), hairColor, 0.065, 0.71, 0);
  put(rig, sphere(0.016, 6, 6), skin, 0, 0.68, 0.06);
  const eye = lambert('#241c18');
  put(rig, sphere(0.012, 6, 6), eye, -0.028, 0.72, 0.055);
  put(rig, sphere(0.012, 6, 6), eye, 0.028, 0.72, 0.055);

  group.userData.rig = rig;
  group.userData.legs = [leftLeg, rightLeg];
  group.userData.arms = [leftArm, rightArm];
  return group;
}

export function poseSit(person) {
  const { legs, rig } = person.userData;
  if (!legs || !rig) return;
  legs[0].rotation.x = -1.25;
  legs[1].rotation.x = -1.25;
  rig.position.y = -0.08;
}

export function posePhone(person) {
  const { arms } = person.userData;
  if (!arms) return;
  arms[1].rotation.x = -1.15;
  arms[1].rotation.z = -0.25;
  put(person, box(0.04, 0.06, 0.012), lambert('#1c1c1c'), 0.14, 0.48, 0.07);
}

export function givePaper(person) {
  const paper = put(person, box(0.16, 0.1, 0.012), lambert('#f7f4ea'), 0, 0.42, 0.1);
  paper.rotation.x = -0.7;
}

export function idlePerson(person, time) {
  const { rig } = person.userData;
  if (!rig) return;
  rig.rotation.z = Math.sin(time * 1.5) * 0.04;
}

export function walkPerson(person, time, moving = true) {
  const swing = moving ? Math.sin(time * 7.5) * 0.55 : 0;
  const { legs, arms, rig } = person.userData;
  if (!legs || !arms || !rig) return;
  legs[0].rotation.x = swing;
  legs[1].rotation.x = -swing;
  arms[0].rotation.x = -swing * 0.7;
  arms[1].rotation.x = swing * 0.7;
  rig.position.y = moving ? Math.abs(Math.sin(time * 7.5)) * 0.035 : 0;
}

export function createReader(index = 0) {
  const group = createPerson(index, '#f7f1e4');
  const paper = put(group, box(0.16, 0.1, 0.012), lambert('#f7f4ea'), 0, 0.46, 0.12);
  paper.rotation.x = -0.45;
  group.userData.reader = true;
  return group;
}
