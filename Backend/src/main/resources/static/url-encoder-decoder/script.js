const elements = {
  inputText: document.getElementById('inputText'),
  outputText: document.getElementById('outputText'),
  inputMeta: document.getElementById('inputMeta'),
  outputMeta: document.getElementById('outputMeta'),
  statusPill: document.getElementById('statusPill'),
  statusMessage: document.getElementById('statusMessage'),
  smartHint: document.getElementById('smartHint'),
  smartAction: document.getElementById('smartAction'),
  encodeBtn: document.getElementById('encodeBtn'),
  decodeBtn: document.getElementById('decodeBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearBtn: document.getElementById('clearBtn'),
  fullUrlMode: document.getElementById('fullUrlMode'),
  plusAsSpace: document.getElementById('plusAsSpace'),
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

const SAMPLE_TEXT = `https://www.devtoolstack.in/search?q=xml formatter&redirect=https://www.devtoolstack.in/base64-tool/?ref=dashboard
name=Dev Tool Stack&message=URL encode this value`;

function initTheme() {
  const savedTheme = localStorage.getItem('urltool-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('urltool-theme', theme);
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  elements.toastStack.appendChild(item);
  window.setTimeout(() => item.remove(), 2800);
}

function updateMeta(textarea, meta) {
  const value = textarea.value;
  const lines = value ? value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length : 0;
  meta.textContent = `${lines} lines | ${value.length} characters`;
}

function updateAllMeta() {
  updateMeta(elements.inputText, elements.inputMeta);
  updateMeta(elements.outputText, elements.outputMeta);
}

function setStatus(type, message) {
  elements.statusPill.className = `status-pill ${type}`;
  elements.statusPill.textContent =
    type === 'success' ? 'Done' :
    type === 'error' ? 'Error' :
    type === 'warning' ? 'Suggestion' :
    'Ready';
  elements.statusMessage.textContent = message;
}

function looksEncoded(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /%[0-9A-Fa-f]{2}/.test(trimmed) || /\+/.test(trimmed);
}

function mapLines(value, transformer) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.length ? transformer(line) : '')
    .join('\n');
}

function encodeValue(value) {
  const encoder = elements.fullUrlMode.checked ? encodeURI : encodeURIComponent;
  return mapLines(value, line => encoder(line));
}

function decodeValue(value) {
  const prepared = elements.plusAsSpace.checked
    ? value.replace(/\+/g, ' ')
    : value;
  return mapLines(prepared, line => decodeURIComponent(line));
}

function refreshSmartHint() {
  const value = elements.inputText.value;
  const hasInput = value.trim().length > 0;
  const detected = looksEncoded(value);

  if (!hasInput) {
    elements.smartHint.textContent = 'Smart detection checks whether the input already looks percent-encoded.';
    elements.smartAction.hidden = true;
    setStatus('idle', 'Paste plain text or an encoded URL value on the left, then choose encode or decode.');
    return;
  }

  if (detected) {
    elements.smartHint.textContent = 'This input already contains encoded characters. Decode is likely the right next step.';
    elements.smartAction.hidden = false;
    setStatus('warning', 'Input looks encoded. Decode is recommended.');
    return;
  }

  elements.smartHint.textContent = 'Input looks like regular text or a raw URL. Encode is likely the right next step.';
  elements.smartAction.hidden = true;
  setStatus('idle', 'Input looks unencoded. Encode is recommended.');
}

function ensureInput() {
  if (elements.inputText.value.length === 0) {
    setStatus('error', 'Paste a URL or text value before running the tool.');
    toast('Paste some text first.', 'error');
    return false;
  }

  if (elements.inputText.value.length > 1024 * 1024) {
    setStatus('error', 'Input is larger than the recommended 1 MB browser processing size.');
    toast('Input is larger than the recommended 1 MB size.', 'error');
    return false;
  }

  return true;
}

function handleEncode() {
  if (!ensureInput()) return;

  try {
    elements.outputText.value = encodeValue(elements.inputText.value);
    updateAllMeta();
    setStatus('success', elements.fullUrlMode.checked ? 'URL encoded successfully in full URL mode.' : 'Value encoded successfully for URL use.');
    toast(elements.fullUrlMode.checked ? 'Encoded in full URL mode.' : 'Encoded for URL use.');
  } catch (error) {
    setStatus('error', 'Unable to encode the current input.');
    toast('Encoding failed.', 'error');
  }
}

function handleDecode() {
  if (!ensureInput()) return;

  try {
    elements.outputText.value = decodeValue(elements.inputText.value);
    updateAllMeta();
    setStatus('success', 'Encoded URL content decoded successfully.');
    toast('Decoded URL content.');
  } catch (error) {
    elements.outputText.value = '';
    updateAllMeta();
    setStatus('error', 'Invalid percent-encoded input. Check for incomplete % sequences or malformed characters.');
    toast('Invalid encoded input.', 'error');
  }
}

async function copyOutput() {
  if (!elements.outputText.value) {
    toast('Generate output before copying.', 'error');
    return;
  }

  await navigator.clipboard.writeText(elements.outputText.value);
  toast('Output copied.');
}

function downloadOutput() {
  if (!elements.outputText.value) {
    toast('Generate output before downloading.', 'error');
    return;
  }

  const blob = new Blob([elements.outputText.value], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'url-output.txt';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Output downloaded.');
}

function clearAll() {
  elements.inputText.value = '';
  elements.outputText.value = '';
  updateAllMeta();
  refreshSmartHint();
}

elements.inputText.addEventListener('input', () => {
  updateAllMeta();
  refreshSmartHint();
});

elements.inputText.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (looksEncoded(elements.inputText.value)) {
      handleDecode();
    } else {
      handleEncode();
    }
  }
});

elements.encodeBtn.addEventListener('click', handleEncode);
elements.decodeBtn.addEventListener('click', handleDecode);
elements.copyBtn.addEventListener('click', copyOutput);
elements.downloadBtn.addEventListener('click', downloadOutput);
elements.clearBtn.addEventListener('click', clearAll);
elements.smartAction.addEventListener('click', handleDecode);
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

initTheme();
elements.inputText.value = SAMPLE_TEXT;
updateAllMeta();
refreshSmartHint();
