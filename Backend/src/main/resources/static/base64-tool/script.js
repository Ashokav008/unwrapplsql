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
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

const SAMPLE_TEXT = `Authorization: Basic ZGV2dG9vbHN0YWNrOnNlY3JldA==
Message:
DevToolStack helps teams debug encoded values quickly.`;

function initTheme() {
  const savedTheme = localStorage.getItem('base64tool-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('base64tool-theme', theme);
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

function looksLikeBase64(value) {
  const compact = value.replace(/\s+/g, '').trim();
  if (compact.length < 8) return false;
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(compact)) return false;

  try {
    const normalized = normalizeBase64(compact);
    atob(normalized);
    return true;
  } catch (error) {
    return false;
  }
}

function normalizeBase64(value) {
  let normalized = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  if (remainder) {
    normalized += '='.repeat(4 - remainder);
  }
  return normalized;
}

function bytesToBinary(bytes) {
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return binary;
}

function encodeToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return btoa(bytesToBinary(bytes));
}

function binaryToBytes(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeFromBase64(value) {
  const normalized = normalizeBase64(value);
  const binary = atob(normalized);
  const bytes = binaryToBytes(binary);

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    return new TextDecoder().decode(bytes);
  }
}

function refreshSmartHint() {
  const value = elements.inputText.value;
  const hasInput = value.trim().length > 0;
  const detected = looksLikeBase64(value);

  if (!hasInput) {
    elements.smartHint.textContent = 'Smart detection checks whether the input looks like Base64.';
    elements.smartAction.hidden = true;
    setStatus('idle', 'Paste text or Base64 on the left, then choose encode or decode.');
    return;
  }

  if (detected) {
    elements.smartHint.textContent = 'This input matches a valid Base64 pattern. Decode is usually the right next step.';
    elements.smartAction.hidden = false;
    setStatus('warning', 'Input looks like Base64. Decode is recommended.');
    return;
  }

  elements.smartHint.textContent = 'Input does not look like Base64 yet. Encode is likely the right next step.';
  elements.smartAction.hidden = true;
  setStatus('idle', 'Input looks like regular text. Encode is recommended.');
}

function ensureInput() {
  if (elements.inputText.value.length === 0) {
    setStatus('error', 'Paste some text or Base64 before running the tool.');
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
    elements.outputText.value = encodeToBase64(elements.inputText.value);
    updateAllMeta();
    setStatus('success', 'Text encoded to Base64 successfully.');
    toast('Encoded to Base64.');
  } catch (error) {
    setStatus('error', 'Unable to encode the current input.');
    toast('Encoding failed.', 'error');
  }
}

function handleDecode() {
  if (!ensureInput()) return;

  try {
    if (!looksLikeBase64(elements.inputText.value)) {
      throw new Error('Invalid Base64 input');
    }

    elements.outputText.value = decodeFromBase64(elements.inputText.value);
    updateAllMeta();
    setStatus('success', 'Base64 decoded successfully.');
    toast('Decoded Base64.');
  } catch (error) {
    elements.outputText.value = '';
    updateAllMeta();
    setStatus('error', 'Invalid Base64 input. Check the string for missing characters, bad padding, or unsupported content.');
    toast('Invalid Base64 input.', 'error');
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
  link.download = 'base64-output.txt';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Output downloaded.');
}

function clearAll() {
  elements.inputText.value = '';
  elements.outputText.value = '';
  updateAllMeta();
  setStatus('idle', 'Paste text or Base64 on the left, then choose encode or decode.');
  refreshSmartHint();
}

elements.inputText.addEventListener('input', () => {
  updateAllMeta();
  refreshSmartHint();
});

elements.inputText.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    if (looksLikeBase64(elements.inputText.value)) {
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
