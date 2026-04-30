/**
 * background.js — Logica principale di switching workspace
 * StorageAPI è caricato prima di questo script (manifest.json)
 */

// ── Switch workspace ────────────────────────────────────────────────────────

async function switchToWorkspace(targetId) {
  const activeId = await StorageAPI.getActiveWorkspaceId();

  // 1. Salva le schede correnti nel workspace attivo (se esiste)
  if (activeId && activeId !== targetId) {
    const captured = await StorageAPI.captureCurrentWindow();
    await StorageAPI.saveTabsToWorkspace(activeId, captured.tabs, captured.nativeGroups);
  }

  // 2. Carica il workspace di destinazione
  const target = await StorageAPI.getWorkspace(targetId);
  if (!target) {
    console.error('[WTM] Workspace non trovato:', targetId);
    return false;
  }

  // 3. Ottieni tutte le schede correnti (da chiudere dopo)
  const currentTabs = await browser.tabs.query({ currentWindow: true });
  const currentTabIds = currentTabs.map(t => t.id);

  // 4. Crea una scheda placeholder per evitare che Firefox chiuda la finestra
  const placeholder = await browser.tabs.create({ url: 'about:newtab', active: true });

  // 5. Apri le schede del workspace di destinazione
  const mapping = []; // { newTabId, groupLocalId }

  if (target.tabs && target.tabs.length > 0) {
    for (const tabInfo of target.tabs) {
      try {
        const newTab = await browser.tabs.create({
          url: tabInfo.url,
          active: false
        });
        mapping.push({ newTabId: newTab.id, groupLocalId: tabInfo.groupLocalId });
      } catch (e) {
        console.warn('[WTM] Impossibile aprire scheda:', tabInfo.url, e);
      }
    }
  }

  // 6. Ricrea i gruppi nativi di Firefox
  if (target.nativeGroups && target.nativeGroups.length > 0) {
    for (const group of target.nativeGroups) {
      const tabIds = mapping
        .filter(m => m.groupLocalId === group.localId)
        .map(m => m.newTabId);

      if (tabIds.length > 0) {
        try {
          const newGroupId = await browser.tabs.group({ tabIds });
          await browser.tabGroups.update(newGroupId, {
            title: group.title,
            color: group.color,
            collapsed: group.collapsed || false
          });
        } catch (e) {
          console.warn('[WTM] Impossibile creare gruppo nativo:', group.title, e);
        }
      }
    }
  }

  // 7. Attiva la prima scheda del nuovo workspace (o la placeholder)
  if (mapping.length > 0) {
    await browser.tabs.update(mapping[0].newTabId, { active: true });
  }

  // 8. Rimuovi le vecchie schede e la placeholder
  const toRemove = [...currentTabIds, placeholder.id];
  try {
    await browser.tabs.remove(toRemove);
  } catch (e) {
    // Alcune schede potrebbero già essere state chiuse
  }

  // 9. Aggiorna il workspace attivo
  await StorageAPI.setActiveWorkspaceId(targetId);

  console.log(`[WTM] Switchiato a workspace: ${target.name}`);
  return true;
}

// ── Salva workspace corrente ────────────────────────────────────────────────

async function saveCurrentWorkspace() {
  const activeId = await StorageAPI.getActiveWorkspaceId();
  if (!activeId) return false;

  const captured = await StorageAPI.captureCurrentWindow();
  await StorageAPI.saveTabsToWorkspace(activeId, captured.tabs, captured.nativeGroups);
  return true;
}

// ── Messaggi dal popup/options ──────────────────────────────────────────────

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SWITCH_WORKSPACE') {
    switchToWorkspace(message.workspaceId)
      .then(ok => sendResponse({ ok }))
      .catch(e => sendResponse({ ok: false, error: String(e) }));
    return true; // risposta asincrona
  }

  if (message.type === 'SAVE_CURRENT_WORKSPACE') {
    saveCurrentWorkspace()
      .then(ok => sendResponse({ ok }))
      .catch(e => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (message.type === 'GET_ACTIVE_WORKSPACE_ID') {
    StorageAPI.getActiveWorkspaceId()
      .then(id => sendResponse({ id }))
      .catch(() => sendResponse({ id: null }));
    return true;
  }
});

// ── Avvio browser ───────────────────────────────────────────────────────────

browser.runtime.onStartup.addListener(async () => {
  console.log('[WTM] Firefox avviato');
  // Non auto-switchiamo all'avvio: lasciamo Firefox ripristinare la sessione
  // Il workspace attivo rimane salvato nello storage
});

console.log('[WTM] Background script caricato');