import { universeFromCodes } from '../src/config/stocks.js';
import { loadMarket } from '../src/services/quotes.js';
import { fillGaps } from '../src/services/mock.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

export function marketApi() {
  let cache = null;
  let pending = null;

  return {
    name: 'market-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/market') return next();
        const requestUrl = new URL(req.url, 'http://127.0.0.1');
        const key = requestUrl.searchParams.get('codes') || 'default';
        const fresh = requestUrl.searchParams.get('fresh') === '1';
        const universe = key === 'default' ? undefined : universeFromCodes(key);
        try {
          if (!fresh && cache?.key === key && Date.now() - cache.at < 60_000) {
            send(res, 200, cache.body);
            return;
          }
          if (!fresh && pending?.key === key) {
            send(res, 200, await pending.job);
            return;
          }
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
          send(res, 200, await job);
        } catch (error) {
          send(res, 502, JSON.stringify({ error: error?.message || '報價失敗' }));
        }
      });
    },
  };
}
