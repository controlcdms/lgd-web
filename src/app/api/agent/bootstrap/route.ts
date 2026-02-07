import { NextResponse } from "next/server";

/**
 * Agent bootstrap script (DC) download.
 *
 * Goal: give a new user a single file they can run to create the agent folder,
 * fetch env/config from the panel, and start docker compose.
 *
 * NOTE: We DO NOT rely on legacy /download/tunnelkey anymore (tunnel is not needed for now).
 * We generate a minimal .env with PANEL_URL + TOKEN_LGD.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();

  // Panel real de Odoo (no el dashboard Next). Si no se setea, caería en NEXT_PUBLIC_BASE_URL y rompería /download/tunnelkey.
  const panelUrl = (
    process.env.LGD_PANEL_ODOO_URL ||
    "https://panel.letsgodeploy.com"
  ).replace(/\/$/, "");

  // NOTE: this is a Bash script inside a JS template literal.
  // Be careful to escape Bash parameter expansions (use \${...}) so JS doesn't try to interpolate them.
  const script = `#!/usr/bin/env bash
set -euo pipefail

PANEL_URL="${panelUrl}"
TOKEN_LGD="${token}"

if [[ -z "$PANEL_URL" ]]; then
  echo "ERROR: PANEL_URL vacío (NEXT_PUBLIC_BASE_URL/NEXTAUTH_URL no configurado en el servidor)" >&2
  exit 1
fi

if [[ -z "$TOKEN_LGD" ]]; then
  echo "Pega tu token_lgd:" >&2
  read -r TOKEN_LGD
fi

if [[ -z "$TOKEN_LGD" ]]; then
  echo "ERROR: token_lgd requerido" >&2
  exit 1
fi

DIR="lgd-agent"
mkdir -p "$DIR"
cd "$DIR"

echo "== LGD Agent bootstrap =="
echo "Panel: $PANEL_URL"

echo "-> Generando .env (sin tunnelkey)"
cat > .env <<EOF
# generado por lgd-agent-bootstrap
PANEL_URL=$PANEL_URL
TOKEN_LGD=$TOKEN_LGD
# compat legacy
URL=$PANEL_URL
TOKEN=$TOKEN_LGD
EOF

# Descarga de dashboard runtime (lgd.py) desde templates.
# Nota: en panel.letsgodeploy.com el template run.sh está devolviendo 500;
# generamos un run.sh mínimo local.
# Descargar el paquete venv (init.sh + run.sh + requirements.txt + lgd.py)
# Nota: run.sh del panel estaba dando 500, por eso lo generamos desde aquí.
echo "-> Descargando lgd.py"
curl -fsSL "$PANEL_URL/get_template_dc?template_name=lgd.py.jinja" -o lgd.py

echo "-> Generando requirements.txt"
cat > requirements.txt <<'REQ'
flask
python-dotenv
docker
requests
REQ

echo "-> Generando init.sh"
cat > init.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# Ruta del script (por si se ejecuta desde otro lado)
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

# Detectar python
PYTHON_BIN="\${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "❌ No se encontró Python."
  echo ""
  echo "👉 Instálalo con alguno de los siguientes comandos según tu sistema:"
  echo "   - Debian/Ubuntu: sudo apt update && sudo apt install -y python3"
  echo "   - Fedora:        sudo dnf install -y python3"
  echo "   - CentOS/RHEL:   sudo yum install -y python3"
  echo "   - Arch Linux:    sudo pacman -S --noconfirm python"
  exit 1
fi

# Verificar si el módulo venv está disponible
if ! "$PYTHON_BIN" -m venv --help >/dev/null 2>&1; then
  echo "⚠️  El módulo 'venv' no está instalado. Intentando instalar..."
  if command -v apt >/dev/null 2>&1; then
    sudo apt update && sudo apt install -y python3-venv
  else
    echo "❌ No se pudo instalar automáticamente. Instálalo manualmente."
    exit 1
  fi
fi

# Crear venv
if [ ! -d "$SCRIPT_DIR/env" ]; then
  "$PYTHON_BIN" -m venv "$SCRIPT_DIR/env"
fi

# Comprobar que activate existe
if [ ! -f "$SCRIPT_DIR/env/bin/activate" ]; then
  echo "❌ El entorno virtual está incompleto. Eliminando y recreando..."
  rm -rf "$SCRIPT_DIR/env"
  "$PYTHON_BIN" -m venv "$SCRIPT_DIR/env"
fi

# Activar venv
# shellcheck disable=SC1091
source "$SCRIPT_DIR/env/bin/activate"

# Actualizar pip e instalar deps
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"

echo "✅ Entorno preparado. Ejecuta: $SCRIPT_DIR/run.sh"
SH
chmod +x init.sh || true

echo "-> Generando run.sh"
cat > run.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# Activar venv
# shellcheck disable=SC1091
source env/bin/activate

python lgd.py
SH
chmod +x run.sh || true

echo
echo "Listo. Próximos pasos:"
echo "  1) Ejecuta: bash init.sh"
echo "  2) (Luego) Ejecuta: bash run.sh"
`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": "attachment; filename=lgd-agent-bootstrap.sh",
      "Cache-Control": "no-store",
    },
  });
}
