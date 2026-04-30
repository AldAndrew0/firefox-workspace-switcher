document.addEventListener('DOMContentLoaded', () => {
    const workBtn = document.getElementById('work-btn');
    const funBtn = document.getElementById('fun-btn');
    const status = document.getElementById('status');

    // Funzione per attivare l'area dal popup
    async function quickSwitch(name) {
        status.textContent = `Caricamento ${name}...`;
        
        const data = await browser.storage.local.get("workspaces");
        const workspace = data.workspaces ? data.workspaces[name] : null;

        if (!workspace || workspace.tabs.length === 0) {
            status.textContent = `Errore: Area "${name}" non configurata nelle Opzioni.`;
            return;
        }

        // Recupera le schede e i gruppi (stessa logica della Dashboard)
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
        window.close(); // Chiude il popup automaticamente dopo lo switch
    }

    workBtn.addEventListener('click', () => quickSwitch('Lavoro'));
    funBtn.addEventListener('click', () => quickSwitch('Svago'));
});