const elements = {
  inputToken: document.getElementById('inputToken'),
  headerOutput: document.getElementById('headerOutput'),
  payloadOutput: document.getElementById('payloadOutput'),
  inputMeta: document.getElementById('inputMeta'),
  headerMeta: document.getElementById('headerMeta'),
  payloadMeta: document.getElementById('payloadMeta'),
  statusPill: document.getElementById('statusPill'),
  statusMessage: document.getElementById('statusMessage'),
  smartHint: document.getElementById('smartHint'),
  smartAction: document.getElementById('smartAction'),
  decodeBtn: document.getElementById('decodeBtn'),
  copyHeaderBtn: document.getElementById('copyHeaderBtn'),
  copyPayloadBtn: document.getElementById('copyPayloadBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearBtn: document.getElementById('clearBtn'),
  algValue: document.getElementById('algValue'),
  issValue: document.getElementById('issValue'),
  subValue: document.getElementById('subValue'),
  audValue: document.getElementById('audValue'),
  expValue: document.getElementById('expValue'),
  signatureValue: document.getElementById('signatureValue'),
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

const SAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZXZ0b29sc3RhY2suaW4iLCJzdWIiOiJkZW1vLXVzZXIiLCJhdWQiOiJkZXZ0b29sc3RhY2stYXBpIiwiZXhwIjoyMDk5OTk5OTk5LCJpYXQiOjE3MTQ3NjEwMDAsIm5iZiI6MTcxNDc2MTAwMCwic2NvcGUiOiJyZWFkOndyaXRlIiwicm9sZSI6ImRldmVsb3BlciJ9.c2lnbmF0dXJl';

function initTheme() {
  const savedTheme = localStorage.getItem('jwtdecoder-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('jwtdecoder-theme', theme);
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
  updateMeta(elements.inputToken, elements.inputMeta);
  updateMeta(elements.headerOutput, elements.headerMeta);
  updateMeta(elements.payloadOutput, elements.payloadMeta);
}

function setStatus(type, message) {
  elements.statusPill.className = `status-pill ${type}`;
  elements.statusPill.textContent =
    type === 'success' ? 'Decoded' :
    type === 'error' ? 'Error' :
    type === 'warning' ? 'Suggestion' :
    'Ready';
  elements.statusMessage.textContent = message;
}

function looksLikeJwt(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  return parts.length === 3 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part));
}

function normalizeBase64Url(value) {
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  if (remainder) {
    normalized += '='.repeat(4 - remainder);
  }
  return normalized;
}

function binaryToBytes(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeBase64UrlToText(value) {
  const normalized = normalizeBase64Url(value);
  const binary = atob(normalized);
  const bytes = binaryToBytes(binary);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function parseJwtSection(segment, label) {
  let decodedText;
  try {
    decodedText = decodeBase64UrlToText(segment);
  } catch (error) {
    throw new Error(`Unable to decode the JWT ${label} segment.`);
  }

  try {
    return JSON.parse(decodedText);
  } catch (error) {
    throw new Error(`The JWT ${label} segment is not valid JSON.`);
  }
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatClaimValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function formatTimestampClaim(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });
}

function clearClaimCards() {
  elements.algValue.textContent = '—';
  elements.issValue.textContent = '—';
  elements.subValue.textContent = '—';
  elements.audValue.textContent = '—';
  elements.expValue.textContent = '—';
  elements.signatureValue.textContent = 'Not verified';
}

function populateClaimCards(header, payload, signature) {
  elements.algValue.textContent = formatClaimValue(header.alg);
  elements.issValue.textContent = formatClaimValue(payload.iss);
  elements.subValue.textContent = formatClaimValue(payload.sub);
  elements.audValue.textContent = formatClaimValue(payload.aud);
  elements.expValue.textContent = formatTimestampClaim(payload.exp);
  elements.signatureValue.textContent = signature ? `Present (${signature.length} chars)` : 'Missing';
}

function refreshSmartHint() {
  const value = elements.inputToken.value;
  const hasInput = value.trim().length > 0;
  const detected = looksLikeJwt(value);

  if (!hasInput) {
    elements.smartHint.textContent = 'Smart detection looks for the three-section JWT format: header.payload.signature';
    elements.smartAction.hidden = true;
    setStatus('idle', 'Paste a JWT on the left to inspect the header, payload, and token timing claims.');
    return;
  }

  if (detected) {
    elements.smartHint.textContent = 'This token matches the standard JWT structure. Decode is likely the right next step.';
    elements.smartAction.hidden = false;
    setStatus('warning', 'Input looks like a JWT. Decode is recommended.');
    return;
  }

  elements.smartHint.textContent = 'Input does not match the standard three-section JWT format yet.';
  elements.smartAction.hidden = true;
  setStatus('idle', 'JWT format not detected yet. Check for header.payload.signature structure.');
}

function ensureInput() {
  if (elements.inputToken.value.length === 0) {
    setStatus('error', 'Paste a JWT before running the decoder.');
    toast('Paste a token first.', 'error');
    return false;
  }

  if (elements.inputToken.value.length > 1024 * 1024) {
    setStatus('error', 'Input is larger than the recommended 1 MB browser processing size.');
    toast('Input is larger than the recommended 1 MB size.', 'error');
    return false;
  }

  return true;
}

function decodeJwt() {
  if (!ensureInput()) return;

  const trimmed = elements.inputToken.value.trim();
  if (!looksLikeJwt(trimmed)) {
    elements.headerOutput.value = '';
    elements.payloadOutput.value = '';
    clearClaimCards();
    updateAllMeta();
    setStatus('error', 'Invalid JWT structure. A token should contain three Base64URL sections separated by periods.');
    toast('Invalid JWT structure.', 'error');
    return;
  }

  try {
    const [headerSegment, payloadSegment, signatureSegment] = trimmed.split('.');
    const header = parseJwtSection(headerSegment, 'header');
    const payload = parseJwtSection(payloadSegment, 'payload');

    elements.headerOutput.value = formatJson(header);
    elements.payloadOutput.value = formatJson(payload);
    populateClaimCards(header, payload, signatureSegment);
    updateAllMeta();
    setStatus('success', 'JWT decoded successfully. Signature is shown for inspection but not cryptographically verified.');
    toast('JWT decoded.');
  } catch (error) {
    elements.headerOutput.value = '';
    elements.payloadOutput.value = '';
    clearClaimCards();
    updateAllMeta();
    setStatus('error', error.message);
    toast('JWT decode failed.', 'error');
  }
}

async function copyText(text, emptyMessage, successMessage) {
  if (!text) {
    toast(emptyMessage, 'error');
    return;
  }
  await navigator.clipboard.writeText(text);
  toast(successMessage);
}

function downloadDecodedOutput() {
  if (!elements.headerOutput.value && !elements.payloadOutput.value) {
    toast('Decode a JWT before downloading.', 'error');
    return;
  }

  const content = `Header\n======\n${elements.headerOutput.value}\n\nPayload\n=======\n${elements.payloadOutput.value}\n`;
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'jwt-decoded.json';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Decoded JWT downloaded.');
}

function clearAll() {
  elements.inputToken.value = '';
  elements.headerOutput.value = '';
  elements.payloadOutput.value = '';
  clearClaimCards();
  updateAllMeta();
  refreshSmartHint();
}

elements.inputToken.addEventListener('input', () => {
  updateAllMeta();
  refreshSmartHint();
});

elements.inputToken.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    decodeJwt();
  }
});

elements.decodeBtn.addEventListener('click', decodeJwt);
elements.copyHeaderBtn.addEventListener('click', () => copyText(elements.headerOutput.value, 'Decode a JWT before copying the header.', 'Header copied.'));
elements.copyPayloadBtn.addEventListener('click', () => copyText(elements.payloadOutput.value, 'Decode a JWT before copying the payload.', 'Payload copied.'));
elements.downloadBtn.addEventListener('click', downloadDecodedOutput);
elements.clearBtn.addEventListener('click', clearAll);
elements.smartAction.addEventListener('click', decodeJwt);
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

initTheme();
elements.inputToken.value = SAMPLE_TOKEN;
updateAllMeta();
refreshSmartHint();
decodeJwt();
