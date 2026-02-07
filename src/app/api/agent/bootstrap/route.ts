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

echo "-> Descargando requirements.txt"
curl -fsSL "$PANEL_URL/get_template_dc?template_name=requirements.txt" -o requirements.txt

echo "-> Descargando init.sh"
curl -fsSL "$PANEL_URL/get_template_dc?template_name=init.sh" -o init.sh
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

# docker-compose.yml:
# Si en el futuro el panel expone template docker-compose, lo descargamos.
# Por ahora asumimos que el zip legacy ya trae suficiente para que el usuario ejecute el agent DC.
if [[ ! -f docker-compose.yml ]]; then
  echo "WARN: docker-compose.yml no existe."
  echo "      Si ya tienes un starter pack, copia dc/docker-compose.yml aquí como docker-compose.yml" >&2
fi

echo
echo "Listo. Próximos pasos:"
echo "  1) Asegúrate de tener docker + docker compose instalados"
echo "  2) Coloca docker-compose.yml en esta carpeta (si aún no existe)"
echo "  3) Ejecuta: docker compose up -d"
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
