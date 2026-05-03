const elements = {
  inputYaml: document.getElementById('inputYaml'),
  outputYaml: document.getElementById('outputYaml'),
  inputMeta: document.getElementById('inputMeta'),
  outputMeta: document.getElementById('outputMeta'),
  statusPill: document.getElementById('statusPill'),
  statusMessage: document.getElementById('statusMessage'),
  formatBtn: document.getElementById('formatBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearBtn: document.getElementById('clearBtn'),
  advancedToggle: document.getElementById('advancedToggle'),
  advancedOptions: document.getElementById('advancedOptions'),
  indentSize: document.getElementById('indentSize'),
  sortKeys: document.getElementById('sortKeys'),
  noRefs: document.getElementById('noRefs'),
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

const SAMPLE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: devtoolstack-api
  labels:
    app: devtoolstack
spec:
  replicas: 2
  selector:
    matchLabels:
      app: devtoolstack
  template:
    metadata:
      labels:
        app: devtoolstack
    spec:
      containers:
        - name: web
          image: devtoolstack/app:latest
          ports:
            - containerPort: 8080
          env:
            - name: ENVIRONMENT
              value: production`;

function initTheme() {
  const savedTheme = localStorage.getItem('yamlformatter-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('yamlformatter-theme', theme);
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
  updateMeta(elements.inputYaml, elements.inputMeta);
  updateMeta(elements.outputYaml, elements.outputMeta);
}

function setStatus(type, message) {
  elements.statusPill.className = `status-pill ${type}`;
  elements.statusPill.textContent = type === 'success' ? 'Valid YAML' : type === 'error' ? 'Error' : 'Ready';
  elements.statusMessage.textContent = message;
}

function getYamlError(error) {
  if (!error) return null;
  const line = typeof error.mark?.line === 'number' ? error.mark.line + 1 : null;
  const column = typeof error.mark?.column === 'number' ? error.mark.column + 1 : null;
  const message = error.reason || error.message || 'Invalid YAML.';
  return { line, column, message };
}

function formatYaml() {
  const input = elements.inputYaml.value;
  if (!input.trim()) {
    setStatus('error', 'Paste YAML before formatting.');
    toast('Paste YAML before formatting.', 'error');
    elements.outputYaml.value = '';
    updateAllMeta();
    return;
  }

  if (input.length > 1024 * 1024) {
    setStatus('error', 'Input is larger than the recommended 1 MB browser formatting size.');
    toast('YAML is larger than the recommended 1 MB size.', 'error');
    return;
  }

  try {
    const parsed = jsyaml.load(input, { json: false });
    const formatted = jsyaml.dump(parsed, {
      indent: Number(elements.indentSize.value),
      sortKeys: elements.sortKeys.checked,
      noRefs: elements.noRefs.checked,
      lineWidth: 0
    }).trimEnd();

    elements.outputYaml.value = formatted;
    updateAllMeta();
    setStatus('success', 'YAML formatted successfully.');
    toast('YAML formatted.');
  } catch (error) {
    const yamlError = getYamlError(error);
    const location = yamlError?.line ? `Line ${yamlError.line}${yamlError.column ? `, column ${yamlError.column}` : ''}: ` : '';
    setStatus('error', `${location}${yamlError?.message || 'Invalid YAML.'}`);
    toast('YAML validation failed.', 'error');
    elements.outputYaml.value = '';
    updateAllMeta();
  }
}

async function copyOutput() {
  if (!elements.outputYaml.value) {
    toast('Format YAML before copying output.', 'error');
    return;
  }
  await navigator.clipboard.writeText(elements.outputYaml.value);
  toast('Formatted YAML copied.');
}

function downloadOutput() {
  if (!elements.outputYaml.value) {
    toast('Format YAML before downloading.', 'error');
    return;
  }
  const blob = new Blob([elements.outputYaml.value], { type: 'text/yaml;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'formatted.yaml';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('YAML downloaded.');
}

function clearAll() {
  elements.inputYaml.value = '';
  elements.outputYaml.value = '';
  setStatus('idle', 'Paste YAML on the left and run the formatter.');
  updateAllMeta();
}

function toggleAdvanced() {
  const expanded = elements.advancedToggle.getAttribute('aria-expanded') === 'true';
  elements.advancedToggle.setAttribute('aria-expanded', String(!expanded));
  elements.advancedOptions.hidden = expanded;
}

elements.inputYaml.addEventListener('input', updateAllMeta);
elements.formatBtn.addEventListener('click', formatYaml);
elements.copyBtn.addEventListener('click', copyOutput);
elements.downloadBtn.addEventListener('click', downloadOutput);
elements.clearBtn.addEventListener('click', clearAll);
elements.advancedToggle.addEventListener('click', toggleAdvanced);
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

initTheme();
elements.inputYaml.value = SAMPLE_YAML;
formatYaml();
