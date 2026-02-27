const { app, BrowserWindow, shell, nativeImage } = require("electron");
const path = require("path");
const url = require("url");

let mainWindow = null;

function createWindow() {
  const appPath = app.getAppPath();

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(appPath, "public/assets/apple-touch-icon.png");

  const icon = nativeImage.createFromPath(iconPath);
  const preloadPath = path.join(__dirname, "preload.cjs");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    icon,
    title: "ToDoApp",
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // Load the app
  if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(appPath, "dist", "index.html");
    const startUrl = url.format({
      pathname: indexPath,
      protocol: "file:",
      slashes: true,
    });
    mainWindow.loadURL(startUrl);
  }

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Handle mailto links
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (navigationUrl.startsWith("mailto:")) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
