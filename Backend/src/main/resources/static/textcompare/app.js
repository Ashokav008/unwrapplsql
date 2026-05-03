const elements = {
  leftText: document.getElementById('leftText'),
  rightText: document.getElementById('rightText'),
  leftMeta: document.getElementById('leftMeta'),
  rightMeta: document.getElementById('rightMeta'),
  copyLeftBtn: document.getElementById('copyLeftBtn'),
  copyRightBtn: document.getElementById('copyRightBtn'),
  leftFile: document.getElementById('leftFile'),
  rightFile: document.getElementById('rightFile'),
  compareBtn: document.getElementById('compareBtn'),
  compareHeroBtn: document.getElementById('compareHeroBtn'),
  sampleBtn: document.getElementById('sampleBtn'),
  swapBtn: document.getElementById('swapBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  prevDiffBtn: document.getElementById('prevDiffBtn'),
  nextDiffBtn: document.getElementById('nextDiffBtn'),
  diffCounter: document.getElementById('diffCounter'),
  themeToggle: document.getElementById('themeToggle'),
  viewMode: document.getElementById('viewMode'),
  compareLevel: document.getElementById('compareLevel'),
  ignoreCase: document.getElementById('ignoreCase'),
  trimLines: document.getElementById('trimLines'),
  normalizeWhitespace: document.getElementById('normalizeWhitespace'),
  ignoreBlankLines: document.getElementById('ignoreBlankLines'),
  ignorePunctuation: document.getElementById('ignorePunctuation'),
  showOnlyChanges: document.getElementById('showOnlyChanges'),
  diffOutput: document.getElementById('diffOutput'),
  sameCount: document.getElementById('sameCount'),
  addedCount: document.getElementById('addedCount'),
  removedCount: document.getElementById('removedCount'),
  changedCount: document.getElementById('changedCount'),
  toastStack: document.getElementById('toastStack')
};

const sampleLeft = `CREATE OR REPLACE PROCEDURE sync_customer IS
BEGIN
  INSERT INTO audit_log(event_name, created_at)
  VALUES ('CUSTOMER_SYNC_STARTED', SYSDATE);

  update customers
     set status = 'ACTIVE'
   where last_order_date > sysdate - 90;
END;`;

const sampleRight = `CREATE OR REPLACE PROCEDURE sync_customer IS
BEGIN
  INSERT INTO audit_log(event_name, created_at, source_app)
  VALUES ('CUSTOMER_SYNC_STARTED', SYSDATE, 'CRM');

  UPDATE customers
     SET status = 'ACTIVE', updated_at = SYSDATE
   WHERE last_order_date > SYSDATE - 120;

  COMMIT;
END;`;

let lastReport = '';
let lastRows = [];
let currentDiffIds = [];
let currentDiffPointer = -1;
let compareTimer = null;

function initTheme() {
  const savedTheme = localStorage.getItem('textcompare-theme');
  const theme = savedTheme || 'dark';
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('textcompare-theme', theme);
  elements.themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  elements.toastStack.appendChild(item);
  window.setTimeout(() => item.remove(), 2800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function splitLines(text) {
  if (!text) return [];
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function normalizeForCompare(value) {
  let text = String(value);
  if (elements.trimLines.checked) text = text.trim();
  if (elements.normalizeWhitespace.checked) text = text.replace(/\s+/g, ' ');
  if (elements.ignorePunctuation.checked) text = text.replace(/[\p{P}\p{S}]/gu, '');
  if (elements.ignoreCase.checked) text = text.toLowerCase();
  return text;
}

function buildLineItems(text) {
  return splitLines(text)
    .map((raw, index) => ({ raw, key: normalizeForCompare(raw), line: index + 1 }))
    .filter(item => !(elements.ignoreBlankLines.checked && item.key === ''));
}

function tokenize(text, level) {
  if (level === 'char') return Array.from(text);
  return text.match(/\s+|[^\s]+/g) || [];
}

function buildTokenDiff(oldText, newText) {
  const level = elements.compareLevel.value;
  if (level === 'line') return { left: escapeHtml(oldText), right: escapeHtml(newText) };
  const oldTokens = tokenize(oldText, level);
  const newTokens = tokenize(newText, level);
  const rows = lcsDiff(
    oldTokens.map((raw, index) => ({ raw, key: normalizeForCompare(raw), line: index + 1 })),
    newTokens.map((raw, index) => ({ raw, key: normalizeForCompare(raw), line: index + 1 }))
  );
  let left = '';
  let right = '';
  rows.forEach(row => {
    if (row.type === 'same') {
      left += escapeHtml(row.left.raw);
      right += escapeHtml(row.right.raw);
    } else if (row.type === 'removed') {
      left += `<mark class="token-remove">${escapeHtml(row.left.raw)}</mark>`;
    } else if (row.type === 'added') {
      right += `<mark class="token-add">${escapeHtml(row.right.raw)}</mark>`;
    }
  });
  return { left, right };
}

function lcsDiff(leftItems, rightItems) {
  const leftLength = leftItems.length;
  const rightLength = rightItems.length;
  const table = Array.from({ length: leftLength + 1 }, () => Array(rightLength + 1).fill(0));

  for (let leftIndex = leftLength - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightLength - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] = leftItems[leftIndex].key === rightItems[rightIndex].key
        ? table[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const rows = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < leftLength && rightIndex < rightLength) {
    if (leftItems[leftIndex].key === rightItems[rightIndex].key) {
      rows.push({ type: 'same', left: leftItems[leftIndex], right: rightItems[rightIndex] });
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      rows.push({ type: 'removed', left: leftItems[leftIndex], right: null });
      leftIndex += 1;
    } else {
      rows.push({ type: 'added', left: null, right: rightItems[rightIndex] });
      rightIndex += 1;
    }
  }
  while (leftIndex < leftLength) {
    rows.push({ type: 'removed', left: leftItems[leftIndex], right: null });
    leftIndex += 1;
  }
  while (rightIndex < rightLength) {
    rows.push({ type: 'added', left: null, right: rightItems[rightIndex] });
    rightIndex += 1;
  }
  return pairChanges(rows);
}

function pairChanges(rows) {
  const paired = [];
  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    const next = rows[index + 1];
    if (current.type === 'removed' && next?.type === 'added') {
      paired.push({ type: 'changed', left: current.left, right: next.right });
      index += 1;
    } else if (current.type === 'added' && next?.type === 'removed') {
      paired.push({ type: 'changed', left: next.left, right: current.right });
      index += 1;
    } else {
      paired.push(current);
    }
  }
  return paired;
}

function calculateStats(rows) {
  return rows.reduce((stats, row) => {
    stats[row.type] += 1;
    return stats;
  }, { same: 0, added: 0, removed: 0, changed: 0 });
}

function lineNumber(item) {
  return item ? item.line : '';
}

function lineText(item) {
  return item ? item.raw : '';
}

function getSideActionButton(row, side) {
  if (row.type === 'same') return '<div class="diff-side-action"></div>';
  if (side === 'left') {
    return `<div class="diff-side-action left">
      <button class="diff-action" type="button" aria-label="Move left text to right editor" title="Move left text to right editor" data-action="use-left" data-diff-id="${row.diffId}">&gt;&gt;&gt;</button>
    </div>`;
  }
  return `<div class="diff-side-action right">
    <button class="diff-action" type="button" aria-label="Move right text to left editor" title="Move right text to left editor" data-action="use-right" data-diff-id="${row.diffId}">&lt;&lt;&lt;</button>
  </div>`;
}

function getUnifiedActionButtons(row) {
  if (row.type === 'same') return '<div class="diff-actions"></div>';
  return `<div class="diff-actions">
    <div class="diff-side-action left">
      <button class="diff-action" type="button" aria-label="Move left text to right editor" title="Move left text to right editor" data-action="use-left" data-diff-id="${row.diffId}">&gt;&gt;&gt;</button>
    </div>
    <div class="diff-side-action right">
      <button class="diff-action" type="button" aria-label="Move right text to left editor" title="Move right text to left editor" data-action="use-right" data-diff-id="${row.diffId}">&lt;&lt;&lt;</button>
    </div>
  </div>`;
}

function renderSideBySide(rows) {
  const visibleRows = elements.showOnlyChanges.checked ? rows.filter(row => row.type !== 'same') : rows;
  if (!visibleRows.length) return renderEmpty('No visible differences', 'Turn off show only changes to view equal lines.');
  const html = visibleRows.map(row => {
    const tokenDiff = row.type === 'changed' ? buildTokenDiff(lineText(row.left), lineText(row.right)) : null;
    const activeClass = row.type !== 'same' ? ' diff-target' : '';
    return `<div class="diff-row ${row.type}${activeClass}" data-diff-id="${row.diffId}">
      ${getSideActionButton(row, 'left')}
      <div class="line-no">${lineNumber(row.left)}</div>
      <pre>${tokenDiff ? tokenDiff.left : escapeHtml(lineText(row.left))}</pre>
      <div class="line-no">${lineNumber(row.right)}</div>
      <pre>${tokenDiff ? tokenDiff.right : escapeHtml(lineText(row.right))}</pre>
      ${getSideActionButton(row, 'right')}
    </div>`;
  }).join('');
  return `<div class="side-header">
    <div class="side-header-cell">
      <span>Original</span>
      <button class="btn btn-secondary btn-small copy-side-btn" type="button" data-copy-side="left">Copy</button>
    </div>
    <div class="side-header-cell">
      <span>Changed</span>
      <button class="btn btn-secondary btn-small copy-side-btn" type="button" data-copy-side="right">Copy</button>
    </div>
  </div><div class="side-diff">${html}</div>`;
}

function renderUnified(rows) {
  const visibleRows = elements.showOnlyChanges.checked ? rows.filter(row => row.type !== 'same') : rows;
  if (!visibleRows.length) return renderEmpty('No visible differences', 'Turn off show only changes to view equal lines.');
  return `<div class="unified-diff">${visibleRows.map(row => {
    if (row.type === 'same') {
      return `<div class="unified-group same"><div class="unified-line"><span> </span><span>${lineNumber(row.left)}</span><pre>${escapeHtml(lineText(row.left))}</pre></div></div>`;
    }
    const firstLine = row.type === 'added'
      ? `<div class="unified-line added"><span>+</span><span>${lineNumber(row.right)}</span><pre>${escapeHtml(lineText(row.right))}</pre></div>`
      : `<div class="unified-line removed"><span>-</span><span>${lineNumber(row.left)}</span><pre>${escapeHtml(lineText(row.left))}</pre></div>`;
    const secondLine = row.type === 'changed'
      ? `<div class="unified-line added"><span>+</span><span>${lineNumber(row.right)}</span><pre>${escapeHtml(lineText(row.right))}</pre></div>`
      : '';
    return `<div class="unified-group ${row.type} diff-target" data-diff-id="${row.diffId}">${firstLine}${secondLine}${getUnifiedActionButtons(row)}</div>`;
  }).join('')}</div>`;
}

function renderSummary(rows, stats) {
  const changedRows = rows.filter(row => row.type !== 'same');
  return `<div class="summary-panel">
    <h3>Comparison summary</h3>
    <p>${stats.changed + stats.added + stats.removed === 0 ? 'Both inputs match after applying the selected options.' : 'Differences were found after applying the selected options.'}</p>
    <ul>
      <li>${stats.same} unchanged line pairs</li>
      <li>${stats.changed} modified line pairs</li>
      <li>${stats.added} added lines</li>
      <li>${stats.removed} removed lines</li>
    </ul>
    <h4>Changed line references</h4>
    <p>${changedRows.length ? changedRows.map(row => `${row.type}: left ${lineNumber(row.left) || '-'} / right ${lineNumber(row.right) || '-'}`).join('<br>') : 'No changed line references.'}</p>
  </div>`;
}

function renderEmpty(title, message) {
  return `<div class="empty-state"><strong>${title}</strong><p>${message}</p></div>`;
}

function buildPlainReport(rows, stats) {
  const lines = [
    'DevToolStack Text Compare Report',
    `Generated: ${new Date().toLocaleString()}`,
    `Options: ${getOptionSummary()}`,
    '',
    `Same: ${stats.same}`,
    `Added: ${stats.added}`,
    `Removed: ${stats.removed}`,
    `Changed: ${stats.changed}`,
    '',
    'Unified diff:',
    ''
  ];
  rows.forEach(row => {
    if (row.type === 'same' && !elements.showOnlyChanges.checked) lines.push(` ${lineText(row.left)}`);
    if (row.type === 'added') lines.push(`+${lineText(row.right)}`);
    if (row.type === 'removed') lines.push(`-${lineText(row.left)}`);
    if (row.type === 'changed') {
      lines.push(`-${lineText(row.left)}`);
      lines.push(`+${lineText(row.right)}`);
    }
  });
  return lines.join('\n');
}

function getOptionSummary() {
  const enabled = [];
  if (elements.ignoreCase.checked) enabled.push('ignore case');
  if (elements.trimLines.checked) enabled.push('trim line edges');
  if (elements.normalizeWhitespace.checked) enabled.push('normalize whitespace');
  if (elements.ignoreBlankLines.checked) enabled.push('ignore blank lines');
  if (elements.ignorePunctuation.checked) enabled.push('ignore punctuation');
  return `${elements.viewMode.value} view, ${elements.compareLevel.value} compare${enabled.length ? `, ${enabled.join(', ')}` : ''}`;
}

function compareText(showToast = true) {
  const left = elements.leftText.value;
  const right = elements.rightText.value;
  if (!left && !right) {
    toast('Paste or upload text before comparing.', 'error');
    return;
  }

  const rows = lcsDiff(buildLineItems(left), buildLineItems(right)).map((row, index) => ({ ...row, diffId: index }));
  const stats = calculateStats(rows);
  lastRows = rows;
  currentDiffIds = rows.filter(row => row.type !== 'same').map(row => row.diffId);
  currentDiffPointer = currentDiffIds.length ? 0 : -1;

  elements.sameCount.textContent = stats.same;
  elements.addedCount.textContent = stats.added;
  elements.removedCount.textContent = stats.removed;
  elements.changedCount.textContent = stats.changed;

  const view = elements.viewMode.value;
  elements.diffOutput.innerHTML = view === 'side'
    ? renderSideBySide(rows)
    : view === 'unified'
      ? renderUnified(rows)
      : renderSummary(rows, stats);

  updateDiffCounter();
  highlightCurrentDiff(false);
  lastReport = buildPlainReport(rows, stats);
  if (showToast) toast(stats.added + stats.removed + stats.changed ? 'Differences found.' : 'Both texts match.');
}

function updateDiffCounter() {
  const total = currentDiffIds.length;
  const current = total ? currentDiffPointer + 1 : 0;
  elements.diffCounter.textContent = `${current} / ${total}`;
  elements.prevDiffBtn.disabled = total === 0;
  elements.nextDiffBtn.disabled = total === 0;
}

function highlightCurrentDiff(scrollIntoView = true) {
  const nodes = elements.diffOutput.querySelectorAll('.diff-target');
  nodes.forEach(node => node.classList.remove('is-active'));
  if (currentDiffPointer < 0 || !currentDiffIds.length) return;
  const diffId = String(currentDiffIds[currentDiffPointer]);
  const target = elements.diffOutput.querySelector(`.diff-target[data-diff-id="${diffId}"]`);
  if (!target) return;
  target.classList.add('is-active');
  if (scrollIntoView) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function jumpDiff(step) {
  if (!currentDiffIds.length) return;
  currentDiffPointer = (currentDiffPointer + step + currentDiffIds.length) % currentDiffIds.length;
  updateDiffCounter();
  highlightCurrentDiff(true);
}

function updateMeta() {
  updateOneMeta(elements.leftText, elements.leftMeta);
  updateOneMeta(elements.rightText, elements.rightMeta);
}

function updateOneMeta(textarea, meta) {
  const value = textarea.value;
  const lines = value ? splitLines(value).length : 0;
  meta.textContent = `${lines} lines | ${value.length} characters`;
}

function queueCompare() {
  if (!elements.leftText.value && !elements.rightText.value) return;
  window.clearTimeout(compareTimer);
  compareTimer = window.setTimeout(() => compareText(false), 220);
}

function readFile(file, target) {
  if (!file) return;
  if (file.size > 1024 * 1024 * 2) {
    toast('Please upload a text file smaller than 2 MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    target.value = String(reader.result || '');
    updateMeta();
    toast(`${file.name} loaded.`);
  };
  reader.onerror = () => toast('Could not read the selected file.', 'error');
  reader.readAsText(file);
}

async function copyReport() {
  if (!lastReport) compareText(false);
  if (!lastReport) return;
  await navigator.clipboard.writeText(lastReport);
  toast('Diff report copied.');
}

async function copyEditorText(textarea, label) {
  if (!textarea.value) {
    toast(`Nothing to copy from ${label}.`, 'error');
    return;
  }
  await navigator.clipboard.writeText(textarea.value);
  toast(`${label} copied.`);
}

function copyComparedSide(side) {
  const textarea = side === 'left' ? elements.leftText : elements.rightText;
  const label = side === 'left' ? 'Original result' : 'Changed result';
  return copyEditorText(textarea, label);
}

function downloadReport() {
  if (!lastReport) compareText(false);
  if (!lastReport) return;
  const blob = new Blob([lastReport], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'text-compare-diff.txt';
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Diff report downloaded.');
}

function loadSample() {
  elements.leftText.value = sampleLeft;
  elements.rightText.value = sampleRight;
  updateMeta();
  compareText(false);
}

function clearAll() {
  elements.leftText.value = '';
  elements.rightText.value = '';
  lastReport = '';
  lastRows = [];
  currentDiffIds = [];
  currentDiffPointer = -1;
  updateMeta();
  elements.sameCount.textContent = '0';
  elements.addedCount.textContent = '0';
  elements.removedCount.textContent = '0';
  elements.changedCount.textContent = '0';
  updateDiffCounter();
  elements.diffOutput.innerHTML = renderEmpty('No comparison yet', 'Paste text into both panels and click Compare Text.');
}

function swapText() {
  const left = elements.leftText.value;
  elements.leftText.value = elements.rightText.value;
  elements.rightText.value = left;
  updateMeta();
  compareText(false);
}

function replaceLine(lines, lineNumber, value) {
  const index = Math.max(0, (lineNumber || 1) - 1);
  while (lines.length < index) lines.push('');
  if (lines.length === index) {
    lines.push(value);
  } else {
    lines[index] = value;
  }
}

function insertLine(lines, lineNumber, value) {
  const index = Math.max(0, (lineNumber || 1) - 1);
  if (index >= lines.length) {
    lines.push(value);
  } else {
    lines.splice(index, 0, value);
  }
}

function removeLine(lines, lineNumber) {
  const index = Math.max(0, (lineNumber || 1) - 1);
  if (index < lines.length) lines.splice(index, 1);
}

function applyDiffAction(diffId, action) {
  const row = lastRows.find(item => item.diffId === diffId);
  if (!row) return;

  const leftLines = splitLines(elements.leftText.value);
  const rightLines = splitLines(elements.rightText.value);

  if (row.type === 'changed') {
    if (action === 'use-left') replaceLine(rightLines, row.right.line, row.left.raw);
    if (action === 'use-right') replaceLine(leftLines, row.left.line, row.right.raw);
  }

  if (row.type === 'removed') {
    if (action === 'use-left') insertLine(rightLines, row.left.line, row.left.raw);
    if (action === 'use-right') removeLine(leftLines, row.left.line);
  }

  if (row.type === 'added') {
    if (action === 'use-left') removeLine(rightLines, row.right.line);
    if (action === 'use-right') insertLine(leftLines, row.right.line, row.right.raw);
  }

  elements.leftText.value = leftLines.join('\n');
  elements.rightText.value = rightLines.join('\n');
  updateMeta();
  compareText(false);
  toast(action === 'use-left' ? 'Moved left text to right.' : 'Moved right text to left.');
}

elements.leftText.addEventListener('input', () => {
  updateMeta();
  queueCompare();
});
elements.rightText.addEventListener('input', () => {
  updateMeta();
  queueCompare();
});
elements.leftFile.addEventListener('change', () => readFile(elements.leftFile.files[0], elements.leftText));
elements.rightFile.addEventListener('change', () => readFile(elements.rightFile.files[0], elements.rightText));
elements.copyLeftBtn.addEventListener('click', () => copyEditorText(elements.leftText, 'Original text'));
elements.copyRightBtn.addEventListener('click', () => copyEditorText(elements.rightText, 'Changed text'));
elements.compareBtn.addEventListener('click', () => compareText(false));
elements.compareHeroBtn.addEventListener('click', () => compareText(false));
elements.sampleBtn.addEventListener('click', loadSample);
elements.swapBtn.addEventListener('click', swapText);
elements.clearBtn.addEventListener('click', clearAll);
elements.copyBtn.addEventListener('click', copyReport);
elements.downloadBtn.addEventListener('click', downloadReport);
elements.prevDiffBtn.addEventListener('click', () => jumpDiff(-1));
elements.nextDiffBtn.addEventListener('click', () => jumpDiff(1));
elements.themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
elements.diffOutput.addEventListener('click', event => {
  const copyButton = event.target.closest('.copy-side-btn');
  if (copyButton) {
    copyComparedSide(copyButton.dataset.copySide);
    return;
  }
  const button = event.target.closest('.diff-action');
  if (!button) return;
  applyDiffAction(Number(button.dataset.diffId), button.dataset.action);
});

[elements.viewMode, elements.compareLevel, elements.ignoreCase, elements.trimLines, elements.normalizeWhitespace, elements.ignoreBlankLines, elements.ignorePunctuation, elements.showOnlyChanges].forEach(control => {
  control.addEventListener('change', () => {
    if (elements.leftText.value || elements.rightText.value) compareText(false);
  });
});

initTheme();
updateMeta();
updateDiffCounter();
