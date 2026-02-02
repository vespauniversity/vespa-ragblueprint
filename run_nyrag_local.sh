#!/bin/bash
# Run NyRAG UI with existing Vespa deployment (ragblueprint app)
# This script uses the pre-deployed ragblueprint vespa_app without generating new schemas

set -e  # Exit on any error

echo "=== Starting NyRAG UI with Existing Vespa ==="

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

# Check if Vespa is running
echo "Checking Vespa status..."
if ! curl -s http://localhost:8080/ApplicationStatus >/dev/null 2>&1; then
    echo "⚠️  Vespa is not running on localhost:8080"
    echo "Please run: ./run_vespa.sh"
    exit 1
fi

echo "✅ Vespa is running on localhost:8080"

# Set environment variables to skip deployment and use existing Vespa
export NYRAG_LOCAL=1
export NYRAG_VESPA_DEPLOY=0
export VESPA_URL=http://localhost
export VESPA_PORT=8080
export PYTHONUNBUFFERED=1

echo ""
echo "Configuration:"
echo "  NYRAG_VESPA_DEPLOY=$NYRAG_VESPA_DEPLOY (skip deployment)"
echo "  VESPA_URL=$VESPA_URL"
echo "  VESPA_PORT=$VESPA_PORT"
echo ""

# Check if existing vespa_app exists
VESPA_APP_PATH="$SCRIPT_DIR/vespa_local"
if [ ! -d "$VESPA_APP_PATH" ]; then
    echo "❌ Vespa app not found at: $VESPA_APP_PATH"
    exit 1
fi

echo "✅ Using existing Vespa app from: $VESPA_APP_PATH"
echo ""

# Verify deployment is ready
echo "Checking Vespa deployment status..."
if vespa status >/dev/null 2>&1; then
    echo "✅ Vespa deployment is ready"
else
    echo "⚠️  Deploying ragblueprint app to Vespa..."
    vespa config set target local
    vespa deploy --wait 300 "$VESPA_APP_PATH"
fi

echo ""
echo "Starting NyRAG UI server..."
echo "  URL: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Run the UI
exec nyrag ui --host 0.0.0.0 --port 8000