document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('group-list-popup');
    const data = await browser.storage.local.get("workspaces");
    const workspaces = data.workspaces || {};
    const title = document.querySelector('h3');

    // Clicca sul titolo per le opzioni
    title.style.cursor = "pointer";
    title.onclick = () => browser.runtime.openOptionsPage();

    const keys = Object.keys(workspaces);
    if (keys.length === 0) {
        container.innerHTML = "<p style='opacity:0.6'>Nessuna area salvata.</p>";
    }

    keys.forEach(name => {
        const btn = document.createElement('button');
        btn.className = "popup-btn";
        btn.style.marginBottom = "5px";
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.textContent = `📁 ${name}`;
        btn.onclick = async () => {
            await restoreFromPopup(name);
            window.close();
        };
        container.appendChild(btn);
    });

    document.getElementById('open-settings').onclick = () => browser.runtime.openOptionsPage();
});

// Funzione di ripristino per il popup
async function restoreFromPopup(name) {
    const data = await browser.storage.local.get("workspaces");
    const workspace = data.workspaces[name];
    const currentTabs = await browser.tabs.query({ currentWindow: true });
    const tabsToRemove = currentTabs.map(t => t.id);

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