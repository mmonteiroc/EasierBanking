const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, value) => callback(value)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, value) => callback(value)),
    installUpdate: () => ipcRenderer.send('install-update'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

// Original version info logic (optional but kept for compatibility if needed)
window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
});
