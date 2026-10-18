import { getUniverse } from '../config/stocks.js';
import { mockMarket } from './mock.js';

export async function fetchMarket() {
  const codes = getUniverse().map((stock) => stock.symbol).join(',');
  const apiBase = String(import.meta.env.VITE_MARKET_API || '').replace(/\/$/, '');
  try {
    const response = await fetch(`${apiBase}/api/market?codes=${codes}`);
    if (!response.ok) throw new Error(`報價服務回應 ${response.status}`);
    const data = await response.json();
    if (!data?.index?.price || !Array.isArray(data.stocks) || data.stocks.length < 1) {
      throw new Error('報價內容不完整');
    }
    return data;
  } catch (error) {
    const data = mockMarket();
    data.error = error?.message || '無法取得報價';
    return data;
  }
}
