#!/bin/bash
# Process documents and feed to Vespa Cloud

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
source .venv/bin/activate

# Extract token from doc_example.yml if not already set
if [ -z "$VESPA_CLOUD_SECRET_TOKEN" ]; then
    CONFIG_FILE="$SCRIPT_DIR/doc_example.yml"
    if [ -f "$CONFIG_FILE" ]; then
        TOKEN=$(grep -E "^\s+token:\s+vespa_cloud_" "$CONFIG_FILE" | sed -E 's/.*token:\s+//' | tr -d ' ')
        if [ -n "$TOKEN" ]; then
            export VESPA_CLOUD_SECRET_TOKEN="$TOKEN"
            echo "✅ Using token from $CONFIG_FILE"
        fi
    fi
fi

# Set environment variables for Vespa Cloud
export NYRAG_LOCAL=0
export NYRAG_VESPA_DEPLOY=0
export VESPA_URL='https://ebaf55f7.ccbe61cf.z.vespa-app.cloud'
export VESPA_PORT=443
export PYTHONUNBUFFERED=1

# Check if token is set
if [ -z "$VESPA_CLOUD_SECRET_TOKEN" ]; then
    echo "❌ VESPA_CLOUD_SECRET_TOKEN not set"
    exit 1
fi

echo ""
echo "Configuration:"
echo "  VESPA_URL=$VESPA_URL"
echo "  VESPA_PORT=$VESPA_PORT"
echo "  VESPA_CLOUD_SECRET_TOKEN: ***set***"
echo ""

# Process documents
exec nyrag process --config doc_example.yml
