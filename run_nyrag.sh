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
# Priority: 1. Environment variable, 2. Config file, 3. vespa status
TOKEN_ENDPOINT=""

# First: Environment variable (highest priority for temporary overrides)
if [ -n "$VESPA_CLOUD_ENDPOINT" ]; then
    TOKEN_ENDPOINT="$VESPA_CLOUD_ENDPOINT"
    echo "✅ Using endpoint from VESPA_CLOUD_ENDPOINT environment variable"
fi

# Second: Config file (persistent configuration)
if [ -z "$TOKEN_ENDPOINT" ]; then
    CONFIG_FILE="$SCRIPT_DIR/config/doc_example.yml"
    if [ -f "$CONFIG_FILE" ]; then
        CONFIG_ENDPOINT=$(grep -E "^\s+endpoint:\s+https://" "$CONFIG_FILE" | sed -E 's/.*endpoint:\s+//' | tr -d ' ' | head -1)
        if [ -n "$CONFIG_ENDPOINT" ] && [ "$CONFIG_ENDPOINT" != "https://your-vespa-cloud-endpoint-here.vespa-app.cloud" ]; then
            TOKEN_ENDPOINT="$CONFIG_ENDPOINT"
            echo "✅ Using endpoint from config file: $TOKEN_ENDPOINT"
        fi
    fi
fi

# Third: Fallback to vespa status (auto-detection)
if [ -z "$TOKEN_ENDPOINT" ]; then
    TOKEN_ENDPOINT=$(vespa status 2>/dev/null | grep "(token)" | grep -oP 'https://[^\s]+' || echo "")
    if [ -n "$TOKEN_ENDPOINT" ]; then
        echo "✅ Using token endpoint from vespa status: $TOKEN_ENDPOINT"
    else
        echo "❌ Could not determine Vespa Cloud token endpoint"
        echo "Please either:"
        echo "  1. Set endpoint in config/doc_example.yml under vespa_cloud.endpoint (recommended)"
        echo "  2. Export VESPA_CLOUD_ENDPOINT='https://your-app.vespa-app.cloud'"
        echo "  3. Ensure 'vespa status' returns your deployment info"
        exit 1
    fi
fi

# Extract token from config/doc_example.yml if not already set
if [ -z "$VESPA_CLOUD_SECRET_TOKEN" ]; then
    CONFIG_FILE="$SCRIPT_DIR/config/doc_example.yml"
    if [ -f "$CONFIG_FILE" ]; then
        # Extract token from YAML config under vespa_cloud section
        TOKEN=$(grep -E "^\s+token:\s+\S+" "$CONFIG_FILE" | sed -E 's/.*token:\s+//' | tr -d ' ')
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "your-vespa-cloud-token-here" ]; then
            export VESPA_CLOUD_SECRET_TOKEN="$TOKEN"
            echo "✅ Using token from $CONFIG_FILE"
        fi
    fi
fi

# Set environment variables for Vespa Cloud
export NYRAG_LOCAL=0
export NYRAG_CLOUD_MODE=1
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

# Validate config file
echo "Validating configuration..."
CONFIG_FILE="$SCRIPT_DIR/config/doc_example.yml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Config file not found: $CONFIG_FILE"
    echo "Please create it from the example template."
    exit 1
fi

# Check if endpoint is configured (not placeholder)
CONFIG_ENDPOINT=$(grep -E "^\s+endpoint:\s+https://" "$CONFIG_FILE" | sed -E 's/.*endpoint:\s+//' | tr -d ' ' | head -1)
if [ -z "$CONFIG_ENDPOINT" ] || [ "$CONFIG_ENDPOINT" = "https://your-vespa-cloud-endpoint-here.vespa-app.cloud" ]; then
    echo "❌ Vespa Cloud endpoint not configured in $CONFIG_FILE"
    echo "Please set a valid endpoint under vespa_cloud.endpoint"
    exit 1
fi

# Check if token is configured (not placeholder)
CONFIG_TOKEN=$(grep -E "^\s+token:\s+\S+" "$CONFIG_FILE" | sed -E 's/.*token:\s+//' | tr -d ' ' | head -1)
if [ -z "$CONFIG_TOKEN" ] || [ "$CONFIG_TOKEN" = "your-vespa-cloud-token-here" ]; then
    echo "❌ Vespa Cloud token not configured in $CONFIG_FILE"
    echo "Please set a valid token under vespa_cloud.token"
    exit 1
fi

echo "✅ Configuration validated successfully"
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
echo ""
echo "Starting NyRAG UI..."
echo "Opening browser at http://localhost:8000"
echo ""

# Open browser after a short delay (in background)
(sleep 2 && python3 -m webbrowser "http://localhost:8000" 2>/dev/null) &

# Run the UI (token-based auth, no browser login needed)
# The VESPA_CLOUD_SECRET_TOKEN environment variable handles authentication
exec nyrag ui --host 0.0.0.0 --port 8000