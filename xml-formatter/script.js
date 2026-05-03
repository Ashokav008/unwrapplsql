const elements = {
  inputXml: document.getElementById('inputXml'),
  outputXml: document.getElementById('outputXml'),
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
  minifyXml: document.getElementById('minifyXml'),
  removeComments: document.getElementById('removeComments'),
  themeToggle: document.getElementById('themeToggle'),
  toastStack: document.getElementById('toastStack')
};

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cus="http://example.com/customer">
  <soapenv:Header/>
  <soapenv:Body>
    <cus:GetCustomerResponse>
      <cus:Customer id="C-1024" status="active">
        <cus:Name>Dev Tool Stack</cus:Name>
        <cus:Tier>gold</cus:Tier>
        <cus:LastUpdated>2026-05-03T19:00:00Z</cus:LastUpdated>
      </cus:Customer>
    </cus:GetCustomerResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

function initTheme() {
  const savedTheme = localStorage.getItem('xmlformatter-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('xmlformatter-theme', theme);
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  elements.toastStack.appendChild(item);
  window.setTimeout(() => item.remove(), 2800);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function updateMeta(textarea, meta) {
  const value = textarea.value;
  const lines = value ? value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length : 0;
  meta.textContent = `${lines} lines | ${value.length} characters`;
}

function updateAllMeta() {
  updateMeta(elements.inputXml, elements.inputMeta);
  updateMeta(elements.outputXml, elements.outputMeta);
}

function setStatus(type, message) {
  elements.statusPill.className = `status-pill ${type}`;
  elements.statusPill.textContent = type === 'success' ? 'Valid XML' : type === 'error' ? 'Error' : 'Ready';
  elements.statusMessage.textContent = message;
}

function getParserError(xmlDocument) {
  const parserError = xmlDocument.querySelector('parsererror');
  if (!parserError) return null;

  const rawText = parserError.textContent.replace(/\s+/g, ' ').trim();
  const lineMatch = rawText.match(/(?:line|Line)\s+(\d+)/);
  const columnMatch = rawText.match(/(?:column|Column)\s+(\d+)/);

  return {
    message: rawText,
    line: lineMatch ? Number(lineMatch[1]) : null,
    column: columnMatch ? Number(columnMatch[1]) : null
  };
}

function serializeAttributes(node) {
  return Array.from(node.attributes)
    .map(attribute => ` ${attribute.name}="${escapeXml(attribute.value)}"`)
    .join('');
}

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function serializeNode(node, depth, options) {
  const indent = options.minify ? '' : ' '.repeat(options.indentSize * depth);
  const childIndent = options.minify ? '' : ' '.repeat(options.indentSize * (depth + 1));

  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    return `${indent}<?${node.target} ${node.data}?>`;
  }

  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    return `${indent}<![CDATA[${node.nodeValue}]]>`;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    if (options.removeComments) return '';
    return `${indent}<!--${node.nodeValue}-->`;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeText(node.nodeValue || '');
    return text.trim() ? `${indent}${escapeXml(text)}` : '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tagName = node.tagName;
  const attributes = serializeAttributes(node);
  const children = Array.from(node.childNodes)
    .map(child => serializeNode(child, depth + 1, options))
    .filter(Boolean);

  const textChildren = Array.from(node.childNodes).filter(child => child.nodeType === Node.TEXT_NODE && normalizeText(child.nodeValue || '').trim());
  const hasOnlyInlineText = textChildren.length === 1 && node.childNodes.length === 1;

  if (!children.length) {
    return `${indent}<${tagName}${attributes}/>`;
  }

  if (hasOnlyInlineText) {
    return `${indent}<${tagName}${attributes}>${escapeXml(normalizeText(textChildren[0].nodeValue || ''))}</${tagName}>`;
  }

  if (options.minify) {
    return `<${tagName}${attributes}>${children.map(line => line.trim()).join('')}</${tagName}>`;
  }

  return `${indent}<${tagName}${attributes}>\n${children.map(line => line.startsWith(childIndent) ? line : `${childIndent}${line.trimStart()}`).join('\n')}\n${indent}</${tagName}>`;
}

function buildXmlString(xmlDocument, options, declaration) {
  const body = Array.from(xmlDocument.childNodes)
    .map(node => serializeNode(node, 0, options))
    .filter(Boolean)
    .join(options.minify ? '' : '\n')
    .trim();

  if (!declaration) return body;
  return options.minify ? `${declaration}${body}` : `${declaration}\n${body}`;
}

function extractDeclaration(xml) {
  const match = xml.match(/^\s*(<\?xml[\s\S]*?\?>)/i);
  return match ? match[1] : '';
}

function formatXml() {
  const input = elements.inputXml.value;
  if (!input.trim()) {
    setStatus('error', 'Paste XML before formatting.');
    toast('Paste XML before formatting.', 'error');
    elements.outputXml.value = '';
    updateAllMeta();
    return;
  }

  if (input.length > 1024 * 1024) {
    setStatus('error', 'Input is larger than the recommended 1 MB browser formatting size.');
    toast('XML is larger than the recommended 1 MB size.', 'error');
    return;
  }

  const parser = new DOMParser();
  const xmlDocument = parser.parseFromString(input, 'application/xml');
  const parserError = getParserError(xmlDocument);
  if (parserError) {
    const location = parserError.line ? `Line ${parserError.line}${parserError.column ? `, column ${parserError.column}` : ''}: ` : '';
    setStatus('error', `${location}${parserError.message}`);
    toast('XML validation failed.', 'error');
    elements.outputXml.value = '';
    updateAllMeta();
    return;
  }

  const options = {
    indentSize: Number(elements.indentSize.value),
    minify: elements.minifyXml.checked,
    removeComments: elements.removeComments.checked
  };

  const declaration = extractDeclaration(input);
  const formatted = buildXmlString(xmlDocument, options, declaration);
  elements.outputXml.value = formatted;
  updateAllMeta();
  setStatus('success', options.minify ? 'XML minified successfully.' : 'XML formatted successfully.');
  toast(options.minify ? 'XML minified.' : 'XML formatted.');
}

async function copyOutput() {
  if (!elements.outputXml.value) {
    toast('Format XML before copying output.', 'error');
    return;
  }
  await navigator.clipboard.writeText(elements.outputXml.value);
  toast('Formatted XML copied.');
}

function downloadOutput() {
  if (!elements.outputXml.value) {
    toast('Format XML before downloading.', 'error');
    return;
  }
  const blob = new Blob([elements.outputXml.value], { type: 'application/xml;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'formatted.xml';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('XML downloaded.');
}

function clearAll() {
  elements.inputXml.value = '';
  elements.outputXml.value = '';
  setStatus('idle', 'Paste XML on the left and run the formatter.');
  updateAllMeta();
}

function toggleAdvanced() {
  const expanded = elements.advancedToggle.getAttribute('aria-expanded') === 'true';
  elements.advancedToggle.setAttribute('aria-expanded', String(!expanded));
  elements.advancedOptions.hidden = expanded;
}

elements.inputXml.addEventListener('input', updateAllMeta);
elements.formatBtn.addEventListener('click', formatXml);
elements.copyBtn.addEventListener('click', copyOutput);
elements.downloadBtn.addEventListener('click', downloadOutput);
elements.clearBtn.addEventListener('click', clearAll);
elements.advancedToggle.addEventListener('click', toggleAdvanced);
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
initTheme();
elements.inputXml.value = SAMPLE_XML;
formatXml();
