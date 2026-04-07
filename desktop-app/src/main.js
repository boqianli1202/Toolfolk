const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { spawn } = require("child_process");
const extractZip = require("extract-zip");

const TOOLFOLK_API = "https://toolfolk.vercel.app";
const PROGRAMS_DIR = path.join(app.getPath("home"), "Toolfolk");

// Ensure programs directory exists
function ensureProgramsDir() {
  if (!fs.existsSync(PROGRAMS_DIR)) {
    fs.mkdirSync(PROGRAMS_DIR, { recursive: true });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

// Download file from URL to local path
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith("https") ? https : http;

    const request = (downloadUrl) => {
      client.get(downloadUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          request(response.headers.location);
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

// Find Python executable
function findPython() {
  const candidates = process.platform === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];

  for (const cmd of candidates) {
    try {
      const result = require("child_process").execSync(`${cmd} --version`, { stdio: "pipe" });
      if (result) return cmd;
    } catch {}
  }
  return null;
}

// Find Node executable
function findNode() {
  try {
    require("child_process").execSync("node --version", { stdio: "pipe" });
    return "node";
  } catch {
    return null;
  }
}

// IPC Handlers
ipcMain.handle("install-tool", async (_, { toolId, downloadUrl, language, entryFile, dependencies }) => {
  ensureProgramsDir();
  const toolDir = path.join(PROGRAMS_DIR, toolId);

  try {
    // Create tool directory
    if (fs.existsSync(toolDir)) {
      fs.rmSync(toolDir, { recursive: true });
    }
    fs.mkdirSync(toolDir, { recursive: true });

    // Download ZIP
    const zipPath = path.join(toolDir, "download.zip");
    await downloadFile(downloadUrl, zipPath);

    // Extract ZIP
    await extractZip(zipPath, { dir: toolDir });

    // Clean up ZIP
    fs.unlinkSync(zipPath);

    // Check if files are in a subfolder (common with ZIP archives)
    const entries = fs.readdirSync(toolDir);
    if (entries.length === 1 && fs.statSync(path.join(toolDir, entries[0])).isDirectory()) {
      // Move contents up one level
      const subDir = path.join(toolDir, entries[0]);
      const subEntries = fs.readdirSync(subDir);
      for (const entry of subEntries) {
        fs.renameSync(path.join(subDir, entry), path.join(toolDir, entry));
      }
      fs.rmdirSync(subDir);
    }

    // Install dependencies
    if (dependencies === "requirements.txt" && language === "python") {
      const pythonCmd = findPython();
      if (pythonCmd) {
        const reqPath = path.join(toolDir, "requirements.txt");
        if (fs.existsSync(reqPath)) {
          await new Promise((resolve, reject) => {
            const proc = spawn(pythonCmd, ["-m", "pip", "install", "-r", "requirements.txt"], {
              cwd: toolDir,
              stdio: "pipe",
            });
            proc.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`pip install failed with code ${code}`));
            });
            proc.on("error", reject);
          });
        }
      }
    }

    if (dependencies === "package.json" && language === "node") {
      const nodeCmd = findNode();
      if (nodeCmd) {
        await new Promise((resolve, reject) => {
          const proc = spawn("npm", ["install"], {
            cwd: toolDir,
            stdio: "pipe",
            shell: true,
          });
          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`npm install failed with code ${code}`));
          });
          proc.on("error", reject);
        });
      }
    }

    // Save metadata
    fs.writeFileSync(path.join(toolDir, ".toolfolk.json"), JSON.stringify({
      toolId,
      language,
      entryFile,
      dependencies,
      installedAt: new Date().toISOString(),
    }));

    return { success: true };
  } catch (err) {
    // Clean up on failure
    if (fs.existsSync(toolDir)) {
      fs.rmSync(toolDir, { recursive: true });
    }
    return { success: false, error: err.message };
  }
});

ipcMain.handle("run-tool", async (_, { toolId, language, entryFile }) => {
  const toolDir = path.join(PROGRAMS_DIR, toolId);

  if (!fs.existsSync(toolDir)) {
    return { success: false, error: "Tool not installed" };
  }

  try {
    if (language === "python") {
      const pythonCmd = findPython();
      if (!pythonCmd) return { success: false, error: "Python not found. Please install Python." };

      const entry = entryFile || "main.py";
      spawn(pythonCmd, [entry], {
        cwd: toolDir,
        detached: true,
        stdio: "ignore",
      }).unref();
    } else if (language === "node") {
      const entry = entryFile || "index.js";
      spawn("node", [entry], {
        cwd: toolDir,
        detached: true,
        stdio: "ignore",
        shell: true,
      }).unref();
    } else if (language === "html") {
      const entry = entryFile || "index.html";
      shell.openPath(path.join(toolDir, entry));
    } else {
      // Try to open the folder
      shell.openPath(toolDir);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("uninstall-tool", async (_, { toolId }) => {
  const toolDir = path.join(PROGRAMS_DIR, toolId);

  try {
    if (fs.existsSync(toolDir)) {
      fs.rmSync(toolDir, { recursive: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("get-installed", async () => {
  ensureProgramsDir();
  const entries = fs.readdirSync(PROGRAMS_DIR);
  const installed = [];

  for (const entry of entries) {
    const metaPath = path.join(PROGRAMS_DIR, entry, ".toolfolk.json");
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        installed.push(meta);
      } catch {}
    }
  }

  return installed;
});

ipcMain.handle("check-runtimes", async () => {
  return {
    python: findPython() !== null,
    node: findNode() !== null,
  };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
