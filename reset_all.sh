#!/bin/bash
# Complete reset - Run this with sudo to fix all Docker/Vespa issues
# Usage: sudo ./reset_all.sh

echo "=========================================="
echo "  Complete Docker/Vespa Reset"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill all docker-proxy processes
echo -e "${YELLOW}Step 1: Killing docker-proxy processes...${NC}"
for pid in $(ps aux | grep docker-proxy | grep -v grep | awk '{print $2}'); do
    echo "  Killing docker-proxy PID $pid..."
    kill -9 $pid 2>/dev/null || echo "  Failed to kill $pid"
done

# Kill processes on specific ports
echo -e "${YELLOW}Step 2: Clearing ports 8080 and 19071...${NC}"
for port in 8080 19071; do
    pids=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "  Port $port: Killing PIDs $pids..."
        for pid in $pids; do
            kill -9 $pid 2>/dev/null || echo "    Failed to kill $pid"
        done
    else
        echo "  Port $port: Already clear ✓"
    fi
done

# Stop and remove all Vespa containers
echo -e "${YELLOW}Step 3: Removing Vespa containers...${NC}"
containers=$(docker ps -aq --filter "name=vespa" 2>/dev/null)
if [ ! -z "$containers" ]; then
    docker stop $containers 2>/dev/null || true
    docker rm -f $containers 2>/dev/null || true
    echo "  Removed containers: $containers"
else
    echo "  No Vespa containers found ✓"
fi

# Clean up Docker networks
echo -e "${YELLOW}Step 4: Cleaning up Docker networks...${NC}"
docker network prune -f 2>/dev/null || echo "  Network cleanup skipped"

# Optional: Restart Docker
echo ""
read -p "Restart Docker daemon? (y/N): " restart
echo ""
if [[ $restart =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Step 5: Restarting Docker...${NC}"
    if command -v systemctl &> /dev/null; then
        systemctl restart docker
    else
        service docker restart
    fi
    echo "Waiting for Docker to start..."
    sleep 5
    echo "Docker restarted ✓"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Reset Complete!"
echo "==========================================${NC}"
echo ""
echo "You can now run:"
echo "  ./run_vespa.sh"
echo "  ./run_nyrag.sh"
echo ""
echo "Or simply:"
echo "  ./start.sh"