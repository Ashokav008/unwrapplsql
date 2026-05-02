const APP_BASE_PATH = window.location.pathname.startsWith('/unwrapplsql') ? '/unwrapplsql' : '';
const API_ENDPOINT = window.UNWRAP_API_ENDPOINT || `${window.location.origin}${APP_BASE_PATH}/api/unwrap`;

const SAMPLE_SQL = `CREATE OR REPLACE PACKAGE BODY DEMO_SAMPLE wrapped
a000000
b2
abcd
abcd
b
74 74
pvvhHTZEOVvnvZ6ZdLLLKC/z07Ywbipff8upyi82EoctkO1iPb1JL+7/buDgQ7Wqa7O0io6CMY0V
5vR/3nrzvikNzLrVmMKtcLnTM1GsRw3FX/5IrNZWkcLzIIJSxZsvnRy8MN95zv85tTCnfVXaeBXy
dko=
/
`;


const elements = {
  input: document.getElementById('input'),
  output: document.getElementById('output'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  clearBtn: document.getElementById('clearBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  formatBtn: document.getElementById('formatBtn'),
  scrollTopBtn: document.getElementById('scrollTopBtn'),
  themeToggle: document.getElementById('themeToggle'),
  lineNumbersToggle: document.getElementById('lineNumbersToggle'),
  fileInput: document.getElementById('fileInput'),
  uploadBtn: document.getElementById('uploadBtn'),
  inputLineNumbers: document.getElementById('inputLineNumbers'),
  outputLineNumbers: document.getElementById('outputLineNumbers'),
  statusText: document.getElementById('statusText'),
  lineCount: document.getElementById('lineCount'),
  objectSummary: document.getElementById('objectSummary'),
  resultBadge: document.getElementById('resultBadge'),
  toastStack: document.getElementById('toastStack'),
};

let lastDetectedObject = { type: '-', name: 'Not detected' };

function setStatus(message, state = 'ready') {
  elements.statusText.textContent = message;
  elements.resultBadge.textContent = state === 'error' ? 'Error' : state === 'loading' ? 'Running' : 'Ready';
  elements.resultBadge.classList.toggle('error', state === 'error');
  elements.resultBadge.classList.toggle('success', state !== 'error');
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 2800);
}

async function analyze() {
  const input = elements.input.value.trim();
  if (!input) {
    setStatus('Paste or upload wrapped PL/SQL first', 'error');
    showToast('Paste or upload wrapped PL/SQL first', 'error');
    elements.output.value = '';
    refreshUiState();
    return;
  }

  if (!/\bwrapped\b/i.test(input)) {
    const message = 'Input does not look like wrapped PL/SQL. Include the wrapped source before unwrapping.';
    setStatus(message, 'error');
    showToast(message, 'error');
    refreshUiState();
    return;
  }

  elements.analyzeBtn.disabled = true;
  setStatus('Unwrapping code...', 'loading');
  showToast('Unwrapping started');

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Unwrap failed');
    }

    elements.output.value = cleanUnwrapOutput(data.data || '');
    setStatus('Unwrap completed successfully');
    showToast('Unwrap completed');
  } catch (error) {
    const message = getFriendlyErrorMessage(error);
    elements.output.value = message;
    setStatus(message, 'error');
    showToast(message, 'error');
  } finally {
    elements.analyzeBtn.disabled = false;
    refreshUiState();
  }
}

function cleanUnwrapOutput(text) {
  return text
    .replace(/^\/\*\s*=+\s*Unwrapped Section\s+\d+\s*=+\s*\*\/\s*\n?/gmi, '')
    .trimStart();
}

function formatCode() {
  const target = elements.output.value.trim() ? elements.output : elements.input;
  if (!target.value.trim()) {
    setStatus('Nothing to format', 'error');
    showToast('Nothing to format', 'error');
    return;
  }

  target.value = formatPlsql(target.value);
  setStatus('PL/SQL formatted');
  showToast('PL/SQL formatted');
  refreshUiState();
}

function formatPlsql(code) {
  const normalized = code
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .split('\n')
    .map(line => normalizePlsqlLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const formatted = [];
  let indent = 0;

  for (const line of normalized.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (formatted.length && formatted[formatted.length - 1] !== '') formatted.push('');
      continue;
    }

    if (isCommentLine(trimmed)) {
      formatted.push(`${'  '.repeat(indent)}${trimmed}`);
      continue;
    }

    const keywordLine = uppercasePlsqlKeywords(trimmed);
    const upper = keywordLine.toUpperCase();

    if (shouldOutdentPlsql(upper)) {
      indent = Math.max(0, indent - 1);
    }

    formatted.push(`${'  '.repeat(indent)}${alignSqlKeyword(keywordLine)}`);

    if (shouldIndentPlsql(upper)) {
      indent += 1;
    }
  }

  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function normalizePlsqlLine(line) {
  return mapOutsideStringLiterals(line.trimEnd(), part => part
    .replace(/\s+/g, ' ')
    .replace(/\s+([,);])/g, '$1')
    .replace(/([,(])\s+/g, '$1')
  );
}

function uppercasePlsqlKeywords(line) {
  const keywords = [
    'create or replace', 'package body', 'package', 'procedure', 'function', 'trigger', 'type body', 'type',
    'is', 'as', 'begin', 'declare', 'exception', 'end if', 'end loop', 'end case', 'end', 'if', 'then',
    'elsif', 'else', 'loop', 'for', 'while', 'case', 'when others then', 'when', 'select', 'distinct',
    'into', 'from', 'where', 'and', 'or', 'group by', 'order by', 'having', 'values', 'return', 'raise',
    'constant', 'number', 'varchar2', 'char', 'date', 'table of', 'index by', 'binary_integer'
  ];

  return mapOutsideStringLiterals(line, part => keywords.reduce((current, keyword) => {
    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    return current.replace(pattern, match => match.toUpperCase().replace(/\s+/g, ' '));
  }, part));
}

function mapOutsideStringLiterals(line, mapper) {
  let result = '';
  let segment = '';
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "'") {
      if (inString && line[index + 1] === "'") {
        segment += "''";
        index += 1;
        continue;
      }

      if (inString) {
        segment += char;
        result += segment;
      } else {
        result += mapper(segment);
        segment = char;
      }

      inString = !inString;
      if (!inString) segment = '';
      continue;
    }

    segment += char;
  }

  result += inString ? segment : mapper(segment);
  return result;
}

function isCommentLine(line) {
  return line.startsWith('--') || line.startsWith('/*') || line.startsWith('*') || line.endsWith('*/');
}

function shouldOutdentPlsql(upper) {
  return /^(END\b|END IF\b|END LOOP\b|END CASE\b|EXCEPTION\b|ELSE\b|ELSIF\b|WHEN\b)/.test(upper);
}

function shouldIndentPlsql(upper) {
  if (/^END\b/.test(upper)) return false;
  if (/\b(BEGIN|LOOP|THEN|CASE)\s*;?$/.test(upper)) return true;
  if (/\b(IS|AS)\s*;?$/.test(upper) && !/^TYPE\b.*\bIS\b/.test(upper)) return true;
  if (/^(EXCEPTION|ELSE|ELSIF\b|WHEN\b)/.test(upper)) return true;
  return false;
}

function alignSqlKeyword(line) {
  const sqlKeywords = ['SELECT', 'INTO', 'FROM', 'WHERE', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 'HAVING', 'VALUES', 'RETURN'];
  const upper = line.toUpperCase();
  const keyword = sqlKeywords.find(item => upper === item || upper.startsWith(`${item} `));
  if (!keyword) return line;

  const body = line.slice(keyword.length).trim();
  return `${keyword.padEnd(10, ' ')}${body}`.trimEnd();
}
function getFriendlyErrorMessage(error) {
  const rawMessage = String(error?.message || '');
  if (error instanceof TypeError && rawMessage.toLowerCase().includes('fetch')) {
    return 'Unable to connect right now. Please try again in a moment.';
  }

  if (/api returned/i.test(rawMessage)) {
    return 'The unwrap service could not process the request. Please try again.';
  }

  if (/no valid wrapped sections|base64|decompression|invalid/i.test(rawMessage)) {
    return 'This does not look like a valid wrapped PL/SQL block.';
  }

  return rawMessage || 'Something went wrong. Please try again.';
}
function clearAll() {
  elements.input.value = '';
  elements.output.value = '';
  setStatus('Waiting for input');
  showToast('Workspace cleared');
  refreshUiState();
}

function loadSample() {
  elements.input.value = SAMPLE_SQL;
  elements.output.value = '';
  setStatus('Sample loaded');
  showToast('Sample loaded');
  refreshUiState();
  elements.input.focus();
}

async function copyOutput() {
  const text = elements.output.value || elements.input.value;
  if (!text) {
    setStatus('Nothing to copy', 'error');
    showToast('Nothing to copy', 'error');
    return;
  }

  await navigator.clipboard.writeText(text);
  setStatus('Copied to clipboard');
  showToast('Copied to clipboard');
}

function downloadOutput() {
  const text = elements.output.value.trim() ? elements.output.value : elements.input.value;
  if (!text.trim()) {
    showToast('Nothing to download', 'error');
    return;
  }

  const object = detectObject(elements.output.value || elements.input.value);
  const baseName = object.name !== 'Not detected' ? object.name.replace(/[^a-z0-9_$#]+/gi, '_').toLowerCase() : 'unwrapped_plsql';
  const blob = new Blob([text], { type: 'application/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}.sql`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('SQL file downloaded');
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      showToast('Clipboard is empty', 'error');
      return;
    }

    elements.input.value = text;
    setStatus('Clipboard content pasted');
    showToast('Clipboard content pasted');
    refreshUiState();
    elements.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showToast('Clipboard access was blocked', 'error');
  }
}

function handleFile(file) {
  if (!file) return;
  if (!/\.(sql|txt)$/i.test(file.name)) {
    showToast('Please upload a .sql or .txt file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    elements.input.value = String(reader.result || '');
    elements.output.value = '';
    setStatus(`${file.name} loaded`);
    showToast(`${file.name} loaded`);
    refreshUiState();
  };
  reader.onerror = () => showToast('Could not read file', 'error');
  reader.readAsText(file);
}

function detectObject(text) {
  const source = text || '';
  const patterns = [
    ['Package body', /\bPACKAGE\s+BODY\s+([a-z][\w$#.]*)/i],
    ['Package', /\bPACKAGE\s+([a-z][\w$#.]*)/i],
    ['Function', /\bFUNCTION\s+([a-z][\w$#.]*)/i],
    ['Procedure', /\bPROCEDURE\s+([a-z][\w$#.]*)/i],
    ['Trigger', /\bTRIGGER\s+([a-z][\w$#.]*)/i],
    ['Type body', /\bTYPE\s+BODY\s+([a-z][\w$#.]*)/i],
    ['Type', /\bTYPE\s+([a-z][\w$#.]*)/i],
  ];

  for (const [type, pattern] of patterns) {
    const match = source.match(pattern);
    if (match) return { type, name: match[1].toUpperCase() };
  }

  return { type: '-', name: 'Not detected' };
}

function formatObjectSummary(object) {
  if (!object || object.name === 'Not detected') return 'Not detected';
  return `${object.name} - ${object.type}`;
}
function updateButtonStates() {
  const hasInput = Boolean(elements.input.value.trim());
  const hasOutput = Boolean(elements.output.value.trim());
  elements.analyzeBtn.disabled = !hasInput;
  elements.clearBtn.disabled = !hasInput && !hasOutput;
  elements.copyBtn.disabled = !hasInput && !hasOutput;
  elements.downloadBtn.disabled = !hasOutput;
  elements.formatBtn.disabled = !hasInput && !hasOutput;
}

function refreshUiState() {
  updateLineNumbers();
  updateStats();
}

function updateStats() {
  const inputLineCount = getLineCount(elements.input.value);
  const outputLineCount = getLineCount(elements.output.value);
  lastDetectedObject = detectObject(elements.output.value || elements.input.value);

  elements.lineCount.textContent = String(outputLineCount || inputLineCount);
  elements.objectSummary.textContent = formatObjectSummary(lastDetectedObject);
  updateButtonStates();
}

function updateLineNumbers() {
  updateLineNumberBlock(elements.input, elements.inputLineNumbers);
  updateLineNumberBlock(elements.output, elements.outputLineNumbers);
}

function updateLineNumberBlock(textarea, lineNumberElement) {
  const lines = getLineCount(textarea.value);
  lineNumberElement.textContent = lines ? Array.from({ length: lines }, (_, index) => index + 1).join('\n') : '';
}


function getLineCount(value) {
  if (!value) return 0;
  return value.replace(/\n$/, '').split('\n').length;
}

function syncScroll(textarea, lineNumberElement) {
  lineNumberElement.scrollTop = textarea.scrollTop;
}

function toggleLineNumbers() {
  document.body.classList.toggle('show-lines', elements.lineNumbersToggle.checked);
  localStorage.setItem('unwrapplsql.showLineNumbers', String(elements.lineNumbersToggle.checked));
  showToast(elements.lineNumbersToggle.checked ? 'Line numbers enabled' : 'Line numbers hidden');
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  elements.themeToggle.textContent = theme === 'light' ? 'Light theme' : 'Dark theme';
  localStorage.setItem('unwrapplsql.theme', theme);
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
  applyTheme(nextTheme);
  showToast(`${nextTheme === 'light' ? 'Light' : 'Dark'} theme enabled`);
}

function init() {
  const savedLineNumbers = localStorage.getItem('unwrapplsql.showLineNumbers') === 'true';
  elements.lineNumbersToggle.checked = savedLineNumbers;
  document.body.classList.toggle('show-lines', savedLineNumbers);

  applyTheme(localStorage.getItem('unwrapplsql.theme') || 'dark');

  elements.analyzeBtn.addEventListener('click', analyze);
  elements.clearBtn.addEventListener('click', clearAll);
  elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
  elements.fileInput.addEventListener('change', event => handleFile(event.target.files[0]));
  elements.loadSampleBtn.addEventListener('click', loadSample);
  elements.copyBtn.addEventListener('click', copyOutput);
  elements.downloadBtn.addEventListener('click', downloadOutput);
  elements.formatBtn.addEventListener('click', formatCode);
  elements.scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.lineNumbersToggle.addEventListener('change', toggleLineNumbers);

  [elements.input, elements.output].forEach((textarea) => {
    textarea.addEventListener('input', refreshUiState);
    textarea.addEventListener('scroll', () => {
      const lineNumberElement = textarea === elements.input ? elements.inputLineNumbers : elements.outputLineNumbers;
      syncScroll(textarea, lineNumberElement);
    });
  });

  refreshUiState();
}

init();
