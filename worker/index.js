import { universeFromCodes } from '../src/config/stocks.js';
import { fillGaps } from '../src/services/mock.js';
import { loadMarket } from '../src/services/quotes.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

let cache = null;
let pending = null;

function json(status, body) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname !== '/api/market') {
      return new Response('恆指大茶樓報價。請開啟 /api/market', { status: 404, headers: cors });
    }
    const key = url.searchParams.get('codes') || 'default';
    const fresh = url.searchParams.get('fresh') === '1';
    const universe = key === 'default' ? undefined : universeFromCodes(key);
    try {
      if (!fresh && cache?.key === key && Date.now() - cache.at < 60_000) return json(200, cache.body);
      if (!fresh && pending?.key === key) return json(200, await pending.job);
      const job = loadMarket(universe)
        .then((data) => {
          const body = JSON.stringify(fillGaps(data, universe));
          cache = { key, at: Date.now(), body };
          return body;
        })
        .finally(() => {
          if (pending?.key === key) pending = null;
        });
      pending = { key, job };
      return json(200, await job);
    } catch (error) {
      return json(502, JSON.stringify({ error: error?.message || '報價失敗' }));
    }
  },
};
