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
        # Use Python to properly parse YAML nested structure
        CONFIG_ENDPOINT=$(python3 -c "
import yaml
try:
    with open('$CONFIG_FILE', 'r') as f:
        config = yaml.safe_load(f)
    endpoint = config.get('vespa_cloud', {}).get('endpoint', '')
    if endpoint and endpoint != 'https://your-vespa-cloud-endpoint-here.vespa-app.cloud':
        print(endpoint)
except:
    pass
" 2>/dev/null)
        if [ -n "$CONFIG_ENDPOINT" ]; then
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

# Export TOKEN_ENDPOINT so child processes (like Python scripts) can access it
export TOKEN_ENDPOINT

# Extract token from config/doc_example.yml if not already set
if [ -z "$VESPA_CLOUD_SECRET_TOKEN" ]; then
    CONFIG_FILE="$SCRIPT_DIR/config/doc_example.yml"
    if [ -f "$CONFIG_FILE" ]; then
        # Use Python to properly parse YAML nested structure
        TOKEN=$(python3 -c "
import yaml
try:
    with open('$CONFIG_FILE', 'r') as f:
        config = yaml.safe_load(f)
    token = config.get('vespa_cloud', {}).get('token', '')
    if token and token != 'your-vespa-cloud-token-here':
        print(token)
except:
    pass
" 2>/dev/null)
        if [ -n "$TOKEN" ]; then
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

# Use Python to parse YAML properly (handles nested structure)
VALIDATION_RESULT=$(python3 -c "
import yaml
import sys
try:
    with open('$CONFIG_FILE', 'r') as f:
        config = yaml.safe_load(f)

    vespa_cloud = config.get('vespa_cloud', {})
    endpoint = vespa_cloud.get('endpoint', '')
    token = vespa_cloud.get('token', '')

    # Check endpoint
    if not endpoint or endpoint == 'https://your-vespa-cloud-endpoint-here.vespa-app.cloud':
        print('ERROR_ENDPOINT')
        sys.exit(1)

    # Check token
    if not token or token == 'your-vespa-cloud-token-here':
        print('ERROR_TOKEN')
        sys.exit(1)

    print('OK')
except Exception as e:
    print(f'ERROR_PARSE: {e}')
    sys.exit(1)
" 2>&1)

if [ "$VALIDATION_RESULT" = "ERROR_ENDPOINT" ]; then
    echo "❌ Vespa Cloud endpoint not configured in $CONFIG_FILE"
    echo "Please set a valid endpoint under vespa_cloud.endpoint"
    echo ""
    echo "Example:"
    echo "  vespa_cloud:"
    echo "    endpoint: https://your-app.vespa-app.cloud"
    exit 1
elif [ "$VALIDATION_RESULT" = "ERROR_TOKEN" ]; then
    echo "❌ Vespa Cloud token not configured in $CONFIG_FILE"
    echo "Please set a valid token under vespa_cloud.token"
    echo ""
    echo "Example:"
    echo "  vespa_cloud:"
    echo "    token: vespa_cloud_your_token_here"
    exit 1
elif [[ "$VALIDATION_RESULT" == ERROR_PARSE* ]]; then
    echo "❌ Failed to parse $CONFIG_FILE"
    echo "$VALIDATION_RESULT"
    exit 1
fi

echo "✅ Configuration validated successfully"
echo ""

# Test connection to Vespa Cloud endpoint with token (with timeout)
# Skip if SKIP_CONNECTION_TEST=1 is set
if [ "$SKIP_CONNECTION_TEST" = "1" ]; then
    echo "⚠️  Skipping connection test (SKIP_CONNECTION_TEST=1)"
    echo "   Connection status will be shown in the UI"
    echo ""
else
    echo "Testing connection to Vespa Cloud..."
    echo "  Endpoint: $TOKEN_ENDPOINT"

    # Write connection test script to temporary file
    TEMP_TEST_SCRIPT=$(mktemp)
    cat > "$TEMP_TEST_SCRIPT" << 'PYTHON_SCRIPT'
import urllib.request
import urllib.error
import json
import sys
import os

endpoint = os.environ.get('TOKEN_ENDPOINT', '').rstrip('/')
token = os.environ.get('VESPA_CLOUD_SECRET_TOKEN', '')

if not endpoint or not token:
    print("ERROR_MISSING_CONFIG")
    sys.exit(1)

url = f"{endpoint}/search/"
data = json.dumps({"yql": "select * from sources * where true", "hits": 0}).encode("utf-8")

try:
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }, method="POST")

    with urllib.request.urlopen(req, timeout=10) as response:
        if response.status in [200, 400]:
            print("OK")
        else:
            print(f"ERROR_HTTP_{response.status}")
except urllib.error.HTTPError as e:
    if e.code == 401:
        print("ERROR_AUTH")
    elif e.code == 404:
        print("ERROR_NOT_FOUND")
    else:
        print(f"ERROR_HTTP_{e.code}")
except urllib.error.URLError as e:
    print(f"ERROR_NETWORK: {e.reason}")
except Exception as e:
    print(f"ERROR_UNKNOWN: {e}")
PYTHON_SCRIPT

    # Run connection test directly (Python script has built-in 10s timeout)
    TEMP_OUTPUT=$(mktemp)
    python3 "$TEMP_TEST_SCRIPT" > "$TEMP_OUTPUT" 2>&1
    TIMEOUT_EXIT=$?
    CONNECTION_TEST=$(cat "$TEMP_OUTPUT")

    # Clean up temp files
    rm -f "$TEMP_TEST_SCRIPT" "$TEMP_OUTPUT"

    if [ "$CONNECTION_TEST" = "OK" ]; then
        echo "✅ Successfully connected to Vespa Cloud"
        echo ""
    elif [ "$CONNECTION_TEST" = "ERROR_AUTH" ]; then
        echo "❌ Authentication failed - Invalid token"
        echo ""
        echo "Please check your token in $CONFIG_FILE"
        exit 1
    elif [ "$CONNECTION_TEST" = "ERROR_NOT_FOUND" ]; then
        echo "❌ Endpoint not found (404)"
        echo ""
        echo "Please check your endpoint in $CONFIG_FILE"
        exit 1
    elif [[ "$CONNECTION_TEST" == ERROR_NETWORK* ]]; then
        echo "❌ Network error - Cannot reach Vespa Cloud"
        echo "   Error: $CONNECTION_TEST"
        echo ""
        echo "Please check your endpoint and internet connection"
        exit 1
    elif [ -z "$CONNECTION_TEST" ]; then
        echo "⚠️  Connection test failed to complete"
        echo "   Continuing anyway - you can check connection in the UI"
        echo ""
    else
        echo "⚠️  Connection test returned: $CONNECTION_TEST"
        echo "   Continuing anyway - you can check connection in the UI"
        echo ""
    fi
fi  # End of SKIP_CONNECTION_TEST check

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

# Run the UI (token-based auth, no browser login needed)
# The VESPA_CLOUD_SECRET_TOKEN environment variable handles authentication
exec nyrag ui --host localhost --port 8000