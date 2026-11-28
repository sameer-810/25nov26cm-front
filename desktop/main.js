// NF Skills Portal for Windows: a window onto the portal website. Everything it shows comes from
// that site and its API; the address is "portalUrl" in package.json (GitHub Actions sets it).
const { app, BrowserWindow, shell } = require("electron");
const { portalUrl } = require("./package.json");

const ORIGIN = new URL(portalUrl).origin;
const inPortal = (url) => url.startsWith(`${ORIGIN}/`) || url === ORIGIN || url.startsWith("blob:") || url.startsWith("data:");
const openOutside = (url) => {
  if (/^(https?|mailto|tel):/i.test(url)) shell.openExternal(url);
};

const OFFLINE_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;color:#334155">
<div style="text-align:center"><h2>Can't reach the portal</h2><p>Check your internet connection.</p>
<button style="padding:8px 20px;font-size:15px;cursor:pointer" onclick="location.href='${portalUrl}'">Try again</button></div></body>`)}`;

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    title: "NF Skills Portal",
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // Portal pages and its PDF/export tabs stay in the app; WhatsApp, email and other sites open in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (inPortal(url)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    openOutside(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!inPortal(url)) {
      event.preventDefault();
      openOutside(url);
    }
  });
  win.webContents.on("did-fail-load", (_event, code, _description, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) win.loadURL(OFFLINE_PAGE); // -3: navigation cancelled, not an error
  });

  win.loadURL(portalUrl);
}

// One window: opening the app again brings the running one to the front.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => app.quit());
}
