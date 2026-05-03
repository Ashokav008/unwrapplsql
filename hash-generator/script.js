const elements = {
  inputText: document.getElementById('inputText'),
  md5Output: document.getElementById('md5Output'),
  sha1Output: document.getElementById('sha1Output'),
  sha256Output: document.getElementById('sha256Output'),
  inputMeta: document.getElementById('inputMeta'),
  statusPill: document.getElementById('statusPill'),
  statusMessage: document.getElementById('statusMessage'),
  generateBtn: document.getElementById('generateBtn'),
  copyBtn: document.getElementById('copyBtn'),
  clearBtn: document.getElementById('clearBtn'),
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

const SAMPLE_TEXT = 'DevToolStack hash check sample';

function initTheme() {
  const savedTheme = localStorage.getItem('hashgenerator-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('hashgenerator-theme', theme);
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  elements.toastStack.appendChild(item);
  window.setTimeout(() => item.remove(), 2800);
}

function updateMeta() {
  const value = elements.inputText.value;
  const lines = value ? value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length : 0;
  elements.inputMeta.textContent = `${lines} lines | ${value.length} characters`;
}

function setStatus(type, message) {
  elements.statusPill.className = `status-pill ${type}`;
  elements.statusPill.textContent = type === 'success' ? 'Generated' : type === 'error' ? 'Error' : 'Ready';
  elements.statusMessage.textContent = message;
}

function hexFromBuffer(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function digest(algorithm, value) {
  const encoded = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest(algorithm, encoded);
  return hexFromBuffer(buffer);
}

async function generateHashes() {
  const input = elements.inputText.value;
  if (!input) {
    setStatus('error', 'Paste text before generating hashes.');
    toast('Paste text first.', 'error');
    return;
  }

  try {
    elements.md5Output.textContent = md5(input);
    elements.sha1Output.textContent = await digest('SHA-1', input);
    elements.sha256Output.textContent = await digest('SHA-256', input);
    setStatus('success', 'Hashes generated successfully.');
    toast('Hashes generated.');
  } catch (error) {
    setStatus('error', 'Unable to generate hashes for the current input.');
    toast('Hash generation failed.', 'error');
  }
}

async function copyAll() {
  if (elements.md5Output.textContent === '—') {
    toast('Generate hashes before copying results.', 'error');
    return;
  }

  const content = `MD5: ${elements.md5Output.textContent}\nSHA-1: ${elements.sha1Output.textContent}\nSHA-256: ${elements.sha256Output.textContent}`;
  await navigator.clipboard.writeText(content);
  toast('Hashes copied.');
}

function clearAll() {
  elements.inputText.value = '';
  elements.md5Output.textContent = '—';
  elements.sha1Output.textContent = '—';
  elements.sha256Output.textContent = '—';
  setStatus('idle', 'Paste text or payload content on the left and generate hashes.');
  updateMeta();
}

elements.inputText.addEventListener('input', updateMeta);
elements.generateBtn.addEventListener('click', generateHashes);
elements.copyBtn.addEventListener('click', copyAll);
elements.clearBtn.addEventListener('click', clearAll);
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

initTheme();
elements.inputText.value = SAMPLE_TEXT;
updateMeta();
generateHashes();
