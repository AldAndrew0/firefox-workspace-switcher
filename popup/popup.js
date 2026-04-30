document.addEventListener('DOMContentLoaded', () => {
    const workBtn = document.getElementById('work-btn');
    const funBtn = document.getElementById('fun-btn');
    const status = document.getElementById('status');
    const title = document.querySelector('h2');

    // Scorciatoia: clicca sul titolo "Area Manager" per aprire la Dashboard
    title.style.cursor = "pointer";
    title.addEventListener('click', () => {
        browser.runtime.openOptionsPage();
    });

    // Funzione per attivare l'area dal popup
    async function quickSwitch(name) {
        status.textContent = `Caricamento ${name}...`;
        
        const data = await browser.storage.local.get("workspaces");
        const workspace = data.workspaces ? data.workspaces[name] : null;

        if (!workspace || !workspace.tabs || workspace.tabs.length === 0) {
            status.textContent = `Errore: Area "${name}" non trovata. Vai nelle Opzioni.`;
            return;
        }

        // 1. Identifica le schede da chiudere
        const currentTabs = await browser.tabs.query({ currentWindow: true });
        const tabsToRemove = currentTabs.map(t => t.id);

        // 2. Crea le nuove schede
        const mapping = [];
        for (const tabInfo of workspace.tabs) {
            const createdTab = await browser.tabs.create({ 
                url: tabInfo.url, 
                active: false 
            });
            mapping.push({ 
                newId: createdTab.id, 
                oldGroupId: tabInfo.groupId 
            });
        }

        // 3. Ricostruisci i Gruppi colorati
        if (workspace.groups && workspace.groups.length > 0) {
            for (const savedGroup of workspace.groups) {
                const tabsToGroup = mapping
                    .filter(m => m.oldGroupId === savedGroup.id)
                    .map(m => m.newId);

                if (tabsToGroup.length > 0) {
                    try {
                        const newGroupId = await browser.tabs.group({ tabIds: tabsToGroup });
                        await browser.tabGroups.update(newGroupId, { 
                            title: savedGroup.title, 
                            color: savedGroup.color 
                        });
                    } catch (e) {
                        console.error("Errore gruppi:", e);
                    }
                }
            }
        }

        // 4. Rimuovi le vecchie schede
        await browser.tabs.remove(tabsToRemove);
        window.close();
    }

    if(workBtn) workBtn.addEventListener('click', () => quickSwitch('Lavoro'));
    if(funBtn) funBtn.addEventListener('click', () => quickSwitch('Svago'));
});