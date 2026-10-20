const HOLIDAYS = new Set([
  '2026-01-01',
  '2026-02-17',
  '2026-02-18',
  '2026-02-19',
  '2026-04-03',
  '2026-04-04',
  '2026-04-06',
  '2026-05-01',
  '2026-07-01',
  '2026-10-01',
  '2026-10-19',
  '2026-12-25',
  '2027-01-01',
  '2027-02-06',
  '2027-02-07',
  '2027-02-08',
]);

const HALF_DAYS = new Set([
  '2026-02-16',
  '2026-12-24',
  '2026-12-31',
  '2027-02-05',
]);

export function hkParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '';
  let hour = Number(pick('hour'));
  if (hour === 24) hour = 0;
  const minute = Number(pick('minute'));
  const second = Number(pick('second'));
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour,
    minute,
    second,
    weekday: pick('weekday'),
    key: `${pick('year')}-${pick('month')}-${pick('day')}`,
    minutesOfDay: hour * 60 + minute,
    secondsOfDay: hour * 3600 + minute * 60 + second,
  };
}

export function hkStamp(key, hour, minute, second = 0) {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const ss = String(second).padStart(2, '0');
  return new Date(`${key}T${hh}:${mm}:${ss}+08:00`);
}

function clock(parts) {
  const hh = String(parts.hour).padStart(2, '0');
  const mm = String(parts.minute).padStart(2, '0');
  const ss = String(parts.second).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function duration(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function countdownUntil(date, target) {
  return {
    text: duration((target.getTime() - date.getTime()) / 1000),
  };
}

function isClosedDay(parts) {
  return parts.weekday === 'Sat' || parts.weekday === 'Sun' || HOLIDAYS.has(parts.key);
}

function nextOpen(date) {
  for (let add = 0; add < 14; add += 1) {
    const probe = new Date(date.getTime() + add * 86400000);
    const parts = hkParts(probe);
    if (isClosedDay(parts)) continue;
    const open = hkStamp(parts.key, 9, 30);
    if (open.getTime() > date.getTime() + 1000) return open;
  }
  return new Date(date.getTime() + 86400000);
}

function session(parts, extra) {
  return {
    key: parts.key,
    clock: clock(parts),
    weekday: parts.weekday,
    trading: false,
    carts: 'park',
    countdown: null,
    summary: null,
    ...extra,
  };
}

export function getSession(date) {
  const parts = hkParts(date);
  if (isClosedDay(parts)) {
    const holiday = HOLIDAYS.has(parts.key);
    return session(parts, {
      id: 'night',
      title: holiday ? '假期休市' : '週末休市',
      look: 'night',
      summary: 'close',
      countdown: { label: '距離早市', ...countdownUntil(date, nextOpen(date)) },
    });
  }

  const half = HALF_DAYS.has(parts.key);
  const minute = parts.minutesOfDay;
  const at = (hour, min, second = 0) => hkStamp(parts.key, hour, min, second);

  if (minute < 8 * 60 + 30) {
    return session(parts, {
      id: 'night',
      title: '休市',
      look: 'night',
      summary: 'close',
      countdown: { label: '距離早市', ...countdownUntil(date, at(9, 30)) },
    });
  }
  if (minute < 9 * 60) {
    return session(parts, {
      id: 'prep',
      title: '茶樓預備',
      look: 'prep',
      countdown: { label: '距離早市', ...countdownUntil(date, at(9, 30)) },
    });
  }
  if (minute < 9 * 60 + 30) {
    return session(parts, {
      id: 'auction',
      title: '開市前時段',
      look: 'auction',
      trading: true,
      carts: 'move',
      countdown: { label: '距離早市', ...countdownUntil(date, at(9, 30)) },
    });
  }

  if (half) {
    if (minute < 11 * 60 + 30) {
      return session(parts, {
        id: 'morning',
        title: '半日早市',
        look: 'morning',
        trading: true,
        carts: 'move',
      });
    }
    if (minute < 12 * 60) {
      return session(parts, {
        id: 'preclose',
        title: '收市前',
        look: 'preclose',
        trading: true,
        carts: 'rush',
        countdown: { label: '距離收市', ...countdownUntil(date, at(12, 0)) },
      });
    }
    if (minute < 12 * 60 + 10) {
      return session(parts, {
        id: 'cas',
        title: '收市競價',
        look: 'cas',
        trading: true,
        carts: 'rush',
        countdown: { label: '競價餘下', ...countdownUntil(date, at(12, 10)) },
      });
    }
    return session(parts, {
      id: 'night',
      title: '半日已收市',
      look: 'night',
      summary: 'close',
      countdown: { label: '距離早市', ...countdownUntil(date, nextOpen(date)) },
    });
  }

  if (minute < 12 * 60) {
    return session(parts, {
      id: 'morning',
      title: '早市',
      look: 'morning',
      trading: true,
      carts: 'move',
    });
  }
  if (minute < 13 * 60) {
    return session(parts, {
      id: 'lunch',
      title: '午市小休',
      look: 'lunch',
      summary: 'half',
      countdown: { label: '午市再開', ...countdownUntil(date, at(13, 0)) },
    });
  }
  if (minute < 15 * 60 + 30) {
    return session(parts, {
      id: 'afternoon',
      title: '午市',
      look: 'afternoon',
      trading: true,
      carts: 'move',
    });
  }
  if (minute < 16 * 60) {
    return session(parts, {
      id: 'preclose',
      title: '收市前',
      look: 'preclose',
      trading: true,
      carts: 'rush',
      countdown: { label: '距離收市', ...countdownUntil(date, at(16, 0)) },
    });
  }
  if (minute < 16 * 60 + 10) {
    return session(parts, {
      id: 'cas',
      title: '收市競價',
      look: 'cas',
      trading: true,
      carts: 'rush',
      countdown: { label: '競價餘下', ...countdownUntil(date, at(16, 10)) },
    });
  }
  return session(parts, {
    id: 'night',
    title: '已收市',
    look: 'night',
    summary: 'close',
    countdown: { label: '距離早市', ...countdownUntil(date, nextOpen(date)) },
  });
}

export function effectiveSession(date, feedState, scrubbing) {
  const local = getSession(date);
  if (!scrubbing && feedState === 'closed' && local.trading) {
    return {
      ...local,
      id: 'holiday',
      title: '休市',
      trading: false,
      carts: 'park',
      look: 'night',
      summary: 'close',
      countdown: { label: '距離早市', ...countdownUntil(date, nextOpen(date)) },
    };
  }
  return local;
}
