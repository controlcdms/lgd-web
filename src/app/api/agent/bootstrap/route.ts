import { NextResponse } from "next/server";

/**
 * Agent bootstrap script (DC) download.
 *
 * Goal: give a new user a single file they can run to create the agent folder,
 * fetch env/config from the panel, and start docker compose.
 *
 * NOTE: Today we still rely on legacy /download/tunnelkey to get environment_variables.txt.
 * We intentionally ignore SSH keys and do NOT configure tunnels here.
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
mkdir -p "$DIR/secrets"
cd "$DIR"

echo "== LGD Agent bootstrap =="
echo "Panel: $PANEL_URL"

echo "-> Descargando environment (.env) desde /download/tunnelkey (legacy)"
# Descargamos el zip legacy pero SOLO usamos environment_variables.txt (ignoramos llaves).
HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "$PANEL_URL/download/tunnelkey" \
  -d "token_lgd=$TOKEN_LGD" \
  -o "secrets/ssh_keys.zip" || true)

if [[ "\${HTTP_CODE: -3}" != "200" ]]; then
  echo "ERROR: no se pudo descargar tunnelkey. HTTP=\${HTTP_CODE: -3}" >&2
  exit 1
fi

rm -f .env secrets/environment_variables.txt || true

if command -v unzip >/dev/null 2>&1; then
  unzip -o "secrets/ssh_keys.zip" environment_variables.txt -d "secrets" >/dev/null 2>&1 || true
else
  echo "ERROR: unzip no instalado. Instala unzip y reintenta." >&2
  exit 1
fi

if [[ ! -f secrets/environment_variables.txt ]]; then
  echo "ERROR: no se encontró environment_variables.txt dentro del zip" >&2
  exit 1
fi

cp secrets/environment_variables.txt .env

# Normalización: algunos agentes usan URL/TOKEN; aseguramos también PANEL_URL/TOKEN_LGD
# (no falla si ya existen)
if ! grep -qE '^URL=' .env; then echo "URL=$PANEL_URL" >> .env; fi
if ! grep -qE '^TOKEN=' .env; then echo "TOKEN=$TOKEN_LGD" >> .env; fi

# Descarga de dashboard runtime (lgd.py) desde templates.
# Nota: en panel.letsgodeploy.com el template run.sh está devolviendo 500;
# generamos un run.sh mínimo local.
echo "-> Descargando lgd.py"
curl -fsSL "$PANEL_URL/get_template_dc?template_name=lgd.py.jinja" -o lgd.py

echo "-> Generando run.sh"
cat > run.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail

# Ejecuta el dashboard/agent (Flask) local
python3 lgd.py
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
