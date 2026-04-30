// Carica i gruppi salvati al caricamento della pagina
document.addEventListener('DOMContentLoaded', async () => {
    const data = await browser.storage.local.get("workspaces");
    renderGroups(data.workspaces || {});
});

function renderGroups(workspaces) {
    const list = document.getElementById('groups-list');
    list.innerHTML = '';

    Object.keys(workspaces).forEach(name => {
        const div = document.createElement('div');
        div.className = 'group-item card';
        div.innerHTML = `
            <span><strong>${name}</strong> (${workspaces[name].tabs.length} schede)</span>
            <div>
                <button onclick="saveCurrentTo('${name}')">Aggiorna con schede attuali</button>
                <button style="background: #ef4444;" onclick="deleteGroup('${name}')">Elimina</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Funzione per creare un nuovo workspace
document.getElementById('add-group').addEventListener('click', async () => {
    const name = prompt("Nome della nuova area (es. Studio, Gaming):");
    if (name) {
        const data = await browser.storage.local.get("workspaces");
        const workspaces = data.workspaces || {};
        workspaces[name] = { tabs: [], groups: [] };
        await browser.storage.local.set({ workspaces });
        renderGroups(workspaces);
    }
});