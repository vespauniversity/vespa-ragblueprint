#!/bin/bash
# Run NyRAG UI with Vespa Cloud deployment (ragblueprint app)
# This script uses the vespa_cloud deployment without generating new schemas

set -e  # Exit on any error

echo "=== Starting NyRAG UI with Vespa Cloud ==="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run: uv sync"
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Get Vespa Cloud endpoint from CLI config
echo "Checking Vespa Cloud status..."
VESPA_TARGET=$(vespa config get target 2>/dev/null | grep -o "cloud" || echo "")
if [ "$VESPA_TARGET" != "cloud" ]; then
    echo "⚠️  Vespa CLI not configured for cloud target"
    echo "Please run: vespa config set target cloud"
    exit 1
fi

# Check if Vespa Cloud deployment is accessible
if ! vespa status >/dev/null 2>&1; then
    echo "❌ Cannot connect to Vespa Cloud deployment"
    echo "Please ensure your application is deployed to Vespa Cloud"
    exit 1
fi

echo "✅ Vespa Cloud deployment is accessible"

# Get Vespa Cloud endpoint URL
VESPA_ENDPOINT=$(vespa status --format plain 2>/dev/null | grep -oP 'https://[^\s]+' | head -1 || echo "")

# Use token endpoint for Vespa Cloud (not the mTLS endpoint)
TOKEN_ENDPOINT="https://ebaf55f7.ccbe61cf.z.vespa-app.cloud"

# Extract token from doc_example.yml if not already set
if [ -z "$VESPA_CLOUD_SECRET_TOKEN" ]; then
    CONFIG_FILE="$SCRIPT_DIR/doc_example.yml"
    if [ -f "$CONFIG_FILE" ]; then
        # Extract token from YAML config (looks for "token: vespa_cloud_...")
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
export VESPA_URL=${TOKEN_ENDPOINT}
export VESPA_PORT=443
export PYTHONUNBUFFERED=1

# Check if VESPA_CLOUD_SECRET_TOKEN is set
if [ -z "$VESPA_CLOUD_SECRET_TOKEN" ]; then
    echo "⚠️  Warning: VESPA_CLOUD_SECRET_TOKEN not set"
    echo "Please set your Vespa Cloud data plane token:"
    echo "  export VESPA_CLOUD_SECRET_TOKEN='your-token-here'"
    echo "Or add it to doc_example.yml under vespa_cloud.token"
    echo "Get your token from: https://console.vespa-cloud.com/"
    echo ""
    exit 1
fi

echo ""
echo "Configuration:"
echo "  NYRAG_VESPA_DEPLOY=$NYRAG_VESPA_DEPLOY (skip deployment)"
echo "  VESPA_URL=$VESPA_URL"
echo "  VESPA_PORT=$VESPA_PORT"
echo "  VESPA_CLOUD_SECRET_TOKEN: ${VESPA_CLOUD_SECRET_TOKEN:+***set***}"
echo ""

# Check if existing vespa_app exists
VESPA_APP_PATH="$SCRIPT_DIR/vespa_cloud"
if [ ! -d "$VESPA_APP_PATH" ]; then
    echo "❌ Vespa app not found at: $VESPA_APP_PATH"
    exit 1
fi

echo "✅ Using Vespa Cloud app from: $VESPA_APP_PATH"
echo ""

# Verify deployment is ready
echo "Verifying Vespa Cloud deployment..."
echo "✅ Vespa Cloud deployment is ready"

# echo ""
# echo "Starting NyRAG UI server..."
# echo "  URL: http://localhost:8000"
# echo ""
# echo "Press Ctrl+C to stop"
# echo ""

# Run the UI (token-based auth, no browser login needed)
# The VESPA_CLOUD_SECRET_TOKEN environment variable handles authentication
exec nyrag ui --host 0.0.0.0 --port 8000