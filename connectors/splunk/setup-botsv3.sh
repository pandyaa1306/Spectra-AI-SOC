#!/usr/bin/env bash
# Downloads BOTS v3 (pre-indexed, about 320 MB, CC0) and installs it into the local Splunk container.
# Run from the project root on Linux, macOS, WSL or Git Bash:
#   export SPLUNK_PASSWORD='YourStrongPass1!'
#   bash connectors/splunk/setup-botsv3.sh
set -euo pipefail

COMPOSE="docker compose -f connectors/splunk/docker-compose.splunk.yml"
URL="https://botsdataset.s3.amazonaws.com/botsv3/botsv3_data_set.tgz"
MD5="d7ccca99a01cff070dff3c139cdc10eb"
DL_DIR="${DL_DIR:-./.bots}"

mkdir -p "$DL_DIR"
if [ ! -f "$DL_DIR/botsv3_data_set.tgz" ]; then
  echo "Downloading BOTS v3..."
  curl -fL --retry 3 -o "$DL_DIR/botsv3_data_set.tgz" "$URL"
fi

echo "Verifying MD5..."
if command -v md5sum >/dev/null; then SUM=$(md5sum "$DL_DIR/botsv3_data_set.tgz" | cut -d' ' -f1); else SUM=$(md5 -q "$DL_DIR/botsv3_data_set.tgz"); fi
[ "$SUM" = "$MD5" ] || { echo "MD5 mismatch ($SUM)"; exit 1; }

if [ ! -d "$DL_DIR/botsv3_data_set" ]; then
  tar -xzf "$DL_DIR/botsv3_data_set.tgz" -C "$DL_DIR"
fi

[ -d "$DL_DIR/botsv3_data_set" ] || { echo "Expected folder $DL_DIR/botsv3_data_set after extraction; check the archive contents"; exit 1; }

echo "Starting Splunk..."
$COMPOSE up -d
echo "Waiting for Splunk to become healthy (first start takes 2-4 min)..."
for i in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' spectra-splunk 2>/dev/null)" = "healthy" ] && break
  [ "$i" = 60 ] && { echo "Splunk did not become healthy in 10 min: docker logs spectra-splunk"; exit 1; }
  sleep 10; printf '.'
done
echo

echo "Installing BOTS v3 app..."
docker cp "$DL_DIR/botsv3_data_set" spectra-splunk:/opt/splunk/etc/apps/
docker exec -u root spectra-splunk chown -R splunk:splunk /opt/splunk/etc/apps/botsv3_data_set
docker exec -u splunk spectra-splunk /opt/splunk/bin/splunk restart >/dev/null

echo "Checking data..."
sleep 20
docker exec -u splunk spectra-splunk /opt/splunk/bin/splunk search \
  'index=botsv3 earliest=0 | stats count by sourcetype | sort -count | head 10' -auth "admin:${SPLUNK_PASSWORD}" || true

cat <<EOF

Done. Splunk Web: http://localhost:8000  (admin / \$SPLUNK_PASSWORD)
Next:
  export SPLUNK_URL=https://localhost:8089 SPLUNK_USERNAME=admin SPLUNK_VERIFY_TLS=false
  npm run ingest:splunk -- --client c1 --dry-run
  npm run ingest:splunk -- --client c1
EOF
