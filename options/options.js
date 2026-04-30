document.addEventListener('DOMContentLoaded', async () => {
    await refreshDashboard();
});

async function refreshDashboard() {
    const data = await browser.storage.local.get("workspaces");
    renderGroups(data.workspaces || {});
}

function renderGroups(workspaces) {
    const list = document.getElementById('groups-list');
    list.innerHTML = '';
    const keys = Object.keys(workspaces);
    
    if (keys.length === 0) {
        list.innerHTML = '<p style="color: #888;">Nessuna area creata. Clicca sul tasto sotto!</p>';
        return;
    }

    keys.forEach(name => {
        const workspace = workspaces[name];
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="group-info">
                <strong>${name}</strong> 
                <div style="font-size: 0.8em; color: #888;">${workspace.tabs.length} schede salvate</div>
            </div>
            <div class="group-actions">
                <button style="background: #10b981; color: white;" onclick="restoreWorkspace('${name}')">Attiva</button>
                <button style="background: #3b82f6; color: white;" onclick="saveCurrentTo('${name}')">Aggiorna</button>
                <button style="background: #ef4444; color: white;" onclick="deleteGroup('${name}')">Elimina</button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('add-group').addEventListener('click', async () => {
    const name = prompt("Nome area (es. Lavoro, Svago):");
    if (name) {
        const data = await browser.storage.local.get("workspaces");
        const workspaces = data.workspaces || {};
        workspaces[name] = { tabs: [], groups: [] };
        await browser.storage.local.set({ workspaces });
        await refreshDashboard();
    }
});

async function saveCurrentTo(workspaceName) {
    const tabs = await browser.tabs.query({ currentWindow: true });
    let groupsData = [];
    try {
        const groups = await browser.tabGroups.query({ windowId: browser.windows.WINDOW_ID_CURRENT });
        groupsData = groups.map(g => ({ id: g.id, title: g.title, color: g.color }));
    } catch (e) {}

    const tabsData = tabs.map(tab => ({ url: tab.url, groupId: tab.groupId }));
    const data = await browser.storage.local.get("workspaces");
    const workspaces = data.workspaces || {};
    
    workspaces[workspaceName] = { tabs: tabsData, groups: groupsData };
    await browser.storage.local.set({ workspaces });
    alert(`Area "${workspaceName}" salvata!`);
    await refreshDashboard();
}

async function restoreWorkspace(name) {
    const data = await browser.storage.local.get("workspaces");
    const workspace = data.workspaces[name];
    if (!workspace) return;

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
    if (confirm(`Eliminare ${name}?`)) {
        const data = await browser.storage.local.get("workspaces");
        delete data.workspaces[name];
        await browser.storage.local.set({ workspaces: data.workspaces });
        await refreshDashboard();
    }
}