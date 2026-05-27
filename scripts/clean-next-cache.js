const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const linkPath = path.join(process.cwd(), ".next");
const externalPath = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  "kavisha-next-cache",
);

function samePath(a, b) {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function isJunctionToExternal() {
  if (!fs.existsSync(linkPath)) return false;
  try {
    return samePath(fs.realpathSync.native(linkPath), externalPath);
  } catch {
    return false;
  }
}

if (isJunctionToExternal()) {
  try {
    execSync(`cmd /c rmdir "${linkPath}"`, { stdio: "ignore" });
  } catch {}
} else if (fs.existsSync(linkPath)) {
  try {
    fs.rmSync(linkPath, { recursive: true, force: true });
  } catch {}
}

if (fs.existsSync(externalPath)) {
  try {
    fs.rmSync(externalPath, { recursive: true, force: true });
  } catch {}
}
