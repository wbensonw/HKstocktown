export function paletteOf(mode) {
  const hk = mode !== 'intl';
  return {
    mode: hk ? 'hk' : 'intl',
    up: hk ? '#ff4d5a' : '#1fbf78',
    down: hk ? '#1fbf78' : '#ff4d5a',
    flat: '#e7dccb',
    gold: '#e7c27a',
  };
}
