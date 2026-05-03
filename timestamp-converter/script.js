const elements = {
  inputValue: document.getElementById('inputValue'),
  unixSeconds: document.getElementById('unixSeconds'),
  unixMilliseconds: document.getElementById('unixMilliseconds'),
  isoUtc: document.getElementById('isoUtc'),
  utcString: document.getElementById('utcString'),
  localString: document.getElementById('localString'),
  relativeValue: document.getElementById('relativeValue'),
  statusPill: document.getElementById('statusPill'),
  statusMessage: document.getElementById('statusMessage'),
  convertBtn: document.getElementById('convertBtn'),
  nowBtn: document.getElementById('nowBtn'),
  copyBtn: document.getElementById('copyBtn'),
  clearBtn: document.getElementById('clearBtn'),
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

function initTheme() {
  const savedTheme = localStorage.getItem('timestamp-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('timestamp-theme', theme);
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  elements.toastStack.appendChild(item);
  window.setTimeout(() => item.remove(), 2800);
}

function setStatus(type, message) {
  elements.statusPill.className = `status-pill ${type}`;
  elements.statusPill.textContent = type === 'success' ? 'Converted' : type === 'error' ? 'Error' : 'Ready';
  elements.statusMessage.textContent = message;
}

function clearResults() {
  for (const key of ['unixSeconds', 'unixMilliseconds', 'isoUtc', 'utcString', 'localString', 'relativeValue']) {
    elements[key].textContent = '—';
  }
}

function parseInput(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Enter a timestamp or date value.');
  }

  if (/^-?\d+$/.test(trimmed)) {
    if (trimmed.length <= 10) {
      return new Date(Number(trimmed) * 1000);
    }
    return new Date(Number(trimmed));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Unsupported timestamp or date format.');
  }

  return parsed;
}

function relativeFromNow(date) {
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const units = [['day', 86400000], ['hour', 3600000], ['minute', 60000], ['second', 1000]];

  for (const [label, size] of units) {
    if (abs >= size || label === 'second') {
      const value = Math.round(diffMs / size);
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(value, label);
    }
  }

  return 'now';
}

function convertTimestamp() {
  try {
    const date = parseInput(elements.inputValue.value);
    elements.unixSeconds.textContent = String(Math.floor(date.getTime() / 1000));
    elements.unixMilliseconds.textContent = String(date.getTime());
    elements.isoUtc.textContent = date.toISOString();
    elements.utcString.textContent = date.toUTCString();
    elements.localString.textContent = date.toLocaleString();
    elements.relativeValue.textContent = relativeFromNow(date);
    setStatus('success', 'Timestamp converted successfully.');
    toast('Timestamp converted.');
  } catch (error) {
    clearResults();
    setStatus('error', error.message || 'Unable to convert the current value.');
    toast('Timestamp conversion failed.', 'error');
  }
}

async function copyAll() {
  if (elements.isoUtc.textContent === '—') {
    toast('Convert a value before copying results.', 'error');
    return;
  }

  const content = `Unix seconds: ${elements.unixSeconds.textContent}\nUnix milliseconds: ${elements.unixMilliseconds.textContent}\nISO UTC: ${elements.isoUtc.textContent}\nUTC string: ${elements.utcString.textContent}\nLocal time: ${elements.localString.textContent}\nRelative: ${elements.relativeValue.textContent}`;
  await navigator.clipboard.writeText(content);
  toast('Converted values copied.');
}

function useNow() {
  elements.inputValue.value = new Date().toISOString();
  convertTimestamp();
}

function clearAll() {
  elements.inputValue.value = '';
  clearResults();
  setStatus('idle', 'Enter a Unix timestamp, ISO string, or local date value to convert it.');
}

elements.convertBtn.addEventListener('click', convertTimestamp);
elements.nowBtn.addEventListener('click', useNow);
elements.copyBtn.addEventListener('click', copyAll);
elements.clearBtn.addEventListener('click', clearAll);
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

initTheme();
elements.inputValue.value = '2026-05-04T01:30:00Z';
convertTimestamp();
