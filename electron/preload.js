// Preload script - runs before the renderer process
// Provides a secure bridge between Node.js and the browser context

import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
});
