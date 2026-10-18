import { getUniverse, INDEX } from '../config/stocks.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Referer: 'https://gu.qq.com/',
};

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function klineUrl(code) {
  return `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,,,30,qfq`;
}

function minuteUrl(code) {
  return `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`;
}

async function getJson(url) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function parseQt(values, index = false) {
  if (!Array.isArray(values) || values.length < 35) return null;
  const price = num(values[3]);
  if (price == null) return null;
  let turnover = num(values[37]);
  if (index && turnover != null) turnover *= 10000;
  return {
    price,
    prevClose: num(values[4]),
    open: num(values[5]),
    high: num(values[33]),
    low: num(values[34]),
    volume: num(values[36]) ?? num(values[6]),
    change: num(values[31]),
    changePercent: num(values[32]),
    turnover,
    time: String(values[30] ?? '').replace(/\//g, '-'),
  };
}

export function parseHistory(rows, index = false) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const close = num(row[2]);
      const volume = num(row[5]) ?? 0;
      if (!row[0] || close == null) return null;
      return {
        date: String(row[0]),
        open: num(row[1]),
        close,
        high: num(row[3]),
        low: num(row[4]),
        volume,
        turnover: index ? volume : volume * close,
      };
    })
    .filter(Boolean);
}

export function parseMinutes(node) {
  const rows = node?.data?.data;
  if (!Array.isArray(rows)) return null;
  const rawDate = String(node?.data?.date ?? '');
  const date = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
  const points = [];
  for (const line of rows) {
    const [hhmm, price, , turnover] = String(line).trim().split(/\s+/);
    const parsedPrice = num(price);
    if (!hhmm || parsedPrice == null) continue;
    points.push([hhmm.padStart(4, '0'), parsedPrice, num(turnover) ?? 0]);
  }
  if (!points.length) return null;
  return { date, points };
}

function scaleMinutes(minutes, officialTurnover) {
  if (!minutes?.points?.length || !officialTurnover) return minutes;
  const last = minutes.points[minutes.points.length - 1][2];
  if (!last) return minutes;
  const ratio = officialTurnover / last;
  if (ratio > 0.2 && ratio < 5) return minutes;
  return {
    date: minutes.date,
    points: minutes.points.map(([time, price, turnover]) => [time, price, turnover * ratio]),
  };
}

export function parseFeedStatus(marketField) {
  const text = Array.isArray(marketField) ? String(marketField[0] ?? '') : '';
  const token = text.split('|').find((part) => part.startsWith('HK_')) ?? '';
  const closed = token.includes('close') || token.includes('休');
  const open = token.includes('open') || token.includes('交易');
  let state = 'unknown';
  if (closed) state = 'closed';
  else if (open) state = 'open';
  const note = token.split('_').slice(2).join('_');
  return { state, note, raw: token };
}

export function parseBreadth(zhishu) {
  const row = zhishu?.HSI;
  if (!Array.isArray(row) || row.length < 3) return null;
  return {
    up: Number(row[0]) || 0,
    flat: Number(row[1]) || 0,
    down: Number(row[2]) || 0,
  };
}

function withFallback(meta, quote, history) {
  const last = history.at(-1);
  const prev = history.at(-2);
  const price = quote?.price ?? last?.close;
  if (price == null) return null;
  const prevClose = quote?.prevClose ?? prev?.close ?? last?.open ?? price;
  const change = quote?.change ?? price - prevClose;
  const changePercent = quote?.changePercent ?? (prevClose ? (change / prevClose) * 100 : 0);
  const volume = quote?.volume ?? last?.volume ?? 0;
  let turnover = quote?.turnover;
  if (turnover == null || turnover <= 0) turnover = last?.turnover ?? volume * price;
  return {
    symbol: meta.symbol,
    code: meta.code,
    name: meta.name,
    short: meta.short,
    dimsum: meta.dimsum ?? null,
    blurb: meta.blurb ?? '',
    sector: meta.sector ?? '',
    price,
    prevClose,
    open: quote?.open ?? last?.open ?? price,
    high: quote?.high ?? last?.high ?? price,
    low: quote?.low ?? last?.low ?? price,
    volume,
    turnover,
    change,
    changePercent,
    time: quote?.time || last?.date || '',
    history,
  };
}

function build(meta, klineJson, minuteJson, index) {
  const node = klineJson?.data?.[meta.code];
  const history = parseHistory(node?.day, index);
  const quote = parseQt(node?.qt?.[meta.code], index);
  const built = withFallback(meta, quote, history);
  if (!built) return null;
  built.minutes = scaleMinutes(parseMinutes(minuteJson?.data?.[meta.code]), built.turnover);
  return { built, node };
}

async function mapPool(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

export async function loadMarket(universe = getUniverse()) {
  const metas = [INDEX, ...universe];
  const packs = await mapPool(metas, 4, async (meta) => {
    const [kline, minute] = await Promise.all([
      getJson(klineUrl(meta.code)).catch(() => null),
      getJson(minuteUrl(meta.code)).catch(() => null),
    ]);
    return { meta, kline, minute };
  });

  const indexPack = packs[0];
  const indexResult = build(INDEX, indexPack.kline, indexPack.minute, true);
  if (!indexResult) {
    throw new Error('恆指報價暫時取不到');
  }

  const stocks = [];
  for (const pack of packs.slice(1)) {
    const result = build(pack.meta, pack.kline, pack.minute, false);
    if (result) stocks.push(result.built);
  }
  if (stocks.length < 1) throw new Error('個股報價不足');

  const indexNode = indexResult.node;
  return {
    source: stocks.length === universe.length ? 'tencent' : 'partial',
    fetchedAt: new Date().toISOString(),
    status: parseFeedStatus(indexNode?.qt?.market),
    breadth: parseBreadth(indexNode?.qt?.zhishu),
    index: indexResult.built,
    stocks,
  };
}
