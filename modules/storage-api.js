/**
 * StorageAPI — Gestione persistente dei workspace
 * Incluso come script globale da: background, popup, options
 */

const StorageAPI = (() => {
  const KEY = 'wtm_v2';

  const COLORS = {
    blue:      '#0a84ff',
    cyan:      '#00b3f4',
    turquoise: '#00b3a2',
    green:     '#30e60b',
    yellow:    '#ffcc00',
    orange:    '#ff9400',
    red:       '#ff4533',
    pink:      '#ff0080',
    purple:    '#9059ff',
    grape:     '#8b0050',
    grey:      '#737373'
  };

  async function load() {
    try {
      const result = await browser.storage.local.get(KEY);
      return result[KEY] || { workspaces: [], activeWorkspaceId: null };
    } catch (e) {
      console.error('[StorageAPI] load error:', e);
      return { workspaces: [], activeWorkspaceId: null };
    }
  }

  async function persist(data) {
    await browser.storage.local.set({ [KEY]: data });
  }

  async function getWorkspaces() {
    const data = await load();
    return data.workspaces;
  }

  async function getWorkspace(id) {
    const list = await getWorkspaces();
    return list.find(w => w.id === id) || null;
  }

  async function getActiveWorkspaceId() {
    const data = await load();
    return data.activeWorkspaceId;
  }

  async function setActiveWorkspaceId(id) {
    const data = await load();
    data.activeWorkspaceId = id;
    await persist(data);
  }

  async function createWorkspace(name, icon = '📁', color = 'blue') {
    const data = await load();
    const workspace = {
      id: crypto.randomUUID(),
      name: name.trim(),
      icon,
      color,
      tabs: [],
      nativeGroups: [],
      createdAt: Date.now(),
      savedAt: null
    };
    data.workspaces.push(workspace);
    await persist(data);
    return workspace;
  }

  async function updateWorkspace(id, updates) {
    const data = await load();
    const idx = data.workspaces.findIndex(w => w.id === id);
    if (idx === -1) return null;
    data.workspaces[idx] = { ...data.workspaces[idx], ...updates };
    await persist(data);
    return data.workspaces[idx];
  }

  async function deleteWorkspace(id) {
    const data = await load();
    data.workspaces = data.workspaces.filter(w => w.id !== id);
    if (data.activeWorkspaceId === id) data.activeWorkspaceId = null;
    await persist(data);
  }

  async function saveTabsToWorkspace(id, tabs, nativeGroups) {
    return updateWorkspace(id, { tabs, nativeGroups, savedAt: Date.now() });
  }

  async function captureCurrentWindow() {
    const tabs = await browser.tabs.query({ currentWindow: true });
    const IGNORE = ['about:newtab', 'about:blank', 'about:home', 'moz-extension://'];
    const validTabs = tabs.filter(t =>
      t.url && !IGNORE.some(prefix => t.url.startsWith(prefix))
    );

    let nativeGroups = [];
    try {
      const groups = await browser.tabGroups.query({
        windowId: browser.windows.WINDOW_ID_CURRENT
      });
      nativeGroups = groups.map(g => ({
        localId: String(g.id),
        title: g.title || '',
        color: g.color || 'blue',
        collapsed: g.collapsed || false
      }));
    } catch (_) {}

    const tabsData = validTabs.map(t => ({
      url: t.url,
      title: t.title || '',
      favIconUrl: t.favIconUrl || '',
      groupLocalId: (t.groupId && t.groupId !== -1) ? String(t.groupId) : null
    }));

    return { tabs: tabsData, nativeGroups };
  }

  return {
    COLORS,
    load, persist,
    getWorkspaces, getWorkspace,
    getActiveWorkspaceId, setActiveWorkspaceId,
    createWorkspace, updateWorkspace, deleteWorkspace,
    saveTabsToWorkspace, captureCurrentWindow
  };
})();