// --- Logica all'avvio del Browser ---
browser.runtime.onStartup.addListener(async () => {
    console.log("Firefox avviato: controllo workspace predefinito...");
    
    // Attendiamo un secondo per lasciare che Firefox carichi la sessione precedente
    setTimeout(async () => {
        const currentTabs = await browser.tabs.query({ currentWindow: true });
        
        // Se c'è solo una scheda ed è la pagina iniziale (o vuota), carichiamo il workspace
        if (currentTabs.length <= 1) {
            const data = await browser.storage.local.get("workspaces");
            const defaultWorkspace = "Lavoro"; // Puoi cambiare il nome qui

            if (data.workspaces && data.workspaces[defaultWorkspace]) {
                console.log(`Caricamento automatico area: ${defaultWorkspace}`);
                restoreWorkspaceFromBackground(data.workspaces[defaultWorkspace]);
            }
        }
    }, 2000);
});

// --- Funzione di Ripristino (Versione Background) ---
async function restoreWorkspaceFromBackground(workspace) {
    if (!workspace.tabs || workspace.tabs.length === 0) return;

    const mapping = [];
    
    // Crea le nuove schede
    for (const tabInfo of workspace.tabs) {
        const createdTab = await browser.tabs.create({ url: tabInfo.url, active: false });
        mapping.push({ newId: createdTab.id, oldGroupId: tabInfo.groupId });
    }

    // Ricostruisci i gruppi
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
                } catch (e) { console.error(e); }
            }
        }
    }
}