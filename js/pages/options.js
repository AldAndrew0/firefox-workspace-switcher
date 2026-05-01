/**
 * options.js — Logica della Dashboard
 */

// ── Stato globale ─────────────────────────────────────────────────────────────

let workspaces = [];
let activeWorkspaceId = null;
let selectedWorkspaceId = null;

const ICONS = ['📁', '💼', '🎮', '📚', '🛠', '🎨', '🌐', '📝', '🔬', '🎵', '🏠', '⭐', '🚀', '💡', '🎯', '🔒'];
const COLOR_NAMES = Object.keys(StorageAPI.COLORS);

// Modal state
let modalIcon = '📁';
let modalColor = 'blue';

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await ThemeAPI.init();
  await loadData();
  bindActions();
  handleUrlParams();
});

async function loadData() {
  [workspaces, activeWorkspaceId] = await Promise.all([
    StorageAPI.getWorkspaces(),
    StorageAPI.getActiveWorkspaceId()
  ]);
  renderSidebar();
}

// ── URL params ────────────────────────────────────────────────────────────────

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('section') === 'new') {
    openCreateModal();
  }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function renderSidebar() {
  const list = document.getElementById('sidebar-ws-list');
  list.innerHTML = '';

  workspaces.forEach(ws => {
    const li = document.createElement('li');
    li.className = 'sidebar-ws-item' +
      (ws.id === selectedWorkspaceId ? ' selected' : '') +
      (ws.id === activeWorkspaceId ? ' active-workspace' : '');
    li.dataset.id = ws.id;
    li.innerHTML = `
      <span class="sidebar-ws-icon">${ws.icon || '📁'}</span>
      <span class="sidebar-ws-name">${escapeHtml(ws.name)}</span>
    `;
    li.addEventListener('click', () => selectWorkspace(ws.id));
    list.appendChild(li);
  });
}

function selectWorkspace(id) {
  selectedWorkspaceId = id;
  renderSidebar();
  showView('workspace');
  renderWorkspaceDetail(id);
}

// ── Views ─────────────────────────────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.hidden = true;
  });
  const target = document.getElementById(`view-${name}`);
  if (target) {
    target.classList.add('active');
    target.hidden = false;
  }
  // Aggiorna stato sidebar footer
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === name);
  });
}

// ── Dettaglio workspace ───────────────────────────────────────────────────────

function renderWorkspaceDetail(id) {
  const ws = workspaces.find(w => w.id === id);
  if (!ws) return;

  const isActive = ws.id === activeWorkspaceId;

  // Header
  document.getElementById('detail-icon').textContent = ws.icon || '📁';
  document.getElementById('detail-name').textContent = ws.name;

  const tabCount = ws.tabs ? ws.tabs.length : 0;
  const groupCount = ws.nativeGroups ? ws.nativeGroups.length : 0;
  const parts = [];
  if (tabCount > 0) parts.push(`${tabCount} ${tabCount === 1 ? 'scheda' : 'schede'}`);
  if (groupCount > 0) parts.push(`${groupCount} ${groupCount === 1 ? 'gruppo' : 'gruppi'}`);
  if (isActive) parts.push('● Attiva');
  document.getElementById('detail-meta').textContent = parts.join(' · ') || 'Vuota';

  // Bottone attiva
  const btnActivate = document.getElementById('btn-activate-ws');
  if (isActive) {
    btnActivate.textContent = '✓ Area attiva';
    btnActivate.disabled = true;
    btnActivate.style.opacity = '0.6';
  } else {
    btnActivate.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M6 3l7 5-7 5V3z" fill="currentColor"/>
      </svg> Attiva area`;
    btnActivate.disabled = false;
    btnActivate.style.opacity = '';
  }

  // Picker icona
  renderIconPicker(ws.icon || '📁');
  renderColorPicker(ws.color || 'blue');

  // Lista schede
  renderTabsList(ws);
}

function renderIconPicker(selectedIcon) {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.className = 'icon-option' + (icon === selectedIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => updateCurrentWsField('icon', icon));
    picker.appendChild(btn);
  });
}

function renderColorPicker(selectedColor) {
  const picker = document.getElementById('color-picker');
  picker.innerHTML = '';
  COLOR_NAMES.forEach(colorName => {
    const btn = document.createElement('button');
    btn.className = 'color-dot' + (colorName === selectedColor ? ' selected' : '');
    btn.style.background = StorageAPI.COLORS[colorName];
    btn.title = colorName;
    btn.addEventListener('click', () => updateCurrentWsField('color', colorName));
    picker.appendChild(btn);
  });
}

async function updateCurrentWsField(field, value) {
  if (!selectedWorkspaceId) return;
  await StorageAPI.updateWorkspace(selectedWorkspaceId, { [field]: value });
  await loadData();
  renderWorkspaceDetail(selectedWorkspaceId);
}

// ── Lista schede ──────────────────────────────────────────────────────────────

function renderTabsList(ws) {
  const container = document.getElementById('tabs-list');
  const emptyEl = document.getElementById('tabs-empty');
  const badge = document.getElementById('tab-count-badge');
  const tabs = ws.tabs || [];
  const groups = ws.nativeGroups || [];

  badge.textContent = tabs.length;
  container.innerHTML = '';

  if (tabs.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  // Raggruppa le schede per gruppo nativo
  const groupedTabs = {}; // localId → tabs[]
  const ungroupedTabs = [];

  tabs.forEach(tab => {
    if (tab.groupLocalId) {
      if (!groupedTabs[tab.groupLocalId]) groupedTabs[tab.groupLocalId] = [];
      groupedTabs[tab.groupLocalId].push(tab);
    } else {
      ungroupedTabs.push(tab);
    }
  });

  // Render gruppi nativi
  groups.forEach(group => {
    const groupTabs = groupedTabs[group.localId] || [];
    if (groupTabs.length === 0) return;

    const groupEl = document.createElement('div');
    groupEl.className = 'native-group';

    const dotColor = StorageAPI.COLORS[group.color] || StorageAPI.COLORS.blue;
    groupEl.innerHTML = `
      <div class="native-group-header">
        <div class="group-color-dot" style="background:${dotColor}"></div>
        <span>${escapeHtml(group.title || 'Gruppo senza nome')}</span>
        <span class="group-tab-count">${groupTabs.length} schede</span>
      </div>
      <div class="native-group-tabs"></div>
    `;

    const tabsContainer = groupEl.querySelector('.native-group-tabs');
    groupTabs.forEach(tab => {
      tabsContainer.appendChild(createTabRow(tab, ws));
    });

    container.appendChild(groupEl);
  });

  // Render schede non raggruppate
  ungroupedTabs.forEach(tab => {
    container.appendChild(createTabRow(tab, ws));
  });
}

function createTabRow(tab, ws) {
  const row = document.createElement('div');
  row.className = 'tab-row';

  const faviconHtml = tab.favIconUrl
    ? `<img class="tab-favicon" src="${escapeHtml(tab.favIconUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';

  const domain = getDomain(tab.url);

  row.innerHTML = `
    ${faviconHtml}
    <div class="tab-favicon-placeholder" ${tab.favIconUrl ? 'style="display:none"' : ''}>🌐</div>
    <div class="tab-info">
      <div class="tab-title">${escapeHtml(tab.title || tab.url)}</div>
      <div class="tab-url">${escapeHtml(domain)}</div>
    </div>
    <button class="btn-remove-tab" title="Rimuovi scheda">✕</button>
  `;

  row.querySelector('.btn-remove-tab').addEventListener('click', async (e) => {
    e.stopPropagation();
    await removeTabFromWorkspace(ws.id, tab.url);
  });

  return row;
}

async function removeTabFromWorkspace(wsId, url) {
  const ws = workspaces.find(w => w.id === wsId);
  if (!ws) return;
  const newTabs = (ws.tabs || []).filter(t => t.url !== url);
  await StorageAPI.updateWorkspace(wsId, { tabs: newTabs });
  await loadData();
  renderWorkspaceDetail(wsId);
}

// ── Actions ───────────────────────────────────────────────────────────────────

function bindActions() {

  // Sidebar: aggiungi workspace
  document.getElementById('btn-add-workspace').addEventListener('click', openCreateModal);
  document.getElementById('btn-home-create').addEventListener('click', openCreateModal);

  // Sidebar: impostazioni
  document.getElementById('btn-nav-settings').addEventListener('click', () => {
    selectedWorkspaceId = null;
    renderSidebar();
    showView('settings');
  });

  // Rinomina: click sul titolo
  document.getElementById('detail-name').addEventListener('click', startRename);
  document.getElementById('detail-name').addEventListener('blur', finishRename);
  document.getElementById('detail-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finishRename(); }
    if (e.key === 'Escape') { cancelRename(); }
  });

  // Attiva workspace
  document.getElementById('btn-activate-ws').addEventListener('click', async () => {
    if (!selectedWorkspaceId) return;
    const response = await browser.runtime.sendMessage({
      type: 'SWITCH_WORKSPACE',
      workspaceId: selectedWorkspaceId
    });
    if (response.ok) {
      activeWorkspaceId = selectedWorkspaceId;
      await loadData();
      renderWorkspaceDetail(selectedWorkspaceId);
    }
  });

  // Cattura schede correnti → workspace selezionato
  document.getElementById('btn-capture-to-ws').addEventListener('click', async () => {
    if (!selectedWorkspaceId) return;
    const response = await browser.runtime.sendMessage({
      type: 'SAVE_CURRENT_WORKSPACE',
      forceWorkspaceId: selectedWorkspaceId
    });
    // Cattura manuale
    const captured = await StorageAPI.captureCurrentWindow();
    await StorageAPI.saveTabsToWorkspace(selectedWorkspaceId, captured.tabs, captured.nativeGroups);
    if (selectedWorkspaceId !== activeWorkspaceId) {
      await StorageAPI.setActiveWorkspaceId(selectedWorkspaceId);
      activeWorkspaceId = selectedWorkspaceId;
    }
    await loadData();
    renderWorkspaceDetail(selectedWorkspaceId);
  });

  // Elimina workspace
  document.getElementById('btn-delete-ws').addEventListener('click', async () => {
    const ws = workspaces.find(w => w.id === selectedWorkspaceId);
    if (!ws) return;
    if (!confirm(`Eliminare l'area "${ws.name}"? Questa azione è irreversibile.`)) return;
    await StorageAPI.deleteWorkspace(selectedWorkspaceId);
    selectedWorkspaceId = null;
    await loadData();
    showView('home');
  });

  // Impostazioni: esporta
  document.getElementById('btn-export-data').addEventListener('click', exportData);

  // Impostazioni: importa
  document.getElementById('btn-import-data').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input').addEventListener('change', importData);

  // Modal
  document.getElementById('modal-cancel').addEventListener('click', closeCreateModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmCreateWorkspace);
  document.getElementById('modal-overlay-bg')?.addEventListener('click', closeCreateModal);
  document.getElementById('modal-create').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCreateModal();
  });
  document.getElementById('modal-ws-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmCreateWorkspace();
  });
}

// ── Rename ────────────────────────────────────────────────────────────────────

let renameOriginalText = '';

function startRename() {
  const el = document.getElementById('detail-name');
  renameOriginalText = el.textContent;
  el.contentEditable = 'true';
  el.focus();
  // Seleziona tutto il testo
  const range = document.createRange();
  range.selectNodeContents(el);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
}

async function finishRename() {
  const el = document.getElementById('detail-name');
  if (el.contentEditable !== 'true') return;
  el.contentEditable = 'false';
  const newName = el.textContent.trim();
  if (!newName || newName === renameOriginalText) {
    el.textContent = renameOriginalText;
    return;
  }
  await StorageAPI.updateWorkspace(selectedWorkspaceId, { name: newName });
  await loadData();
  renderWorkspaceDetail(selectedWorkspaceId);
}

function cancelRename() {
  const el = document.getElementById('detail-name');
  el.contentEditable = 'false';
  el.textContent = renameOriginalText;
}

// ── Modal crea workspace ──────────────────────────────────────────────────────

function openCreateModal() {
  modalIcon = '📁';
  modalColor = 'blue';
  document.getElementById('modal-ws-name').value = '';
  document.getElementById('modal-icon-preview').textContent = '📁';
  renderModalIconGrid();
  renderModalColorGrid();
  document.getElementById('modal-create').hidden = false;
  setTimeout(() => document.getElementById('modal-ws-name').focus(), 50);
}

function closeCreateModal() {
  document.getElementById('modal-create').hidden = true;
}

function renderModalIconGrid() {
  const grid = document.getElementById('modal-icon-grid');
  grid.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.className = 'icon-option' + (icon === modalIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      modalIcon = icon;
      document.getElementById('modal-icon-preview').textContent = icon;
      grid.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });
}

function renderModalColorGrid() {
  const grid = document.getElementById('modal-color-grid');
  grid.innerHTML = '';
  COLOR_NAMES.forEach(colorName => {
    const btn = document.createElement('button');
    btn.className = 'color-dot' + (colorName === modalColor ? ' selected' : '');
    btn.style.background = StorageAPI.COLORS[colorName];
    btn.title = colorName;
    btn.addEventListener('click', () => {
      modalColor = colorName;
      grid.querySelectorAll('.color-dot').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });
}

async function confirmCreateWorkspace() {
  const name = document.getElementById('modal-ws-name').value.trim();
  if (!name) {
    document.getElementById('modal-ws-name').focus();
    return;
  }
  const ws = await StorageAPI.createWorkspace(name, modalIcon, modalColor);
  closeCreateModal();
  await loadData();
  selectWorkspace(ws.id);
}

// ── Export / Import ───────────────────────────────────────────────────────────

async function exportData() {
  const data = await StorageAPI.load();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.workspaces || !Array.isArray(data.workspaces)) {
      alert('File JSON non valido: struttura non riconosciuta.');
      return;
    }
    if (!confirm(`Importare ${data.workspaces.length} aree? I dati attuali verranno sovrascritti.`)) return;
    await StorageAPI.persist(data);
    await loadData();
    showView('home');
    alert('Importazione completata!');
  } catch (err) {
    alert('Errore durante l\'importazione: ' + err.message);
  }
  e.target.value = '';
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}