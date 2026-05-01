/**
 * popup.js — Logica del pannello popup
 */

let activeWorkspaceId = null;
let workspaces = [];

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await ThemeAPI.init();
  await refreshPopup();
  bindFooterActions();
});

async function refreshPopup() {
  try {
    [workspaces, activeWorkspaceId] = await Promise.all([
      StorageAPI.getWorkspaces(),
      StorageAPI.getActiveWorkspaceId()
    ]);
    renderWorkspaceList();
  } catch (e) {
    console.error('[Popup] Errore caricamento:', e);
  }
}

// ── Render lista workspace ────────────────────────────────────────────────────

function renderWorkspaceList() {
  const container = document.getElementById('workspace-list');
  const emptyState = document.getElementById('empty-state');

  container.innerHTML = '';

  if (workspaces.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  workspaces.forEach(ws => {
    const isActive = ws.id === activeWorkspaceId;
    const item = createWorkspaceItem(ws, isActive);
    container.appendChild(item);
  });
}

function createWorkspaceItem(ws, isActive) {
  const item = document.createElement('div');
  item.className = 'ws-item' + (isActive ? ' active' : '');
  item.dataset.id = ws.id;

  const tabCount = ws.tabs ? ws.tabs.length : 0;
  const groupCount = ws.nativeGroups ? ws.nativeGroups.length : 0;
  const metaParts = [];
  if (tabCount > 0) metaParts.push(`${tabCount} ${tabCount === 1 ? 'scheda' : 'schede'}`);
  if (groupCount > 0) metaParts.push(`${groupCount} ${groupCount === 1 ? 'gruppo' : 'gruppi'}`);
  const meta = metaParts.length > 0 ? metaParts.join(' · ') : 'Vuoto';

  const accentColor = StorageAPI.COLORS[ws.color] || StorageAPI.COLORS.blue;

  item.innerHTML = `
    <div class="ws-icon" style="--ws-color: ${accentColor}">${ws.icon || '📁'}</div>
    <div class="ws-info">
      <div class="ws-name">${escapeHtml(ws.name)}</div>
      <div class="ws-meta">${meta}</div>
    </div>
    <div class="ws-actions">
      ${isActive
        ? `<span class="active-badge">Attivo</span>`
        : `<button class="btn-switch" data-id="${ws.id}">Apri →</button>`
      }
    </div>
  `;

  // Click sull'item: switch workspace
  if (!isActive) {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-switch') || e.target === item || e.target.closest('.ws-info') || e.target.closest('.ws-icon')) {
        doSwitch(ws.id, ws.name);
      }
    });
  }

  return item;
}

// ── Switch workspace ──────────────────────────────────────────────────────────

async function doSwitch(workspaceId, workspaceName) {
  showSwitchingOverlay(workspaceName);

  try {
    const response = await browser.runtime.sendMessage({
      type: 'SWITCH_WORKSPACE',
      workspaceId
    });

    if (!response.ok) {
      console.error('[Popup] Switch fallito:', response.error);
      hideSwitchingOverlay();
    }
    // Se ok, il popup si chiuderà automaticamente insieme alle vecchie schede
  } catch (e) {
    console.error('[Popup] Errore switch:', e);
    hideSwitchingOverlay();
  }
}

function showSwitchingOverlay(name) {
  const overlay = document.getElementById('switching-overlay');
  const label = document.getElementById('switching-label');
  label.textContent = `Apro "${name}"...`;
  overlay.hidden = false;
}

function hideSwitchingOverlay() {
  document.getElementById('switching-overlay').hidden = true;
}

// ── Footer actions ────────────────────────────────────────────────────────────

function bindFooterActions() {

  // Nuova area (vuota)
  document.getElementById('btn-new').addEventListener('click', () => {
    openDashboard('new');
  });

  // Cattura schede correnti come nuova area
  document.getElementById('btn-save-as-new').addEventListener('click', async () => {
    const name = prompt('Nome della nuova area:');
    if (!name || !name.trim()) return;

    try {
      const ws = await StorageAPI.createWorkspace(name.trim());
      const captured = await StorageAPI.captureCurrentWindow();
      await StorageAPI.saveTabsToWorkspace(ws.id, captured.tabs, captured.nativeGroups);
      await StorageAPI.setActiveWorkspaceId(ws.id);
      await refreshPopup();
    } catch (e) {
      console.error('[Popup] Errore cattura:', e);
    }
  });

  // Salva schede correnti nel workspace attivo
  document.getElementById('btn-save-current').addEventListener('click', async () => {
    if (!activeWorkspaceId) {
      alert('Nessuna area attiva. Prima seleziona o crea un\'area.');
      return;
    }
    try {
      await browser.runtime.sendMessage({ type: 'SAVE_CURRENT_WORKSPACE' });
      await refreshPopup();
      flashSaveButton();
    } catch (e) {
      console.error('[Popup] Errore salvataggio:', e);
    }
  });

  // Dashboard
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    openDashboard();
  });
}

function openDashboard(section) {
  const url = browser.runtime.getURL('options/options.html') +
    (section ? `?section=${section}` : '');
  browser.tabs.create({ url });
  window.close();
}

function flashSaveButton() {
  const btn = document.getElementById('btn-save-current');
  btn.style.opacity = '1';
  btn.style.color = 'var(--accent)';
  setTimeout(() => {
    btn.style.color = '';
  }, 1200);
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}