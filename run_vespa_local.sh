#!/bin/bash
# Start Vespa Docker container for local development
# This script ensures clean startup and handles port conflicts

echo "=== Starting Vespa Docker Container ==="

# Configuration
VESPA_IMAGE="vespaengine/vespa:8.620.35"
CONTAINER_NAME="vespa"
HTTP_PORT="8080"
CONFIG_PORT="19071"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Function to kill processes using a port
kill_port_processes() {
    local port=$1
    local pids=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "Found processes on port $port: $pids"
        for pid in $pids; do
            echo "  Attempting to kill PID $pid..."
            kill -9 $pid 2>/dev/null || true
        done
        return 0
    fi
    return 1
}

# Aggressive cleanup of existing containers and ports
echo "Performing aggressive cleanup..."

# Stop and remove ALL vespa containers
docker stop $(docker ps -q --filter "name=vespa" 2>/dev/null) 2>/dev/null || true
docker rm -f $(docker ps -aq --filter "name=vespa" 2>/dev/null) 2>/dev/null || true

# Try to kill any processes using the ports
echo "Checking ports $HTTP_PORT and $CONFIG_PORT..."
if ! check_port $HTTP_PORT || ! check_port $CONFIG_PORT; then
    echo "Ports are occupied. Attempting to free them..."
    kill_port_processes $HTTP_PORT
    kill_port_processes $CONFIG_PORT
    
    # Try killing docker-proxy processes specifically
    for pid in $(ps aux | grep docker-proxy | grep -E "$HTTP_PORT|$CONFIG_PORT" | awk '{print $2}'); do
        echo "  Killing docker-proxy PID $pid..."
        kill -9 $pid 2>/dev/null || true
    done
    
    sleep 3
    
    # Check if ports are still in use
    if ! check_port $HTTP_PORT || ! check_port $CONFIG_PORT; then
        echo ""
        echo "⚠️  WARNING: Ports $HTTP_PORT and/or $CONFIG_PORT are still in use!"
        echo ""
        echo "This is likely caused by zombie docker-proxy processes owned by root."
        echo ""
        echo "To fix this, run one of the following commands with sudo:"
        echo ""
        echo "Option 1 - Kill specific processes:"
        echo "  sudo kill -9 \$(lsof -t -i:$CONFIG_PORT) \$(lsof -t -i:$HTTP_PORT)"
        echo ""
        echo "Option 2 - Restart Docker:"
        echo "  sudo systemctl restart docker"
        echo "  # or: sudo service docker restart"
        echo ""
        echo "Option 3 - Use alternative ports (edit this script and change HTTP_PORT and CONFIG_PORT)"
        echo ""
        echo "After fixing, run this script again."
        echo ""
        exit 1
    fi
fi

echo "Ports are clear. Starting Vespa container..."
echo "  Image: $VESPA_IMAGE"
echo "  HTTP Port: $HTTP_PORT"
echo "  Config Port: $CONFIG_PORT"

# Start the Vespa container
if docker run --detach \
    --name $CONTAINER_NAME \
    --hostname vespa-container \
    --publish 127.0.0.1:$HTTP_PORT:$HTTP_PORT \
    --publish 127.0.0.1:$CONFIG_PORT:$CONFIG_PORT \
    --memory="4g" \
    --memory-swap="4g" \
    $VESPA_IMAGE; then
    
    echo ""
    echo "✅ Vespa container started successfully!"
    echo ""
    echo "Container ID: $(docker ps -q -f name=$CONTAINER_NAME)"
    echo "HTTP Endpoint: http://localhost:$HTTP_PORT"
    echo "Config Endpoint: http://localhost:$CONFIG_PORT"
    echo ""
    echo "To check status: docker logs -f $CONTAINER_NAME"
    echo "To stop: docker stop $CONTAINER_NAME"
    echo ""
    echo "Waiting 20 seconds for Vespa to initialize..."
    sleep 20
    echo "✅ Vespa is ready!"
else
    echo "❌ Failed to start Vespa container"
    exit 1
fi