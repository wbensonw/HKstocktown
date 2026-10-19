import { getUniverse, INDEX } from '../config/stocks.js';
import { hkParts } from '../config/sessions.js';

function hash(text) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function roundPrice(price) {
  if (price >= 200) return Math.round(price * 100) / 100;
  if (price >= 20) return Math.round(price * 100) / 100;
  return Math.round(price * 1000) / 1000;
}

function historyFor(base, random) {
  const rows = [];
  let price = base * (0.94 + random() * 0.08);
  const today = new Date();
  for (let index = 29; index >= 0; index -= 1) {
    const day = new Date(today.getTime() - index * 86400000);
    const parts = hkParts(day);
    if (parts.weekday === 'Sat' || parts.weekday === 'Sun') continue;
    const open = price;
    const drift = (random() - 0.48) * 0.035;
    const close = Math.max(0.2, open * (1 + drift));
    const high = Math.max(open, close) * (1 + random() * 0.012);
    const low = Math.min(open, close) * (1 - random() * 0.012);
    const volume = Math.round(base * (8000 + random() * 40000));
    rows.push({
      date: parts.key,
      open: roundPrice(open),
      close: roundPrice(close),
      high: roundPrice(high),
      low: roundPrice(low),
      volume,
      turnover: volume * close,
    });
    price = close;
  }
  return rows;
}

function minutesFor(dateKey, open, close, turnover, random) {
  const points = [];
  const slots = [];
  for (let minute = 9 * 60 + 30; minute <= 12 * 60; minute += 1) slots.push(minute);
  for (let minute = 13 * 60; minute <= 16 * 60; minute += 1) slots.push(minute);
  let price = open;
  let spent = 0;
  slots.forEach((minute, index) => {
    const progress = index / (slots.length - 1);
    const target = open + (close - open) * progress;
    price = price * 0.72 + target * 0.28 + (random() - 0.5) * open * 0.004;
    spent += turnover / slots.length * (0.6 + random() * 0.8);
    const hh = String(Math.floor(minute / 60)).padStart(2, '0');
    const mm = String(minute % 60).padStart(2, '0');
    points.push([`${hh}${mm}`, roundPrice(price), spent]);
  });
  points[points.length - 1][1] = roundPrice(close);
  points[points.length - 1][2] = turnover;
  return { date: dateKey, points };
}

function quoteFrom(meta, random, index = false) {
  const history = historyFor(meta.base, random);
  const last = history.at(-1);
  const prev = history.at(-2) ?? last;
  const change = last.close - prev.close;
  const turnover = index ? meta.base * 7_200_000 : last.turnover;
  if (index) last.turnover = turnover;
  return {
    symbol: meta.symbol,
    code: meta.code,
    name: meta.name,
    short: meta.short,
    dimsum: meta.dimsum ?? null,
    blurb: meta.blurb ?? '',
    sector: meta.sector ?? '',
    price: last.close,
    prevClose: prev.close,
    open: last.open,
    high: last.high,
    low: last.low,
    volume: last.volume,
    turnover,
    change,
    changePercent: prev.close ? (change / prev.close) * 100 : 0,
    time: `${last.date} 16:08:00`,
    history,
    minutes: minutesFor(last.date, last.open, last.close, turnover, random),
  };
}

export function mockMarket(now = new Date(), universe = getUniverse()) {
  const parts = hkParts(now);
  const random = mulberry32(hash(`dimsum-${parts.key}`));
  const downBias = random();
  const index = quoteFrom(INDEX, random, true);
  if (downBias > 0.55) {
    index.price = roundPrice(index.prevClose * 0.985);
    index.change = index.price - index.prevClose;
    index.changePercent = (index.change / index.prevClose) * 100;
  }
  const stocks = universe.map((stock, indexNumber) => {
    const quote = quoteFrom(stock, random, false);
    if (downBias > 0.55 && indexNumber % 3 !== 2) {
      quote.price = roundPrice(quote.prevClose * (0.97 - (indexNumber % 4) * 0.008));
      quote.change = quote.price - quote.prevClose;
      quote.changePercent = (quote.change / quote.prevClose) * 100;
    }
    return quote;
  });
  const up = stocks.filter((stock) => stock.changePercent > 0.05).length;
  const down = stocks.filter((stock) => stock.changePercent < -0.05).length;
  return {
    source: 'mock',
    fetchedAt: now.toISOString(),
    status: { state: 'unknown', note: '模擬數據', raw: '' },
    breadth: { up, flat: stocks.length - up - down, down },
    index,
    stocks,
  };
}

export function fillGaps(market, universe = getUniverse()) {
  const bySymbol = new Map(market.stocks.map((stock) => [stock.symbol, stock]));
  const missing = universe.filter((stock) => !bySymbol.has(stock.symbol));
  if (!missing.length && market.stocks.length === universe.length) return market;
  const filler = mockMarket(new Date(), universe);
  market.stocks = universe.map((stock) => bySymbol.get(stock.symbol) ?? filler.stocks.find((item) => item.symbol === stock.symbol)).filter(Boolean);
  if (market.stocks.length !== universe.length) market.source = 'partial';
  return market;
}
