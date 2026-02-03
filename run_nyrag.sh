#!/bin/bash
# Run NyRAG UI with Vespa Cloud deployment
# Simplified startup script

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

# Ensure default 'doc' project exists based on example
if [ ! -f "output/doc/conf.yml" ]; then
    echo "Creating default 'doc' project from config/doc_example.yml..."
    mkdir -p output/doc
    cp config/doc_example.yml output/doc/conf.yml
else
    echo "Default 'doc' project already exists."
fi

# Set environment variables for Vespa Cloud mode
export NYRAG_LOCAL=0
export NYRAG_CLOUD_MODE=1
export NYRAG_VESPA_DEPLOY=0
export VESPA_PORT=443
export PYTHONUNBUFFERED=1

# Note: If VESPA_CLOUD_SECRET_TOKEN is not set, the app will try mTLS auth
# using VESPA_CLIENT_CERT and VESPA_CLIENT_KEY environment variables

echo ""
echo "Starting NyRAG UI..."
echo "Opening browser at http://localhost:8000"
echo ""

# Open browser when server is ready (in background)
(
  # Wait for server to be ready (max 30 seconds)
  for i in {1..30}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
      python3 -m webbrowser "http://localhost:8000" 2>/dev/null
      break
    fi
    sleep 1
  done
) &

# Run the UI
exec nyrag ui --host localhost --port 8000