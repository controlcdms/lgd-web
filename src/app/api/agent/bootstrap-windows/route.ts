import { NextResponse } from "next/server";

/**
 * Windows (PowerShell) bootstrap script.
 *
 * Goal: allow a single-line PowerShell copy/paste to run the Linux bootstrap
 * inside WSL, installing minimal dependencies on the WSL distro first.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();

  const panelBase = (
    process.env.LGD_PANEL_NEXT_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");

  const bootstrapUrl = token
    ? `${panelBase}/api/agent/bootstrap?token=${encodeURIComponent(token)}`
    : `${panelBase}/api/agent/bootstrap`;

  const script = `# LGD Agent bootstrap (Windows)
$ErrorActionPreference = "Stop"

$bootstrapUrl = "${bootstrapUrl}"

# WSL check
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
  Write-Host "WSL no está instalado. Ejecuta: wsl --install (como Administrador) y reinicia." -ForegroundColor Red
  exit 1
}

# Ensure a WSL distro exists (Ubuntu preferred)
$distros = wsl -l -q 2>$null | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if (-not $distros) {
  Write-Host "No hay distros WSL instaladas. Instalando Ubuntu..." -ForegroundColor Yellow
  wsl --install -d Ubuntu
  Write-Host "Reinicia el equipo y vuelve a ejecutar este comando." -ForegroundColor Yellow
  exit 1
}

# Pick Ubuntu if present; otherwise use first available distro
$target = ($distros | Where-Object { $_ -match "Ubuntu" } | Select-Object -First 1)
if (-not $target) { $target = $distros | Select-Object -First 1 }

# Run Linux bootstrap inside WSL
wsl -d "$target" -- bash -lc "set -e; \
  sudo apt update; \
  sudo apt install -y curl unzip python3 python3-venv docker.io docker-compose-plugin; \
  sudo service docker start || sudo systemctl enable --now docker || true; \
  curl -fsSL '$bootstrapUrl' | bash"

Write-Host "Listo. En WSL ejecuta: cd ~/lgd-agent && bash init.sh && bash run.sh (puerto 5009)" -ForegroundColor Green
`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=lgd-agent-bootstrap.ps1",
      "Cache-Control": "no-store",
    },
  });
}
