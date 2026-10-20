import { hkParts } from '../config/sessions.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointAt(minutes, hhmm) {
  if (!minutes?.points?.length) return null;
  let chosen = null;
  for (const point of minutes.points) {
    if (point[0] <= hhmm) chosen = point;
    else break;
  }
  return chosen;
}

function hhmm(parts) {
  return `${String(parts.hour).padStart(2, '0')}${String(parts.minute).padStart(2, '0')}`;
}

function barOn(history, key) {
  return history?.find((bar) => bar.date === key) ?? null;
}

function previousClose(history, key, fallback) {
  const index = history?.findIndex((bar) => bar.date === key) ?? -1;
  if (index > 0) return history[index - 1].close;
  return fallback;
}

export function viewQuote(quote, date, scrubbing) {
  if (!scrubbing) return { ...quote, replay: false };
  const parts = hkParts(date);
  const minutePoint = quote.minutes?.date === parts.key ? pointAt(quote.minutes, hhmm(parts)) : null;
  if (minutePoint && parts.minutesOfDay >= 9 * 60 + 30) {
    const price = minutePoint[1];
    const prevClose = quote.prevClose || price;
    const change = price - prevClose;
    return {
      ...quote,
      price,
      turnover: minutePoint[2] || quote.turnover,
      change,
      changePercent: prevClose ? (change / prevClose) * 100 : 0,
      replay: true,
    };
  }
  const bar = barOn(quote.history, parts.key);
  if (bar) {
    const prevClose = previousClose(quote.history, parts.key, quote.prevClose || bar.open || bar.close);
    const change = bar.close - prevClose;
    return {
      ...quote,
      price: bar.close,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      volume: bar.volume,
      turnover: bar.turnover,
      prevClose,
      change,
      changePercent: prevClose ? (change / prevClose) * 100 : 0,
      time: bar.date,
      replay: true,
    };
  }
  return { ...quote, replay: false };
}

function anomalyFor(stock, date, scrubbing, allowVolume) {
  if (Math.abs(stock.changePercent) >= 5) {
    const direction = stock.changePercent > 0 ? '急升' : '急跌';
    return {
      kind: 'move',
      text: `【異動】${stock.symbol} ${stock.short} 今日${direction} ${Math.abs(stock.changePercent).toFixed(1)}%`,
    };
  }
  if (!allowVolume) return null;
  const minutes = stock.minutes;
  if (!minutes?.points?.length) return null;
  const parts = hkParts(date);
  const limit = !scrubbing || minutes.date !== parts.key ? '2400' : hhmm(parts);
  const points = minutes.points.filter((point) => point[0] < '1600' && point[0] <= limit);
  if (points.length < 8) return null;
  const deltas = [];
  for (let index = 1; index < points.length; index += 1) {
    deltas.push(Math.max(0, points[index][2] - points[index - 1][2]));
  }
  const sorted = [...deltas].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const recent = deltas.slice(-5).reduce((sum, value) => sum + value, 0);
  const lastTime = points[points.length - 1][0];
  const tail = lastTime >= '1555';
  const ratio = median > 0 ? recent / (median * 5) : 0;
  if (ratio > (tail ? 8 : 3.5)) {
    return {
      kind: 'volume',
      text: `【異動】${stock.symbol} ${stock.short} 分時成交明顯放大`,
    };
  }
  return null;
}

function applyDrop(index, stocks) {
  const prev = index.prevClose || index.price;
  index.price = prev * 0.97;
  index.change = index.price - prev;
  index.changePercent = -3;
  stocks.forEach((stock, indexNumber) => {
    if (indexNumber % 2 === 0) {
      const base = stock.prevClose || stock.price;
      stock.price = base * (0.975 - (indexNumber % 5) * 0.006);
      stock.change = stock.price - base;
      stock.changePercent = base ? (stock.change / base) * 100 : 0;
    }
  });
}

function riceCrowd(drop) {
  const seats = 8;
  const crowd = clamp(Math.round(4 + drop * 3.2), 4, seats + 10);
  return {
    seated: Math.min(seats, crowd),
    queue: drop >= 1.5 ? Math.max(0, crowd - seats) : 0,
  };
}

export function presentMarket(raw, { date, scrubbing = false, test = null } = {}) {
  const index = viewQuote(raw.index, date, scrubbing);
  const stocks = raw.stocks.map((stock) => viewQuote(stock, date, scrubbing));
  let source = raw.source;
  let testNote = '';
  if (test?.drop) {
    applyDrop(index, stocks);
    source = 'test';
    testNote = '測試：恆指下跌 3%';
  }

  const turnovers = stocks.map((stock) => stock.turnover || 0);
  const minTurnover = Math.min(...turnovers);
  const maxTurnover = Math.max(...turnovers);
  const anomalies = [];

  const dressed = stocks.map((stock) => {
    const low = Math.log10(Math.max(minTurnover, 1));
    const high = Math.log10(Math.max(maxTurnover, 1));
    const span = high - low;
    const ratio = span <= 0.01 ? 0.5 : (Math.log10(Math.max(stock.turnover || 1, 1)) - low) / span;
    const guests = clamp(Math.round(3 + ratio * 9), 3, 12);
    const upShare = stock.changePercent >= 0 ? 0.64 : 0.36;
    const guestsRight = clamp(Math.round(guests * upShare), 0, guests);
    let anomaly = anomalyFor(stock, date, scrubbing, scrubbing || raw.status?.state === 'open');
    if (test?.anomaly && stock.symbol === '00700') {
      anomaly = { kind: 'test', text: '【異動警報】00700 騰訊 短線大單掃貨！' };
      source = 'test';
      testNote = testNote || '測試：異動突擊車';
    }
    if (anomaly) anomalies.push({ ...anomaly, symbol: stock.symbol });
    return {
      ...stock,
      layers: 1,
      guests,
      guestsRight,
      steam: Math.round(8 + Math.min(1, Math.max(0, ratio)) * 40),
      anomaly,
    };
  });

  const byChange = [...dressed].sort((a, b) => b.changePercent - a.changePercent);
  const byTurnover = [...dressed].sort((a, b) => (b.turnover || 0) - (a.turnover || 0));
  const sectors = new Map();
  for (const stock of dressed) {
    const bucket = sectors.get(stock.sector) ?? { sector: stock.sector, turnover: 0, count: 0 };
    bucket.turnover += stock.turnover || 0;
    bucket.count += 1;
    sectors.set(stock.sector, bucket);
  }
  const sectorRanks = [...sectors.values()].sort((a, b) => b.turnover - a.turnover);
  const downCount = dressed.filter((stock) => stock.changePercent < 0).length;
  const drop = Math.max(0, -(index.changePercent || 0));

  return {
    source,
    testNote,
    fetchedAt: raw.fetchedAt,
    status: raw.status,
    breadth: test?.drop
      ? {
          up: dressed.filter((stock) => stock.changePercent > 0.05).length,
          down: dressed.filter((stock) => stock.changePercent < -0.05).length,
          flat: dressed.filter((stock) => Math.abs(stock.changePercent) <= 0.05).length,
        }
      : raw.breadth,
    replay: Boolean(index.replay || dressed.some((stock) => stock.replay)),
    index,
    stocks: dressed,
    rankings: {
      gainers: byChange.slice(0, 3),
      losers: [...dressed].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3),
      turnover: byTurnover.slice(0, 3),
      all: byTurnover,
    },
    sectors: sectorRanks,
    anomalies,
    alley: {
      people: clamp(Math.round(downCount * 0.7 + drop * 2.4), 0, 16),
      bowls: clamp(Math.round(downCount * 0.5 + drop * 2), 0, 12),
    },
    rice: riceCrowd(drop),
  };
}
