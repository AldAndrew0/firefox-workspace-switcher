document.addEventListener('DOMContentLoaded', refreshDashboard);

async function refreshDashboard() {
    const data = await browser.storage.local.get("workspaces");
    const workspaces = data.workspaces || {};
    const list = document.getElementById('groups-list');
    list.innerHTML = '';

    Object.keys(workspaces).forEach(name => {
        const ws = workspaces[name];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div><strong>${name}</strong> <span style="opacity:0.7">(${ws.tabs.length} schede)</span></div>
            <div>
                <button class="activate-btn" data-name="${name}">Attiva</button>
                <button class="secondary update-btn" data-name="${name}">Aggiorna</button>
                <button class="danger delete-btn" data-name="${name}">Elimina</button>
            </div>
        `;
        list.appendChild(card);
    });

    // Event Listeners Dinamici
    document.querySelectorAll('.activate-btn').forEach(b => b.onclick = () => restoreWorkspace(b.dataset.name));
    document.querySelectorAll('.update-btn').forEach(b => b.onclick = () => saveCurrentTo(b.dataset.name));
    document.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => deleteGroup(b.dataset.name));
}

document.getElementById('add-group').onclick = async () => {
    const name = prompt("Nome della nuova area:");
    if (name) {
        const data = await browser.storage.local.get("workspaces");
        const workspaces = data.workspaces || {};
        workspaces[name] = { tabs: [], groups: [] };
        await browser.storage.local.set({ workspaces });
        refreshDashboard();
    }
};

async function saveCurrentTo(name) {
    const tabs = await browser.tabs.query({ currentWindow: true });
    let groupsData = [];
    try {
        const groups = await browser.tabGroups.query({ windowId: browser.windows.WINDOW_ID_CURRENT });
        groupsData = groups.map(g => ({ id: g.id, title: g.title, color: g.color }));
    } catch (e) {}

    const tabsData = tabs.map(tab => ({ url: tab.url, groupId: tab.groupId }));
    const data = await browser.storage.local.get("workspaces");
    const workspaces = data.workspaces || {};
    
    workspaces[name] = { tabs: tabsData, groups: groupsData };
    await browser.storage.local.set({ workspaces });
    alert(`Area "${name}" aggiornata!`);
    refreshDashboard();
}

async function restoreWorkspace(name) {
    const data = await browser.storage.local.get("workspaces");
    const workspace = data.workspaces[name];
    if (!workspace || workspace.tabs.length === 0) return;

    const currentTabs = await browser.tabs.query({ currentWindow: true });
    const optionsTab = await browser.tabs.getCurrent();
    const tabsToRemove = currentTabs.filter(t => t.id !== optionsTab.id).map(t => t.id);

    const mapping = [];
    for (const tabInfo of workspace.tabs) {
        const createdTab = await browser.tabs.create({ url: tabInfo.url, active: false });
        mapping.push({ newId: createdTab.id, oldGroupId: tabInfo.groupId });
    }

    if (workspace.groups) {
        for (const savedGroup of workspace.groups) {
            const tabsToGroup = mapping.filter(m => m.oldGroupId === savedGroup.id).map(m => m.newId);
            if (tabsToGroup.length > 0) {
                const newGroupId = await browser.tabs.group({ tabIds: tabsToGroup });
                await browser.tabGroups.update(newGroupId, { title: savedGroup.title, color: savedGroup.color });
            }
        }
    }
    await browser.tabs.remove(tabsToRemove);
}

async function deleteGroup(name) {
    if (confirm(`Eliminare l'area "${name}"?`)) {
        const data = await browser.storage.local.get("workspaces");
        delete data.workspaces[name];
        await browser.storage.local.set({ workspaces: data.workspaces });
        refreshDashboard();
    }
}