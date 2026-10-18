import { formatPct, formatPrice, formatTurnover, formatVolume, sourceLabel, tone } from '../services/format.js';

const SPEEDS = [1, 10, 30, 60];

export function createHud(root) {
  root.innerHTML = `
    <section class="panel top-card" id="top-card"></section>
    <section class="panel rank" id="rank"></section>
    <section class="panel detail" id="detail"></section>
    <section class="panel controls" id="controls"></section>
    <div class="stage" id="stage">
      <button data-action="toggleDisplay" type="button">展覽介面</button>
      <button data-action="toggleTour" type="button">巡遊</button>
    </div>
    <div class="banner" id="banner"></div>
    <div class="ticker" id="ticker" hidden></div>
    <div class="bubbles" id="bubbles"></div>
  `;
  const bubbles = new Map();
  ['gain', 'loss', 'turnover', 'anomaly'].forEach((id) => {
    const node = document.createElement('div');
    node.className = `bubble bubble-${id}`;
    root.querySelector('#bubbles').appendChild(node);
    bubbles.set(id, node);
  });

  const controls = root.querySelector('#controls');
  controls.innerHTML = `
    <div class="row">
      <button data-action="prev">上一籠</button>
      <button data-action="next">下一籠</button>
      <button data-action="overview">全景</button>
      <button data-action="alley">後巷</button>
      <button data-action="rice">大家樂</button>
    </div>
    <div class="row">
      <button data-action="pause">暫停</button>
      ${SPEEDS.map((speed) => `<button data-action="speed" data-value="${speed}">${speed}×</button>`).join('')}
    </div>
    <div class="row">
      <button data-action="hour" data-value="-1">−1h</button>
      <button data-action="hour" data-value="1">+1h</button>
      <button data-action="sync">同步香港時間</button>
      <button data-action="light">日夜</button>
    </div>
    <div class="row">
      <button data-action="palette">紅升綠跌</button>
      <button data-action="sound">聲音關</button>
    </div>
    <p class="keys">← → 換籠　P 後巷　S 大家樂　空白鍵 暫停　1–4 速度　− = 調時間　N 日夜　C 全景</p>
  `;

  function bind(actions) {
    root.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'speed') actions.setSpeed(Number(button.dataset.value));
      else if (action === 'hour') actions.nudgeHour(Number(button.dataset.value));
      else if (action === 'rank') actions.setRank(button.dataset.value);
      else if (action === 'stock') actions.focusStock(Number(button.dataset.value));
      else if (action === 'addStock') actions.addStock(root.querySelector('#universe-code')?.value);
      else if (action === 'removeStock') actions.removeStock(button.dataset.value);
      else actions[action]?.();
    });
  }

  function setHtml(node, html) {
    if (node.dataset.markup === html) return;
    node.dataset.markup = html;
    node.innerHTML = html;
  }

  function render(state) {
    const { palette } = state;
    document.body.dataset.palette = palette.mode;
    document.documentElement.style.setProperty('--up', palette.up);
    document.documentElement.style.setProperty('--down', palette.down);
    document.body.classList.toggle('display', Boolean(state.display));
    document.body.classList.toggle('admin', Boolean(state.revealAdmin));
    document.body.classList.toggle('show-detail', Boolean(state.showDetail));
    setHtml(root.querySelector('#top-card'), topHtml(state));
    setHtml(root.querySelector('#rank'), rankHtml(state));
    setHtml(root.querySelector('#detail'), state.showDetail || !state.display ? detailHtml(state) : '');
    const ticker = root.querySelector('#ticker');
    const tickerMarkup = tickerHtml(state);
    if (ticker.dataset.markup !== tickerMarkup) {
      ticker.dataset.markup = tickerMarkup;
      ticker.innerHTML = tickerMarkup;
    }
    ticker.hidden = !state.display || !tickerMarkup;
    const banner = root.querySelector('#banner');
    const bannerMarkup = bannerHtml(state);
    if (banner.dataset.markup !== bannerMarkup) {
      banner.dataset.markup = bannerMarkup;
      banner.innerHTML = bannerMarkup;
    }
    banner.hidden = !bannerMarkup;

    controls.querySelector('[data-action="pause"]').classList.toggle('active', state.paused);
    controls.querySelector('[data-action="pause"]').textContent = state.paused ? '繼續' : '暫停';
    controls.querySelectorAll('[data-action="speed"]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.value) === state.speed);
    });
    controls.querySelector('[data-action="palette"]').textContent = palette.mode === 'hk' ? '紅升綠跌' : '綠升紅跌';
    controls.querySelector('[data-action="sound"]').textContent = state.sound ? '聲音開' : '聲音關';
    controls.querySelector('[data-action="light"]').textContent = state.autoLight
      ? '自動日夜'
      : (state.forceLook === 'night' ? '固定夜晚' : '固定白天');
    controls.querySelector('[data-action="alley"]').classList.toggle('active', state.zone === 'alley');
    controls.querySelector('[data-action="rice"]').classList.toggle('active', state.zone === 'rice');
    controls.querySelector('[data-action="overview"]').classList.toggle('active', state.zone === 'hall' && state.focus < 0);
    const displayButton = root.querySelector('[data-action="toggleDisplay"]');
    displayButton.classList.toggle('active', Boolean(state.display));
    displayButton.textContent = state.display ? '退出展覽' : '展覽介面';
    const tourButton = root.querySelector('[data-action="toggleTour"]');
    tourButton.classList.toggle('active', Boolean(state.touring));
    tourButton.textContent = state.touring ? '停止巡遊' : '巡遊';
  }

  function setBubbles(items) {
    items.forEach((item) => {
      const node = bubbles.get(item.id);
      if (!node) return;
      node.textContent = item.text || '';
      node.hidden = !item.show || !item.visible;
      node.style.left = `${item.x}px`;
      node.style.top = `${item.y}px`;
    });
  }

  return { bind, render, setBubbles };
}

function tickerHtml(state) {
  const stocks = state.view?.stocks ?? [];
  if (!stocks.length) return '';
  const stock = stocks[Math.floor(Date.now() / 2500) % stocks.length];
  const mood = tone(stock.changePercent);
  const change = Number.isFinite(stock.change) ? `${stock.change > 0 ? '+' : ''}${formatPrice(stock.change)}` : '—';
  return `<span>${stock.symbol} ${stock.short}</span><b class="${mood}">${change}　${formatPct(stock.changePercent)}</b>`;
}

function moneyLine(stock) {
  const mood = tone(stock.changePercent);
  return `<b class="${mood}">${formatPrice(stock.price)} ${formatPct(stock.changePercent)}</b>`;
}

function topHtml(state) {
  const { view, session } = state;
  return `
    <p class="eyebrow">${session.clock}　${session.title}</p>
    <h1>恆指大茶樓</h1>
    <p class="legend">每籠一隻精選港股。每桌一大籠，成交越大蒸氣越密，茶客人數也跟着變，不是真實茶客，也不是買賣盤。</p>
    <p class="index-line ${tone(view.index.changePercent)}">${formatPrice(view.index.price, true)}　${formatPct(view.index.changePercent)}</p>
    <p>大市成交 ${formatTurnover(view.index.turnover)}</p>
    <p class="meta">${sourceLabel(view.source)}${view.testNote ? `　${view.testNote}` : ''}${view.replay ? '　分時回放' : ''}　${view.index.time || ''}</p>
  `;
}

function rankHtml(state) {
  const { view, focus, rankMode } = state;
  const rows = rankMode === 'gainers'
    ? [...view.stocks].sort((a, b) => b.changePercent - a.changePercent)
    : rankMode === 'losers'
      ? [...view.stocks].sort((a, b) => a.changePercent - b.changePercent)
      : view.rankings.all;
  return `
    <div class="row tight">
      <button data-action="rank" data-value="turnover" class="${rankMode === 'turnover' ? 'active' : ''}">成交</button>
      <button data-action="rank" data-value="gainers" class="${rankMode === 'gainers' ? 'active' : ''}">上升</button>
      <button data-action="rank" data-value="losers" class="${rankMode === 'losers' ? 'active' : ''}">下跌</button>
    </div>
    <p class="meta">精選 ${view.stocks.length} 隻，最多 15 隻</p>
    <ol>
      ${rows.map((stock) => {
        const index = view.stocks.indexOf(stock);
        return `<li><button data-action="stock" data-value="${index}" class="${index === focus ? 'active' : ''}"><span>${stock.symbol} ${stock.short}</span>${moneyLine(stock)}</button><button data-action="removeStock" data-value="${stock.symbol}" type="button" aria-label="移除">X</button></li>`;
      }).join('')}
    </ol>
    <div class="row universe">
      <input id="universe-code" maxlength="5" inputmode="numeric" placeholder="代號" aria-label="股票代號" />
      <button data-action="addStock" type="button">加入</button>
      <button data-action="resetUniverse" type="button">恢復預設</button>
    </div>
    <details>
      <summary>測試</summary>
      <div class="row">
        <button data-action="testDrop">恆指跌 3%</button>
        <button data-action="testAnomaly">派出異動車</button>
        <button data-action="clearTest">恢復報價</button>
      </div>
    </details>
  `;
}

function detailHtml(state) {
  const { view, panel, session } = state;
  if (panel.type === 'alley') {
    return `<h2>後巷洗大餅</h2><p>下跌的精選股愈多、恆指跌得愈深，洗碗抵茶錢的人和碗疊就愈多。而家 ${view.alley.people} 人、${view.alley.bowls} 疊碗。</p><p class="meta">虛構幽默，不構成投資建議。</p>`;
  }
  if (panel.type === 'rice') {
    return `<h2>大家樂</h2><p>恆指下跌時，店裡先坐滿，門口再排隊。而家 ${view.rice.queue} 人。</p><p class="meta">虛構幽默，不構成投資建議。</p>`;
  }
  if (panel.type === 'cart') {
    const rankKey = { gain: 'gainers', loss: 'losers', turnover: 'turnover' }[panel.id];
    const list = rankKey ? view.rankings[rankKey] : [];
    const title = { gain: '新鮮出爐', loss: '大特價', turnover: '巨額成交', anomaly: '異動' }[panel.id];
    const body = panel.id === 'anomaly'
      ? (view.anomalies.map((item) => `<li>${item.text}</li>`).join('') || '<li>暫時沒有異動</li>')
      : list.map((stock) => `<li>${stock.symbol} ${stock.short}　${formatPrice(stock.price)}　${formatPct(stock.changePercent)}　${formatTurnover(stock.turnover)}</li>`).join('');
    return `<h2>${title}</h2><ul>${body}</ul><p class="meta">榜單只計茶樓這 ${view.stocks.length} 隻。</p>`;
  }
  if (panel.type === 'stock') {
    const stock = view.stocks[panel.index];
    if (!stock) return '';
    return `
      <p class="meta">${stock.blurb}　${stock.sector}</p>
      <h2>${stock.short} <span>${stock.symbol}</span></h2>
      <p class="index-line ${tone(stock.changePercent)}">${formatPrice(stock.price)}　${formatPct(stock.changePercent)}</p>
      <p class="meta">當日分時股價</p>
      ${minuteChart(stock.minutes)}
      <p class="meta">近 30 日股價與成交額</p>
      ${historyChart(stock.history)}
      <dl>
        <div><dt>成交額</dt><dd>${formatTurnover(stock.turnover)}</dd></div>
        <div><dt>成交量</dt><dd>${formatVolume(stock.volume)}</dd></div>
        <div><dt>開／高／低</dt><dd>${formatPrice(stock.open)}／${formatPrice(stock.high)}／${formatPrice(stock.low)}</dd></div>
      </dl>
      <p class="meta">資料可能延遲，不構成投資建議。</p>
    `;
  }
  const breadth = view.breadth;
  const sectors = view.sectors.slice(0, 3).map((item) => `${item.sector} ${formatTurnover(item.turnover)}`).join('　');
  return `
    <h2>大市</h2>
    <p class="index-line ${tone(view.index.changePercent)}">${formatPrice(view.index.price, true)}　${formatPct(view.index.changePercent)}</p>
    <dl>
      <div><dt>開／高／低</dt><dd>${formatPrice(view.index.open, true)}／${formatPrice(view.index.high, true)}／${formatPrice(view.index.low, true)}</dd></div>
      <div><dt>大市成交</dt><dd>${formatTurnover(view.index.turnover)}</dd></div>
      ${breadth ? `<div><dt>升／平／跌</dt><dd>${breadth.up}／${breadth.flat}／${breadth.down}</dd></div>` : ''}
    </dl>
    <p class="meta">當日分時股價</p>
    ${minuteChart(view.index.minutes)}
    <p class="meta">近 30 日股價與成交額</p>
    ${historyChart(view.index.history)}
    <p>${session.summary === 'half' ? '半日摘要。延續早市期間一般未對盤。' : session.summary === 'close' ? '收市結算。精選股裡成交較多的板塊：' : '精選股板塊：'} ${sectors}</p>
    <p class="meta">${view.testNote?.includes('下跌') ? `測試時的升跌家數只計這 ${view.stocks.length} 隻。` : '升跌家數來自報價源的恆指統計。'} 不構成投資建議。</p>
  `;
}

function clockMinutes(hhmm) {
  const text = String(hhmm).padStart(4, '0');
  return Number(text.slice(0, 2)) * 60 + Number(text.slice(2));
}

function shortDate(date) {
  const text = String(date ?? '');
  const matched = text.match(/(\d{2})-(\d{2})$/);
  if (matched) return `${matched[1]}/${matched[2]}`;
  if (/^\d{8}$/.test(text)) return `${text.slice(4, 6)}/${text.slice(6)}`;
  return text.slice(-5);
}

function minuteChart(minutes) {
  const openMin = 9 * 60 + 30;
  const closeMin = 16 * 60;
  const series = (minutes?.points ?? [])
    .filter((point) => Number.isFinite(point[1]))
    .map((point) => ({ minute: clockMinutes(point[0]), price: point[1] }))
    .filter((point) => point.minute >= openMin - 15 && point.minute <= closeMin + 20);
  if (series.length < 2) return '<p class="meta">沒有當日分時</p>';
  const width = 320;
  const height = 96;
  const xOf = (minute) => 8 + Math.min(1, Math.max(0, (minute - openMin) / (closeMin - openMin))) * (width - 16);
  const prices = series.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(0.01, max - min);
  const yOf = (price) => 8 + (1 - (price - min) / span) * 62;
  const path = series.map((point, index) => {
    const broken = index > 0 && point.minute - series[index - 1].minute > 20;
    return `${index === 0 || broken ? 'M' : 'L'}${xOf(point.minute).toFixed(1)},${yOf(point.price).toFixed(1)}`;
  }).join(' ');
  const last = series[series.length - 1];
  const direction = last.price >= series[0].price ? 'up' : 'down';
  const ticks = [[openMin, '09:30', 'start'], [12 * 60, '12:00', 'middle'], [closeMin, '16:00', 'end']];
  const labels = ticks.map(([minute, label, anchor]) => `<text x="${xOf(minute).toFixed(1)}" y="90" text-anchor="${anchor}">${label}</text>`).join('');
  const dotX = xOf(last.minute).toFixed(1);
  const dotY = yOf(last.price).toFixed(1);
  return `<svg class="spark minute" viewBox="0 0 ${width} ${height}" role="img" aria-label="當日分時股價"><line class="axis" x1="8" y1="74" x2="${width - 8}" y2="74" />${labels}<path class="${direction}" d="${path}" /><circle class="halo ${direction}" cx="${dotX}" cy="${dotY}" r="6.5" /><circle class="now ${direction}" cx="${dotX}" cy="${dotY}" r="3.2" /></svg>`;
}

function historyChart(history = []) {
  const bars = history.filter((bar) => Number.isFinite(bar?.close));
  if (bars.length < 2) return '<p class="meta">沒有近 30 日股價</p>';
  const width = 320;
  const priceTop = 4;
  const priceH = 72;
  const volumeTop = 84;
  const volumeH = 36;
  const height = 142;
  const slot = (width - 16) / bars.length;
  const highOf = (bar) => bar.high ?? Math.max(bar.open ?? bar.close, bar.close);
  const lowOf = (bar) => bar.low ?? Math.min(bar.open ?? bar.close, bar.close);
  const min = Math.min(...bars.map(lowOf));
  const max = Math.max(...bars.map(highOf));
  const span = Math.max(0.01, max - min);
  const yOf = (price) => priceTop + (1 - (price - min) / span) * (priceH - 8);
  const maxTurnover = Math.max(...bars.map((bar) => bar.turnover || 0), 1);
  const marks = bars.map((bar, index) => {
    const open = bar.open ?? bar.close;
    const up = bar.close >= open;
    const mood = up ? 'up' : 'down';
    const x = 8 + slot * index + slot / 2;
    const bodyTop = yOf(Math.max(open, bar.close));
    const bodyHeight = Math.max(1.4, yOf(Math.min(open, bar.close)) - bodyTop);
    const volumeHeight = Math.max(1.5, ((bar.turnover || 0) / maxTurnover) * (volumeH - 2));
    return `<line class="wick ${mood}" x1="${x.toFixed(1)}" y1="${yOf(highOf(bar)).toFixed(1)}" x2="${x.toFixed(1)}" y2="${yOf(lowOf(bar)).toFixed(1)}" /><rect class="body ${mood}" x="${(x - slot * 0.28).toFixed(1)}" y="${bodyTop.toFixed(1)}" width="${Math.max(1.6, slot * 0.56).toFixed(1)}" height="${bodyHeight.toFixed(1)}" /><rect class="vol ${mood}" x="${(x - slot * 0.28).toFixed(1)}" y="${(volumeTop + volumeH - volumeHeight).toFixed(1)}" width="${Math.max(1.6, slot * 0.56).toFixed(1)}" height="${volumeHeight.toFixed(1)}" />`;
  }).join('');
  const labels = [0, Math.floor((bars.length - 1) / 2), bars.length - 1].map((index, order) => {
    const anchor = ['start', 'middle', 'end'][order];
    const x = 8 + slot * index + slot / 2;
    return `<text x="${x.toFixed(1)}" y="136" text-anchor="${anchor}">${shortDate(bars[index].date)}</text>`;
  }).join('');
  return `<svg class="spark combo" viewBox="0 0 ${width} ${height}" role="img" aria-label="近 30 日股價與成交額"><line class="axis" x1="8" y1="${volumeTop + volumeH}" x2="${width - 8}" y2="${volumeTop + volumeH}" />${marks}${labels}</svg>`;
}

function bannerHtml(state) {
  const { view, session } = state;
  if (session.summary === 'half') {
    const breadth = view.breadth ? `升 ${view.breadth.up}　平 ${view.breadth.flat}　跌 ${view.breadth.down}` : '';
    return `<strong>午市小休</strong><span>半日摘要　恆指 ${formatPrice(view.index.price, true)} ${formatPct(view.index.changePercent)}　${breadth}</span>`;
  }
  if (session.id === 'cas') return `<strong>${session.title}</strong><span>${session.countdown?.text ?? ''}</span>`;
  return '';
}
