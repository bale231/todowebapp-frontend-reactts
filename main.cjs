const { app, BrowserWindow, shell, nativeImage, protocol } = require("electron");
const path = require("path");
const url = require("url");

let mainWindow = null;

function createWindow() {
  const appPath = app.getAppPath();

  // Debug: log paths
  console.log("App path:", appPath);
  console.log("Is packaged:", app.isPackaged);
  console.log("__dirname:", __dirname);

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(appPath, "public/assets/apple-touch-icon.png");

  const icon = nativeImage.createFromPath(iconPath);

  // Preload path
  const preloadPath = path.join(__dirname, "preload.cjs");
  console.log("Preload path:", preloadPath);

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
  } else {
    // Use URL format for proper file:// loading from asar
    const indexPath = path.join(appPath, "dist", "index.html");
    console.log("Index path:", indexPath);

    const startUrl = url.format({
      pathname: indexPath,
      protocol: "file:",
      slashes: true,
    });
    console.log("Start URL:", startUrl);

    mainWindow.loadURL(startUrl);
  }

  // Always open DevTools for debugging (remove this later)
  mainWindow.webContents.openDevTools();

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
