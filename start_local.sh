#!/bin/bash
# Complete setup: Start Vespa and run NyRAG UI
# This script orchestrates the full setup process

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  NyRAG + Vespa Complete Setup"
echo "=========================================="
echo ""

# Check if Vespa is already running
if curl -s http://localhost:8080/ApplicationStatus >/dev/null 2>&1; then
    echo "✅ Vespa is already running on localhost:8080"
    echo ""
    read -p "Do you want to restart Vespa? (y/N): " restart
    if [[ $restart =~ ^[Yy]$ ]]; then
        echo "Stopping existing Vespa container..."
        docker stop vespa 2>/dev/null || true
        echo "Starting fresh Vespa container..."
        ./run_vespa_local.sh
    fi
else
    echo "🚀 Starting Vespa Docker container..."
    ./run_vespa_local.sh
fi

echo ""
echo "=========================================="
echo ""

# Now run NyRAG UI
echo "🚀 Starting NyRAG UI..."
./run_nyrag_local.sh