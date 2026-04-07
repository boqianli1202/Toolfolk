const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("toolfolk", {
  installTool: (data) => ipcRenderer.invoke("install-tool", data),
  runTool: (data) => ipcRenderer.invoke("run-tool", data),
  uninstallTool: (data) => ipcRenderer.invoke("uninstall-tool", data),
  getInstalled: () => ipcRenderer.invoke("get-installed"),
  checkRuntimes: () => ipcRenderer.invoke("check-runtimes"),
});
