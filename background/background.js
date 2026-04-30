// Controllo all'avvio: le impostazioni di Firefox sono corrette?
browser.runtime.onStartup.addListener(async () => {
    const sessionStore = await browser.browserSettings.allowPopupsForUser.get({}); // Esempio di check permessi
    console.log("Browser avviato. Caricamento area predefinita...");
    
    // Recupera l'area impostata come 'default' dallo storage
    const data = await browser.storage.local.get("workspaces");
    if (!data.workspaces) {
        // Se è la prima volta, crea l'area di default con la pagina iniziale
        await browser.storage.local.set({
            workspaces: {
                "Default": { tabs: [{ url: "about:home" }], groups: [] }
            }
        });
    }
});

// Ascolta messaggi dalla pagina Opzioni o dal Popup
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "checkSettings") {
        // Logica per verificare se 'Ripristina sessione' è attivo
        // Nota: le WebExtensions hanno accesso limitato alle preferenze critiche,
        // useremo un metodo per suggerire l'attivazione.
    }
});