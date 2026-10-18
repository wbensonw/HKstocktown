const DIMSUM = ['penguin', 'siuMai', 'ears', 'lion', 'harGow', 'car', 'square', 'peach', 'tower', 'coin', 'oil', 'mochi'];
const STORAGE_KEY = 'hk-dimsum-universe';

export const INDEX = {
  symbol: 'HSI',
  code: 'hkHSI',
  name: '恆生指數',
  short: '恆指',
  base: 24186,
};

export const CATALOG = [
  { symbol: '00700', code: 'hk00700', name: '騰訊控股', short: '騰訊', dimsum: 'penguin', blurb: '圓鳥流沙包', sector: '科技', base: 418 },
  { symbol: '00388', code: 'hk00388', name: '香港交易所', short: '港交所', dimsum: 'harGow', blurb: '金箔蝦餃', sector: '金融', base: 375 },
  { symbol: '09988', code: 'hk09988', name: '阿里巴巴', short: '阿里', dimsum: 'siuMai', blurb: '橙色燒賣', sector: '科技', base: 109 },
  { symbol: '03690', code: 'hk03690', name: '美團', short: '美團', dimsum: 'ears', blurb: '黃雙耳包', sector: '消費', base: 76 },
  { symbol: '01810', code: 'hk01810', name: '小米集團', short: '小米', dimsum: 'square', blurb: '橙方糕', sector: '科技', base: 27 },
  { symbol: '02359', code: 'hk02359', name: '藥明康德', short: '藥明', dimsum: 'peach', blurb: '壽桃包', sector: '醫藥', base: 90 },
  { symbol: '00941', code: 'hk00941', name: '中國移動', short: '中移動', dimsum: 'tower', blurb: '千層糕', sector: '電訊', base: 81 },
  { symbol: '00981', code: 'hk00981', name: '中芯國際', short: '中芯', dimsum: 'coin', blurb: '銅錢酥', sector: '科技', base: 55 },
  { symbol: '02669', code: 'hk02669', name: '中海物業', short: '中海物業', dimsum: 'ears', blurb: '黃雙耳包', sector: '地產', base: 6 },
  { symbol: '00386', code: 'hk00386', name: '中國石油化工', short: '中石化', dimsum: 'oil', blurb: '黑金包', sector: '能源', base: 4.5 },
  { symbol: '00788', code: 'hk00788', name: '中國鐵塔', short: '鐵塔', dimsum: 'tower', blurb: '千層糕', sector: '電訊', base: 11 },
  { symbol: '01398', code: 'hk01398', name: '工商銀行', short: '工行', dimsum: 'lion', blurb: '石獅金包', sector: '金融', base: 6 },
  { symbol: '02318', code: 'hk02318', name: '中國平安', short: '平安', dimsum: 'car', blurb: '車形糕', sector: '金融', base: 48 },
  { symbol: '00358', code: 'hk00358', name: '江西銅業', short: '江銅', dimsum: 'mochi', blurb: '彩色糯米糍', sector: '資源', base: 22 },
  { symbol: '00960', code: 'hk00960', name: '龍湖集團', short: '龍湖', dimsum: 'siuMai', blurb: '橙色燒賣', sector: '地產', base: 12 },
];

export function stockFromCode(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const symbol = digits.padStart(5, '0').slice(-5);
  if (!/^\d{5}$/.test(symbol) || symbol === '00000') return null;
  const known = CATALOG.find((stock) => stock.symbol === symbol);
  if (known) return { ...known };
  return {
    symbol,
    code: `hk${symbol}`,
    name: symbol,
    short: symbol,
    dimsum: DIMSUM[Number(symbol) % DIMSUM.length],
    blurb: '自選點心',
    sector: '自選',
    base: 20,
  };
}

export function universeFromCodes(codes) {
  const list = [];
  String(codes || '').split(/[^0-9]+/).forEach((part) => {
    const stock = stockFromCode(part);
    if (!stock || list.some((item) => item.symbol === stock.symbol)) return;
    if (list.length < 15) list.push(stock);
  });
  return list;
}

export function getUniverse() {
  if (typeof localStorage === 'undefined') return CATALOG.map((stock) => ({ ...stock }));
  const saved = localStorage.getItem(STORAGE_KEY);
  const custom = universeFromCodes(saved || '');
  return custom.length ? custom : CATALOG.map((stock) => ({ ...stock }));
}

export function setUniverse(list) {
  const symbols = list.map((stock) => stock.symbol).slice(0, 15);
  localStorage.setItem(STORAGE_KEY, symbols.join(','));
}

export function resetUniverse() {
  localStorage.removeItem(STORAGE_KEY);
}
