import { getUniverse, resetUniverse as clearUniverse, setUniverse, stockFromCode } from './config/stocks.js';
import { paletteOf } from './config/palette.js';
import { effectiveSession, hkParts } from './config/sessions.js';
import { fetchMarket } from './services/market.js';
import { presentMarket } from './services/present.js';
import { createWorld } from './scene/teaHouse.js';
import { createHud } from './ui/hud.js';

const loading = document.querySelector('#loading');
const hud = createHud(document.querySelector('#hud'));
let world;
try {
  world = createWorld(document.querySelector('#scene'));
} catch (error) {
  loading.textContent = `畫面啟動失敗：${error.message}`;
  throw error;
}

let raw = null;
let biasMs = 0;
let simMs = 0;
let frozen = null;
let speed = 1;
let paletteMode = 'intl';
let autoLight = true;
let forceLook = 'night';
let sound = false;
let test = null;
let focus = -1;
let zone = 'hall';
let rankMode = 'turnover';
let panel = { type: 'index' };
let glide = 0;
let audioCtx = null;
let displayMode = new URLSearchParams(window.location.search).has('display');
let revealAdmin = false;
let riceClicks = 0;
let idle = 0;
let touring = false;
let tourIndex = 0;
let tourHold = 0;
let showDetail = false;
let tourReady = false;

const aimPos = world.camera.position.clone();
const aimTarget = world.controls.target.clone();

function viewDate() {
  if (frozen != null) return new Date(frozen);
  return new Date(Date.now() + biasMs + simMs);
}

function scrubbing() {
  return frozen != null || Math.abs(biasMs + simMs) > 15000 || speed !== 1;
}

function aim() {
  if (zone === 'alley') {
    aimPos.set(-12.2, 6.2, 2.5);
    aimTarget.set(-15, 1.6, -6.5);
  } else if (zone === 'rice') {
    aimPos.set(-14.6, 4.2, 12.4);
    aimTarget.set(-14.6, 1.9, 5.4);
  } else if (zone === 'sign') {
    aimPos.set(1.6, 7.2, 3.4);
    aimTarget.set(0, 4.7, -1.6);
  } else if (focus >= 0) {
    const pose = world.pose(focus);
    aimPos.set(pose.x + 3.4, 4.6, pose.z + 3.4);
    aimTarget.set(pose.x, 1.35, pose.z);
  } else {
    const framed = world.overviewFrame();
    aimPos.copy(framed.position);
    aimTarget.copy(framed.target);
  }
  glide = 0.85;
}

function noteActivity() {
  idle = 0;
  if (touring) {
    touring = false;
    tourReady = false;
    showDetail = false;
  }
}

function tourStops(view) {
  const framed = world.overviewFrame();
  const stocks = view?.stocks ?? [];
  const byTurnover = [...stocks].sort((a, b) => (b.turnover || 0) - (a.turnover || 0))[0];
  const byMove = [...stocks].sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0))[0];
  const stockStop = (stock) => {
    if (!stock) return { pos: framed.position.toArray(), target: framed.target.toArray(), panel: null };
    const index = stocks.indexOf(stock);
    const pose = world.pose(Math.max(0, index));
    return {
      pos: [pose.x + 3.4, 4.8, pose.z + 3.4],
      target: [pose.x, 1.35, pose.z],
      panel: { type: 'stock', index },
    };
  };
  return [
    { pos: framed.position.toArray(), target: framed.target.toArray(), panel: null },
    { pos: [0.4, 8.2, 16.5], target: [0, 1.5, 7.6], panel: null },
    { pos: [4.2, 6.2, 5.8], target: [0, 1.5, 0], panel: { type: 'index' } },
    stockStop(byTurnover),
    stockStop(byMove),
    { pos: [24, 9.5, 9], target: [17.6, 1.2, 0], panel: null },
  ];
}

function goTour(view) {
  const stop = tourStops(view)[tourIndex];
  aimPos.set(stop.pos[0], stop.pos[1], stop.pos[2]);
  aimTarget.set(stop.target[0], stop.target[1], stop.target[2]);
  glide = 1.2;
  if (stop.panel?.type === 'stock') {
    focus = stop.panel.index;
    zone = 'hall';
    panel = stop.panel;
    showDetail = true;
  } else if (stop.panel?.type === 'index') {
    focus = -1;
    zone = 'hall';
    panel = { type: 'index' };
    showDetail = true;
  } else {
    focus = -1;
    zone = 'hall';
    showDetail = false;
  }
}

function step(direction) {
  noteActivity();
  zone = 'hall';
  focus = (focus + direction + getUniverse().length) % getUniverse().length;
  panel = { type: 'stock', index: focus };
  showDetail = true;
  aim();
}

function togglePause() {
  if (frozen == null) frozen = Date.now() + biasMs + simMs;
  else {
    const target = frozen;
    frozen = null;
    biasMs = target - Date.now() - simMs;
  }
}

function lookForClock(date) {
  const minutes = hkParts(date).minutesOfDay;
  if (minutes < 6 * 60 || minutes >= 19 * 60 + 30) return 'night';
  if (minutes < 11 * 60) return 'morning';
  return 'afternoon';
}

function toggleDisplay() {
  displayMode = !displayMode;
  if (!displayMode) {
    touring = false;
    tourReady = false;
    idle = 0;
    showDetail = false;
  }
}

function toggleTour() {
  if (touring) {
    touring = false;
    tourReady = false;
    idle = 0;
    showDetail = false;
    return;
  }
  touring = true;
  tourReady = false;
  tourIndex = 0;
  tourHold = 0;
  idle = 0;
}

function toggleLight() {
  if (autoLight) {
    autoLight = false;
    forceLook = 'night';
  } else if (forceLook === 'night') forceLook = 'morning';
  else autoLight = true;
}

function chime() {
  if (!sound) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx ??= new Ctx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(780, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(480, audioCtx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.42);
}

hud.bind({
  prev: () => step(-1),
  next: () => step(1),
  overview() {
    noteActivity();
    zone = 'hall';
    focus = -1;
    panel = { type: 'index' };
    aim();
  },
  alley() {
    noteActivity();
    zone = 'alley';
    focus = -1;
    panel = { type: 'alley' };
    aim();
  },
  rice() {
    noteActivity();
    zone = 'rice';
    focus = -1;
    panel = { type: 'rice' };
    aim();
  },
  toggleDisplay,
  toggleTour,
  pause: togglePause,
  sync() {
    biasMs = 0;
    simMs = 0;
    frozen = null;
    speed = 1;
  },
  light: toggleLight,
  palette() {
    paletteMode = paletteMode === 'hk' ? 'intl' : 'hk';
  },
  sound() {
    sound = !sound;
    if (sound) chime();
  },
  testDrop() {
    test = { ...(test ?? {}), drop: true };
  },
  testAnomaly() {
    test = { ...(test ?? {}), anomaly: true };
  },
  clearTest() {
    test = null;
  },
  setSpeed(value) { speed = value; },
  nudgeHour(hours) {
    const delta = hours * 3600000;
    if (frozen != null) frozen += delta;
    else biasMs += delta;
  },
  setRank(value) { rankMode = value; },
  focusStock(index) {
    noteActivity();
    focus = index;
    zone = 'hall';
    panel = { type: 'stock', index };
    showDetail = true;
    aim();
  },
  addStock(raw) {
    const stock = stockFromCode(raw);
    const list = getUniverse();
    if (!stock || list.some((item) => item.symbol === stock.symbol) || list.length >= 15) return;
    setUniverse([...list, stock]);
    window.location.reload();
  },
  removeStock(symbol) {
    const list = getUniverse().filter((stock) => stock.symbol !== symbol);
    if (!list.length) return;
    setUniverse(list);
    window.location.reload();
  },
  resetUniverse() {
    clearUniverse();
    window.location.reload();
  },
});

window.addEventListener('keydown', (event) => {
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  else if (event.key === ' ') { event.preventDefault(); togglePause(); }
  else if (event.key === '-' || event.key === '_') nudgeHourKey(-1);
  else if (event.key === '=' || event.key === '+') nudgeHourKey(1);
  else if (key === 'd') toggleDisplay();
  else if (key === 'n') toggleLight();
  else if (key === 'c') { noteActivity(); zone = 'hall'; focus = -1; panel = { type: 'index' }; aim(); }
  else if (key === 'p') { noteActivity(); zone = 'alley'; focus = -1; panel = { type: 'alley' }; aim(); }
  else if (key === 's') { noteActivity(); zone = 'rice'; focus = -1; panel = { type: 'rice' }; aim(); }
  else if (key === '1') speed = 1;
  else if (key === '2') speed = 10;
  else if (key === '3') speed = 30;
  else if (key === '4') speed = 60;
});

function nudgeHourKey(hours) {
  const delta = hours * 3600000;
  if (frozen != null) frozen += delta;
  else biasMs += delta;
}

let dragged = false;
const canvas = world.controls.domElement;
canvas.addEventListener('pointerdown', () => {
  dragged = false;
  noteActivity();
});
canvas.addEventListener('pointermove', (event) => {
  if (event.buttons === 0) return;
  if (Math.abs(event.movementX) + Math.abs(event.movementY) > 4) {
    dragged = true;
    noteActivity();
  }
});
canvas.addEventListener('click', (event) => {
  if (dragged || event.button !== 0) return;
  const hit = world.pick(event.clientX, event.clientY);
  if (hit?.type === 'rice-sign') {
    riceClicks += 1;
    if (riceClicks >= 5) {
      revealAdmin = !revealAdmin;
      riceClicks = 0;
    }
    return;
  }
  riceClicks = 0;
  if (!hit) return;
  noteActivity();
  if (hit.type === 'stock' || hit.type === 'reader') {
    hud.showQuote();
    focus = hit.index;
    zone = 'hall';
    panel = { type: 'stock', index: hit.index };
    showDetail = true;
    aim();
  } else if (hit.type === 'cashier' || hit.type === 'index') {
    focus = -1;
    zone = hit.type === 'index' ? 'sign' : 'hall';
    panel = { type: 'index' };
    showDetail = true;
    aim();
  } else if (hit.type === 'cart') {
    panel = { type: 'cart', id: hit.id };
    showDetail = true;
  }
});
world.controls.addEventListener('start', () => {
  glide = 0;
  noteActivity();
});
function onResize() {
  world.resize();
  if (!touring && zone === 'hall' && focus < 0) aim();
}
window.addEventListener('resize', onResize);
window.visualViewport?.addEventListener('resize', onResize);

async function refresh() {
  raw = await fetchMarket();
}
refresh();
setInterval(refresh, 60_000);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (raw) {
    if (frozen == null && speed !== 1) simMs += dt * (speed - 1) * 1000;
    const date = viewDate();
    const scrub = scrubbing();
    const session = effectiveSession(date, raw.status?.state, scrub);
    const visual = autoLight
      ? { ...session, look: lookForClock(date) }
      : { ...session, look: forceLook };
    const view = presentMarket(raw, { date, scrubbing: scrub, test });
    const motion = frozen == null ? dt * speed : 0;
    world.update(dt, motion, { view, session: visual, palette: paletteOf(paletteMode) });
    if (touring) {
      if (!tourReady) {
        tourReady = true;
        tourHold = 0;
        goTour(view);
      } else {
        tourHold += dt;
        if (tourHold >= 12) {
          tourHold = 0;
          tourIndex = (tourIndex + 1) % tourStops(view).length;
          goTour(view);
        }
      }
    } else if (displayMode) {
      idle += dt;
      if (idle >= 15) {
        touring = true;
        tourReady = true;
        tourIndex = 0;
        tourHold = 0;
        goTour(view);
      }
    }
    if (glide > 0) {
      const blend = Math.min(1, dt * 2.8);
      world.camera.position.lerp(aimPos, blend);
      world.controls.target.lerp(aimTarget, blend);
      glide -= dt;
    }
    world.controls.update();
    world.render();
    if (world.consumeBell()) chime();
    hud.setBubbles(world.bubbles().map((item) => {
      const pos = world.project(item.object);
      return { ...item, x: pos.x, y: pos.y, visible: pos.visible };
    }));
    hud.render({
      view,
      session,
      palette: paletteOf(paletteMode),
      paused: frozen != null,
      speed,
      autoLight,
      forceLook,
      sound,
      focus,
      zone,
      panel,
      rankMode,
      display: displayMode,
      touring,
      revealAdmin,
      showDetail: displayMode ? showDetail : true,
    });
    if (!loading.classList.contains('hide')) loading.classList.add('hide');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
