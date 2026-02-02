#!/bin/bash
# Stop NyRAG UI and optionally Vespa Docker container
# Usage: ./stop_nyrag.sh [all]
#   ./stop_nyrag.sh       - Stop only NyRAG UI
#   ./stop_nyrag.sh all   - Stop both NyRAG UI and Vespa Docker

set -e

echo "=== Stopping NyRAG ==="

# Stop NyRAG UI processes
echo "Stopping NyRAG UI processes..."
PIDS=$(pgrep -f "nyrag ui" || true)
if [ ! -z "$PIDS" ]; then
    for pid in $PIDS; do
        echo "  Stopping nyrag UI (PID: $pid)..."
        kill -9 $pid 2>/dev/null || true
    done
    echo "✅ NyRAG UI stopped"
else
    echo "  No nyrag UI processes found"
fi

# Check if user wants to stop Vespa too
if [ "$1" == "all" ]; then
    echo ""
    echo "=== Stopping Vespa Docker Container ==="
    if docker ps -q -f name=vespa | grep -q .; then
        echo "Stopping vespa container..."
        docker stop vespa 2>/dev/null || true
        echo "✅ Vespa container stopped"
    else
        echo "  No vespa container running"
    fi
    echo ""
    echo "✅ All services stopped (NyRAG + Vespa)"
else
    echo ""
    echo "✅ NyRAG UI stopped"
    echo ""
    echo "To also stop Vespa Docker, run:"
    echo "  ./stop_nyrag.sh all"
    echo ""
    echo "Or manually:"
    echo "  docker stop vespa"
fi

echo ""
echo "Status check:"
echo "  NyRAG UI: Stopped"
if [ "$1" == "all" ]; then
    echo "  Vespa:    Stopped"
else
    if docker ps -q -f name=vespa | grep -q .; then
        echo "  Vespa:    Running (port 8080/19071)"
    else
        echo "  Vespa:    Not running"
    fi
fi