# Running NyRAG with ragblueprint

This directory contains scripts to run Vespa locally with the ragblueprint application.

## Prerequisites

- Docker installed and running
- Vespa CLI installed (`brew install vespa-cli` or see https://vespa.ai/downloads)
- Python virtual environment set up: `uv sync` or `pip install -e .`

## Scripts

### 1. `run_vespa.sh` - Start Vespa Docker Container

Starts a clean Vespa Docker container on localhost:8080 and localhost:19071.

```bash
./run_vespa.sh
```

**What it does:**
- Checks for and handles port conflicts
- Removes existing Vespa containers
- Starts fresh Vespa container with proper memory limits
- Waits for Vespa to initialize

### 2. `run_nyrag.sh` - Start NyRAG UI with Existing Vespa

Runs NyRAG UI using the existing ragblueprint Vespa app WITHOUT deploying new schemas.

```bash
./run_nyrag.sh
```

**What it does:**
- Checks if Vespa is running
- Sets `NYRAG_VESPA_DEPLOY=0` to skip deployment
- Uses existing vespa_app from `./vespa_app/`
- Deploys ragblueprint app if not already deployed
- Starts NyRAG UI on http://localhost:8000

### 3. `start.sh` - Complete Setup (Vespa + NyRAG)

One-command setup that runs both scripts in sequence.

```bash
./start.sh
```

## Quick Start

```bash
cd ragblueprint

# Option 1: Run everything at once
./start.sh

# Option 2: Run separately (useful for debugging)
./run_vespa.sh        # Start Vespa
./run_nyrag.sh        # Start NyRAG UI
```

## How It Works

### The Problem
By default, nyrag tries to:
1. Create a new Vespa schema for each project
2. Deploy a new Vespa container per project
3. This causes port conflicts (8080/19071 already in use)

### The Solution
The scripts use `NYRAG_VESPA_DEPLOY=0` environment variable which:
- Tells nyrag to skip creating new Vespa containers
- Reuses the existing Vespa at localhost:8080
- Uses the pre-configured ragblueprint `doc` schema
- Processes documents and feeds them to the existing schema

## Environment Variables

Set in `.env`:
- `NYRAG_VESPA_DEPLOY=0` - Skip deployment, use existing Vespa
- `NYRAG_LOCAL=1` - Use local mode
- `VESPA_URL=http://localhost` - Vespa endpoint
- `VESPA_PORT=8080` - Vespa port

## Troubleshooting

### Port already in use (Most Common Issue)

If you see "address already in use" or "bind: address already in use" errors, this is caused by zombie docker-proxy processes.

**Quick Fix:**
```bash
# Run the port fix script with sudo
sudo ./fix_ports.sh

# Then start Vespa
./run_vespa.sh
```

**Alternative Fixes:**
```bash
# Option 1: Kill specific processes
sudo kill -9 $(lsof -t -i:19071) $(lsof -t -i:8080)

# Option 2: Restart Docker
sudo systemctl restart docker
# or: sudo service docker restart

# Then run again
./run_vespa.sh
```

**Why This Happens:**
Docker creates proxy processes to forward ports from the host to containers. Sometimes these processes don't get cleaned up properly when containers crash or are force-removed. Since they're owned by root, regular users can't kill them without sudo.

### Vespa not responding
Check container status:
```bash
docker logs -f vespa
vespa status
```

### Schema conflicts
The scripts use the existing `doc` schema from vespa_app. If you need to modify it:
1. Edit files in `vespa_app/` directory
2. Run: `vespa deploy ./vespa_app`

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   NyRAG UI      │────▶│   Vespa Docker   │────▶│   ragblueprint   │
│  localhost:8000 │     │  localhost:8080  │     │    vespa_app     │
│                 │     │  localhost:19071 │     │     (doc)        │
└─────────────────┘     └──────────────────┘     └──────────────────┘
       │                                                │
       │                                                │
       ▼                                                ▼
┌─────────────────┐                            ┌──────────────────┐
│  Process docs   │                            │  Index/Search    │
│  (no new schema)│                            │   (doc schema)   │
└─────────────────┘                            └──────────────────┘
```

## Features

✅ No port conflicts - uses existing Vespa container
✅ No schema regeneration - uses ragblueprint `doc` schema
✅ Clean separation - Vespa and NyRAG run independently
✅ Easy restart - scripts handle cleanup automatically
✅ Production-like - uses same schema as production deployment

## Next Steps

After running `./start.sh`:
1. Open http://localhost:8000 in your browser
2. Create a new project configuration
3. Process documents (they'll be fed to the existing `doc` schema)
4. Start chatting with your data!

## Notes

- The `vespa_app` directory contains the ragblueprint application
- Documents are stored in the `doc` schema with fields: id, title, text, chunks, embeddings
- You can query directly via: `vespa query 'select * from doc'`
- The UI provides a user-friendly interface over this backend