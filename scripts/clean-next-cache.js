const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const linkPath = path.join(process.cwd(), ".next");
const externalPath = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  "kavisha-next-cache"
);

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function removePathWin(target) {
  if (!fs.existsSync(target)) return;
  try {
    execSync(`cmd /c rmdir /s /q "${target}"`, { stdio: "ignore" });
  } catch {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
    } catch {}
  }
}

function removePath(target) {
  if (!fs.existsSync(target)) return;
  if (process.platform === "win32") {
    removePathWin(target);
    return;
  }
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
  } catch {}
}

function isJunctionToExternal() {
  if (!fs.existsSync(linkPath)) return false;
  try {
    return samePath(fs.realpathSync.native(linkPath), externalPath);
  } catch {
    return false;
  }
}

// Remove .next (junction or folder) — fixes EINVAL readlink on OneDrive/Windows
if (isJunctionToExternal()) {
  removePathWin(linkPath);
} else {
  removePath(linkPath);
}

removePath(externalPath);
