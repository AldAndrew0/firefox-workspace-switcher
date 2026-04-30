// Funzione per "fotografare" l'area attuale
async function saveCurrentTo(workspaceName) {
    // 1. Ottieni tutte le schede della finestra attuale
    const tabs = await browser.tabs.query({ currentWindow: true });
    
    // 2. Ottieni tutti i gruppi di schede attivi
    const groups = await browser.tabGroups.query({ windowId: browser.windows.WINDOW_ID_CURRENT });

    // 3. Mappa le schede salvando l'ID del gruppo (se presente)
    const tabsData = tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        groupId: tab.groupId // Fondamentale per non rompere i gruppi
    }));

    // 4. Mappa i gruppi salvando colore e titolo
    const groupsData = groups.map(group => ({
        id: group.id,
        title: group.title,
        color: group.color
    }));

    // 5. Salva tutto nello storage locale
    const data = await browser.storage.local.get("workspaces");
    const workspaces = data.workspaces || {};
    
    workspaces[workspaceName] = {
        tabs: tabsData,
        groups: groupsData,
        lastUpdated: new Date().toISOString()
    };

    await browser.storage.local.set({ workspaces });
    alert(`Area "${workspaceName}" aggiornata con successo!`);
    location.reload(); // Ricarica la dashboard per vedere le modifiche
}

// Funzione per eliminare un'area
async function deleteGroup(name) {
    if (confirm(`Sei sicuro di voler eliminare l'area "${name}"?`)) {
        const data = await browser.storage.local.get("workspaces");
        delete data.workspaces[name];
        await browser.storage.local.set({ workspaces: data.workspaces });
        location.reload();
    }
}