#!/bin/bash
# Fix Docker port conflicts - Run this with sudo
# Usage: sudo ./fix_ports.sh

echo "=== Fixing Docker Port Conflicts ==="
echo ""

HTTP_PORT="8080"
CONFIG_PORT="19071"

echo "Killing processes on ports $HTTP_PORT and $CONFIG_PORT..."

# Get PIDs using these ports
HTTP_PIDS=$(lsof -t -i:$HTTP_PORT 2>/dev/null)
CONFIG_PIDS=$(lsof -t -i:$CONFIG_PORT 2>/dev/null)

# Kill docker-proxy processes
for pid in $HTTP_PIDS $CONFIG_PIDS; do
    if [ ! -z "$pid" ]; then
        echo "  Killing PID $pid..."
        kill -9 $pid 2>/dev/null || echo "  Could not kill $pid"
    fi
done

# Also try to kill all docker-proxy processes related to these ports
for pid in $(ps aux | grep docker-proxy | grep -E "$HTTP_PORT|$CONFIG_PORT" | awk '{print $2}'); do
    if [ ! -z "$pid" ]; then
        echo "  Killing docker-proxy PID $pid..."
        kill -9 $pid 2>/dev/null || echo "  Could not kill $pid"
    fi
done

# Clean up any stuck containers
echo "Cleaning up containers..."
docker stop vespa 2>/dev/null || true
docker rm -f vespa 2>/dev/null || true

echo ""
echo "✅ Port cleanup complete!"
echo ""
echo "You can now run: ./run_vespa.sh"