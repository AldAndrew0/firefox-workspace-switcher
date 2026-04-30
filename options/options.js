// --- Inizializzazione ---
document.addEventListener('DOMContentLoaded', async () => {
    await refreshDashboard();
    checkFirefoxSettings();
});

// --- Funzioni Principali ---

// Carica e mostra i gruppi salvati
async function refreshDashboard() {
    const data = await browser.storage.local.get("workspaces");
    renderGroups(data.workspaces || {});
}

function renderGroups(workspaces) {
    const list = document.getElementById('groups-list');
    list.innerHTML = '';

    const keys = Object.keys(workspaces);
    
    if (keys.length === 0) {
        list.innerHTML = '<p style="color: #888;">Nessuna area creata. Inizia creandone una nuova!</p>';
        return;
    }

    keys.forEach(name => {
        const workspace = workspaces[name];
        const div = document.createElement('div');
        div.className = 'group-item card';
        div.innerHTML = `
            <div class="group-info">
                <strong>${name}</strong> 
                <span style="font-size: 0.8em; color: #aaa; margin-left: 10px;">
                    (${workspace.tabs.length} schede, ${workspace.groups ? workspace.groups.length : 0} gruppi)
                </span>
            </div>
            <div class="group-actions">
                <button style="background: #10b981;" onclick="restoreWorkspace('${name}')">Attiva Area</button>
                <button style="background: #4b5563;" onclick="saveCurrentTo('${name}')">Aggiorna</button>
                <button style="background: #ef4444;" onclick="deleteGroup('${name}')">Elimina</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Crea una nuova area (Workspace)
document.getElementById('add-group').addEventListener('click', async () => {
    const name = prompt("Inserisci il nome della nuova area (es. Studio, Lavoro, Social):");
    if (name && name.trim() !== "") {
        const data = await browser.storage.local.get("workspaces");
        const workspaces = data.workspaces || {};
        
        if (workspaces[name]) {
            alert("Un'area con questo nome esiste già!");
            return;
        }

        workspaces[name] = { tabs: [], groups: [], lastUpdated: new Date().toISOString() };
        await browser.storage.local.set({ workspaces });
        await refreshDashboard();
    }
});

// Cattura lo stato attuale (Schede + Gruppi colorati)
async function saveCurrentTo(workspaceName) {
    const tabs = await browser.tabs.query({ currentWindow: true });
    
    // Proviamo a recuperare i gruppi (API disponibile da Firefox 122+)
    let groupsData = [];
    try {
        const groups = await browser.tabGroups.query({ windowId: browser.windows.WINDOW_ID_CURRENT });
        groupsData = groups.map(g => ({
            id: g.id,
            title: g.title,
            color: g.color
        }));
    } catch (e) {
        console.log("Tab Groups API non supportata o nessun gruppo presente.");
    }

    const tabsData = tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        groupId: tab.groupId // Manteniamo il collegamento al gruppo
    }));

    const data = await browser.storage.local.get("workspaces");
    const workspaces = data.workspaces || {};
    
    workspaces[workspaceName] = {
        tabs: tabsData,
        groups: groupsData,
        lastUpdated: new Date().toISOString()
    };

    await browser.storage.local.set({ workspaces });
    alert(`Area "${workspaceName}" salvata con successo!`);
    await refreshDashboard();
}

// Ripristina un'area: chiude il presente e ricostruisce il passato
async function restoreWorkspace(name) {
    const data = await browser.storage.local.get("workspaces");
    const workspace = data.workspaces[name];

    if (!workspace || !workspace.tabs.length) {
        alert("Quest'area è vuota! Usa 'Aggiorna' per salvare le schede correnti.");
        return;
    }

    // 1. Identifica le schede da chiudere (tranne questa pagina opzioni)
    const currentTabs = await browser.tabs.query({ currentWindow: true });
    const optionsTab = await browser.tabs.getCurrent();
    const tabsToRemove = currentTabs.filter(t => t.id !== optionsTab.id).map(t => t.id);

    // 2. Crea le nuove schede
    const mapping = []; // Serve per raggrupparle dopo
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

    // 3. Ricostruisci i gruppi se supportati
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
                    console.error("Errore nel ripristino del gruppo:", e);
                }
            }
        }
    }

    // 4. Chiudi le vecchie schede
    await browser.tabs.remove(tabsToRemove);
}

// Elimina un'area
async function deleteGroup(name) {
    if (confirm(`Sei sicuro di voler eliminare l'area "${name}"?`)) {
        const data = await browser.storage.local.get("workspaces");
        delete data.workspaces[name];
        await browser.storage.local.set({ workspaces: data.workspaces });
        await refreshDashboard();
    }
}

// Controllo impostazioni Firefox (Logica suggerimento)
function checkFirefoxSettings() {
    // Nota: Non possiamo leggere direttamente le preferenze 'browser.sessionstore.resume_from_crash'
    // ma possiamo mostrare il banner informativo.
    const warning = document.getElementById('session-warning');
    if (warning) {
        warning.style.display = 'block'; 
    }
}