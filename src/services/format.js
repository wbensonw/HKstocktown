export function formatPrice(value, index = false) {
  if (!Number.isFinite(value)) return '—';
  const digits = index || value >= 100 ? 2 : 3;
  return value.toLocaleString('zh-HK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatPct(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTurnover(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e8) {
    const yi = value / 1e8;
    const digits = yi >= 100 ? 0 : 1;
    return `${yi.toLocaleString('zh-HK', { maximumFractionDigits: digits, minimumFractionDigits: digits })} 億`;
  }
  if (value >= 1e4) return `${Math.round(value / 1e4).toLocaleString('zh-HK')} 萬`;
  return `${Math.round(value).toLocaleString('zh-HK')}`;
}

export function formatVolume(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)} 億股`;
  if (value >= 1e4) return `${Math.round(value / 1e4).toLocaleString('zh-HK')} 萬股`;
  return `${Math.round(value).toLocaleString('zh-HK')} 股`;
}

export function tone(value) {
  if (value > 0.004) return 'up';
  if (value < -0.004) return 'down';
  return 'flat';
}

export function sourceLabel(source) {
  if (source === 'tencent') return '騰訊財經';
  if (source === 'partial') return '部分模擬';
  if (source === 'test') return '測試畫面';
  return '模擬數據';
}
