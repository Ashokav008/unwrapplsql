const inputJson = document.getElementById('inputJson');
const outputJson = document.getElementById('outputJson');
const formatBtn = document.getElementById('formatBtn');
const validateBtn = document.getElementById('validateBtn');
const minifyBtn = document.getElementById('minifyBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const sampleBtn = document.getElementById('sampleBtn');
const indentSelect = document.getElementById('indentSelect');
const inputBadge = document.getElementById('inputBadge');
const outputBadge = document.getElementById('outputBadge');
const statusStat = document.getElementById('statusStat');
const sizeStat = document.getElementById('sizeStat');
const keysStat = document.getElementById('keysStat');
const depthStat = document.getElementById('depthStat');
const searchInput = document.getElementById('searchInput');
const dropZone = document.getElementById('dropZone');
const toastStack = document.getElementById('toastStack');
const themeToggle = document.getElementById('themeToggle');

const SAMPLE_JSON = {
  tool: 'JSON Formatter',
  platform: 'DevToolStack',
  features: ['format', 'validate', 'minify', 'copy', 'download'],
  live: true,
  meta: {
    category: 'developer utility',
    indentation: 2,
    createdFor: ['backend developers', 'API testing', 'data review']
  }
};

let lastOutput = '';

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  toastStack.appendChild(item);
  setTimeout(() => item.remove(), 3200);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('jsonformatter-theme', theme);
  themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0f172a' : '#f7fafc');
}

function initTheme() {
  const saved = localStorage.getItem('jsonformatter-theme');
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  setTheme(saved || preferred);
}

function parseJson() {
  const raw = inputJson.value.trim();
  if (!raw) {
    throw new Error('Paste or upload JSON first.');
  }
  return JSON.parse(raw);
}

function countKeys(value) {
  if (Array.isArray(value)) return value.reduce((total, item) => total + countKeys(item), 0);
  if (value && typeof value === 'object') {
    return Object.keys(value).length + Object.values(value).reduce((total, item) => total + countKeys(item), 0);
  }
  return 0;
}

function maxDepth(value) {
  if (!value || typeof value !== 'object') return 0;
  const children = Array.isArray(value) ? value : Object.values(value);
  if (!children.length) return 1;
  return 1 + Math.max(...children.map(maxDepth));
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateStats(value, output, valid = true) {
  statusStat.textContent = valid ? 'Valid JSON' : 'Invalid JSON';
  sizeStat.textContent = formatBytes(new Blob([output || inputJson.value]).size);
  keysStat.textContent = valid ? countKeys(value) : 0;
  depthStat.textContent = valid ? maxDepth(value) : 0;
  outputBadge.className = valid ? 'badge success' : 'badge error';
  outputBadge.textContent = valid ? 'Valid' : 'Invalid';
}

function setOutput(text) {
  lastOutput = text;
  outputJson.textContent = text;
  searchInput.value = '';
}

function handleError(error) {
  const message = error.message || 'Invalid JSON.';
  setOutput(message);
  inputBadge.textContent = 'Needs fix';
  outputBadge.className = 'badge error';
  outputBadge.textContent = 'Error';
  updateStats(null, inputJson.value, false);
  toast(message, 'error');
}

function formatJson() {
  try {
    const value = parseJson();
    const indent = Number(indentSelect.value);
    const formatted = JSON.stringify(value, null, indent);
    setOutput(formatted);
    inputBadge.textContent = 'Parsed';
    updateStats(value, formatted, true);
    toast('JSON formatted successfully.');
  } catch (error) {
    handleError(error);
  }
}

function validateJson() {
  try {
    const value = parseJson();
    const formatted = JSON.stringify(value, null, Number(indentSelect.value));
    setOutput('Valid JSON');
    inputBadge.textContent = 'Valid';
    updateStats(value, formatted, true);
    toast('JSON is valid.');
  } catch (error) {
    handleError(error);
  }
}

function minifyJson() {
  try {
    const value = parseJson();
    const minified = JSON.stringify(value);
    setOutput(minified);
    inputBadge.textContent = 'Minified';
    updateStats(value, minified, true);
    toast('JSON minified successfully.');
  } catch (error) {
    handleError(error);
  }
}

function clearAll() {
  inputJson.value = '';
  setOutput('Click Format JSON to beautify your JSON.');
  inputBadge.textContent = 'Ready';
  outputBadge.className = 'badge success';
  outputBadge.textContent = 'Waiting';
  statusStat.textContent = 'Not checked';
  sizeStat.textContent = '0 B';
  keysStat.textContent = '0';
  depthStat.textContent = '0';
  toast('Workspace cleared.');
}

async function copyOutput() {
  const text = lastOutput || outputJson.textContent;
  if (!text || text.startsWith('Click Format')) {
    toast('Format JSON before copying.', 'error');
    return;
  }
  await navigator.clipboard.writeText(text);
  toast('Output copied to clipboard.');
}

function downloadOutput() {
  const text = lastOutput || outputJson.textContent;
  if (!text || text.startsWith('Click Format')) {
    toast('Format JSON before downloading.', 'error');
    return;
  }
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'formatted.json';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('JSON file downloaded.');
}

function loadSample() {
  inputJson.value = JSON.stringify(SAMPLE_JSON);
  formatJson();
}

function readFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().match(/\.(json|txt)$/)) {
    toast('Please upload a .json or .txt file.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    inputJson.value = String(reader.result || '');
    inputBadge.textContent = file.name;
    formatJson();
  };
  reader.onerror = () => toast('Could not read the file.', 'error');
  reader.readAsText(file);
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function searchOutput() {
  const query = searchInput.value.trim();
  if (!query) {
    outputJson.textContent = lastOutput || outputJson.textContent;
    return;
  }
  const source = lastOutput || outputJson.textContent;
  const escaped = escapeHtml(source);
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  outputJson.innerHTML = escaped.replace(regex, match => `<mark>${match}</mark>`);
}

formatBtn.addEventListener('click', formatJson);
validateBtn.addEventListener('click', validateJson);
minifyBtn.addEventListener('click', minifyJson);
clearBtn.addEventListener('click', clearAll);
copyBtn.addEventListener('click', copyOutput);
downloadBtn.addEventListener('click', downloadOutput);
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => readFile(fileInput.files[0]));
sampleBtn.addEventListener('click', loadSample);
searchInput.addEventListener('input', searchOutput);
themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

dropZone.addEventListener('dragover', event => {
  event.preventDefault();
  dropZone.classList.add('dragging');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', event => {
  event.preventDefault();
  dropZone.classList.remove('dragging');
  readFile(event.dataTransfer.files[0]);
});

initTheme();
