const { execSync } = require("child_process");

const port = process.env.PORT || 3000;

if (process.platform === "win32") {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" }
    );
  } catch {}
}
