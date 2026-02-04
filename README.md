# Vespa RAG Blueprint with NyRAG

Build a production-ready RAG (Retrieval-Augmented Generation) application in minutes using Vespa Cloud and NyRAG.

![NyRAG UI](img/nyrag_ui.png)

## What is This?

This repository contains a complete, working example of a RAG application that combines:

- **Vespa RAG Blueprint**: Pre-configured Vespa application with hybrid search (BM25 + vector search)
- **Modified NyRAG**: Document processing tool that handles chunking, embeddings, and chat UI
- **Ready-to-use scripts**: Quick start scripts for cloud deployments

**What you can do:**
- Configure everything via web UI (no manual YAML editing)
- Process PDFs, DOCX, websites, and other documents
- Search your data using hybrid search (semantic + keyword)
- Chat with your documents using LLM-powered answers
- Deploy to production with Vespa Cloud (billions of docs, thousands of queries/sec)
- Get instant validation when updating credentials (auto-test on blur)

## Quick Start (Cloud)

### Prerequisites

- [Vespa Cloud account](https://console.vespa-cloud.com/) (free trial available)
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

### 1. Deploy to Vespa Cloud

1. Go to [Vespa Cloud Console](https://console.vespa-cloud.com/)
2. Deploy the **RAG Blueprint** sample application
3. Save your **endpoint URL** and **token**

### 2. Install

```bash
git clone https://github.com/vespauniversity/vespa-ragblueprint
cd vespa-ragblueprint

# Install using uv (recommended)
uv sync
source .venv/bin/activate

# Or using pip
pip install -e .
```

### 3. Configure

Configuration is done through the NyRAG web UI (see step 5 below). You'll need:

- **Vespa Cloud endpoint**: From your Vespa Cloud deployment (e.g., `https://your-app.vespa-cloud.com`)
- **Vespa Cloud token**: Authentication token from Vespa Cloud Console
- **LLM API key**: From your chosen provider (OpenRouter, OpenAI, Groq, or Ollama)

**Example configuration structure** (configured in the UI):

```yaml
name: doc
mode: docs
deploy_mode: cloud
start_loc: /path/to/your/documents/

vespa_app_path: ./vespa_cloud

vespa_cloud:
  endpoint: https://your-app.vespa-cloud.com
  token: vespa_cloud_YOUR_TOKEN_HERE

doc_params:
  recursive: true
  file_extensions:
    - .pdf
    - .docx
    - .txt
    - .md

llm_config:
  base_url: https://openrouter.ai/api/v1
  model: meta-llama/llama-3.2-3b-instruct:free
  api_key: your-api-key
```

### 4. Run

**Quick start (recommended):**
```bash
./run_nyrag.sh
```

This script automatically:
- Checks your Vespa Cloud connection
- Loads your token from `doc_example.yml`
- Sets up environment variables
- Starts NyRAG UI on http://localhost:8000

**Or manually:**
```bash
export VESPA_CLOUD_SECRET_TOKEN='your-token'
nyrag ui --cloud
```

### 5. Process Documents & Chat

1. Open http://localhost:8000
2. Select your project from the dropdown (e.g., "doc_example")
3. Click the three-dot menu (⋮) → **"Edit Config"** to configure your credentials
4. Update your Vespa Cloud endpoint, token, cloud_tenant, and LLM API key
5. **Tab out of fields** → Auto-saves and tests connections (watch for ✓ or ✗ in header/terminal)
6. Click **"Start Indexing"** to process your documents
7. Monitor processing progress in the terminal output panel
8. Start chatting with your data!

**Pro tip**: Credentials are auto-validated when you tab out of fields, giving instant feedback on whether your connection works.

## How to Get Free LLM API Keys

### Option 1: OpenRouter
- Sign up at [openrouter.ai](https://openrouter.ai/)
- 100+ models available
- Use model: `meta-llama/llama-3.2-3b-instruct:free`

### Option 2: OpenAI
- Sign up at [platform.openai.com](https://platform.openai.com/)
- Use model: `gpt-4o-mini`

### Option 3: Groq
- Sign up at [console.groq.com](https://console.groq.com/)
- Use model: `llama-3.3-70b-versatile`

### Option 4: Ollama (100% Free - Local)
- Download from [ollama.com](https://ollama.com/)
- Runs locally, no API key needed
- Setup:
  ```bash
  ollama pull llama3.2
  ollama serve
  ```
- Config:
  ```yaml
  llm_config:
    base_url: http://localhost:11434/v1
    model: llama3.2
    api_key: dummy
  ```

## Project Structure

```
vespa-ragblueprint/
├── vespa_cloud/          # Vespa Cloud application package
│   ├── services.xml      # Vespa services configuration
│   ├── schemas/          # Document schema (doc.sd) and rank profiles
│   ├── models/           # Models files
│   └── search/           # Query profiles
├── config/               # Vespa Cloud application package
│   ├── doc_example.yml   # Example configuration file
│   └── web_example.yml   # Example config for website crawling
├── src/nyrag/            # NyRAG source code
├── dataset/              # Example documents (PDFs, DOCX)
├── run_nyrag.sh          # Quick start NyRAG
├── stop_nyrag.sh         # Stop NyRAG
├── process_docs.sh       # Process document files
└── README.md             # This file
```

## How It Works

### Architecture

```
Documents (PDFs, websites, etc.)
    ↓
NyRAG (processing)
    ├─ Chunking (1024 chars)
    ├─ Embedding generation (sentence-transformers)
    └─ Feed to Vespa
        ↓
Vespa (storage & search)
    ├─ Hybrid search (BM25 + vector)
    ├─ Binary quantization (10x smaller)
    └─ Scalable (billions of docs)
        ↓
NyRAG (answer generation)
    ├─ Multi-query retrieval
    ├─ Chunk fusion
    └─ LLM answer generation
        ↓
User (chat interface)
```

### Key Features

**Hybrid Search:**
- **BM25**: Exact keyword matching for precision
- **Vector Search**: Semantic similarity for recall
- **Combined**: Best of both worlds

**Binary Quantization:**
- Reduces embeddings from 768 floats to 96 int8 values
- 10x storage reduction
- Minimal quality loss
- Uses Hamming distance for fast search

**Multi-Query RAG:**
- Generates multiple search queries from user question
- Retrieves chunks from each query
- Ranks and deduplicates results
- LLM generates answer from top chunks

## Configuration Options

Configure these settings in the NyRAG web UI using the **"Edit Config"** button (three-dot menu → Edit Config).

### Document Mode

Process local files by setting `mode: docs`:

```yaml
name: doc
mode: docs
start_loc: /path/to/documents/
doc_params:
  recursive: true
  include_hidden: false
  follow_symlinks: false
  max_file_size_mb: 100
  file_extensions:
    - .pdf
    - .docx
    - .txt
    - .md
    - .html
```

### Web Crawling Mode

Crawl websites by setting `mode: web`:

```yaml
name: web
mode: web
start_loc: https://example.com/
crawl_params:
  respect_robots_txt: true
  aggressive_crawl: false
  follow_subdomains: true
  strict_mode: false
  allowed_domains:
    - example.com
    - docs.example.com
```

## Querying Your Data

### Via NyRAG UI

Use the web interface at http://localhost:8000 - it's the easiest way!

### Via Python

```python
from vespa.application import Vespa

# Connect to Vespa Cloud
app = Vespa(
    url="https://your-app.vespa-cloud.com",
    vespa_cloud_secret_token="your-token"
)

# Hybrid search
response = app.query(
    yql="select * from doc where userQuery()",
    query="What is RAG?",
    hits=5
)

for hit in response.hits:
    print(f"Title: {hit['fields']['title']}")
    print(f"Chunks: {hit['fields']['chunks'][:2]}")
```

### Via Vespa CLI (Optional - Advanced)

For direct querying without the UI:

```bash
# Install Vespa CLI (if not already installed)
brew install vespa-cli  # macOS
# Or download from: https://github.com/vespa-engine/vespa/releases

# Configure Vespa CLI
vespa config set target cloud
vespa config set application your-tenant.your-app.your-instance
vespa auth login

# Query
vespa query 'query=What is RAG?'
```

**Note:** The NyRAG UI is the recommended way to query your data, as it includes LLM-powered answer generation. Use the CLI for debugging, testing, or automation.

## Ranking Profiles

The RAG Blueprint includes 6 pre-configured ranking profiles that control how Vespa ranks search results. You can select different profiles from the Settings modal (⚙️ icon) in the NyRAG UI.

**Available Profiles:**

| Profile | Speed | Quality | Use Case |
|---------|-------|---------|----------|
| **base-features** | ⚡⚡⚡ Fast | Good | Default for everyday queries |
| **learned-linear** | ⚡⚡ Medium | Better | Linear model with learned coefficients |
| **second-with-gbdt** | ⚡ Slower | Best | LightGBM gradient boosting for production |
| **match-only** | ⚡⚡⚡ Fastest | None | Testing/debugging retrieval only |
| **collect-training-data** | ⚡⚡ Medium | N/A | Collecting features for training |
| **collect-second-phase** | ⚡ Slower | N/A | Collecting second-phase features |

**How They Work:**

- **base-features**: Simple linear combination of BM25 text scores and vector similarity
- **learned-linear**: Logistic regression model trained on relevance judgments (see `eval/` folder)
- **second-with-gbdt**: Two-phase ranking - linear first-phase + LightGBM second-phase for top results
- **match-only**: Returns documents in match order without ranking computation

**Changing Profiles:**

1. Open NyRAG UI at http://localhost:8000
2. Click Settings (⚙️) in top right
3. Select desired ranking profile from dropdown
4. Click "Save"
5. Future queries use the new profile

**Pro Tip:** The `second-with-gbdt` profile can significantly improve result quality for complex queries, but adds latency. Use `base-features` for speed, `second-with-gbdt` for quality.

## Advanced: The Schema

The RAG Blueprint uses this schema (`vespa_cloud/schemas/doc.sd`):

```java
schema doc {
    document doc {
        field id type string { ... }
        field title type string {
            indexing: index | summary
            index: enable-bm25
        }
        field text type string { }
    }

    # Binary quantized title embeddings
    field title_embedding type tensor<int8>(x[96]) {
        indexing: input title | embed | pack_bits | attribute | index
        attribute { distance-metric: hamming }
    }

    # Text chunks (1024 chars each)
    field chunks type array<string> {
        indexing: input text | chunk fixed-length 1024 | summary | index
        index: enable-bm25
    }

    # Binary quantized chunk embeddings
    field chunk_embeddings type tensor<int8>(chunk{}, x[96]) {
        indexing: input text | chunk fixed-length 1024 | embed | pack_bits | attribute | index
        attribute { distance-metric: hamming }
    }
}
```

**Key Points:**
- Embeddings are binary quantized (768 → 96 dimensions)
- Chunking happens automatically in Vespa
- Both BM25 and vector search enabled
- Hamming distance for fast binary vector search

## Key Features

### UI-Based Configuration
- Configure Vespa and LLM credentials directly in the web UI
- No manual YAML file editing required
- Interactive config editor with validation

### Auto-Validation
- **Real-time connection testing**: Edit credentials → Tab out → Instant validation
- **Vespa connection**: Header shows `✓ Connected: X docs` or `✗ Error`
- **LLM connection**: Terminal shows `✓ LLM connected: model-name` or error details
- Auto-saves config and tests connections automatically

### Powerful Search
- **Hybrid Search**: Combines BM25 (keyword) + vector (semantic) search
- **Binary Quantization**: 10x storage reduction with minimal quality loss
- **Multi-Query RAG**: Generates multiple search queries for better recall

### Configurable Ranking Profiles
- **6 ranking profiles**: Choose from fast (`base-features`) to best quality (`second-with-gbdt`)
- **Learned models**: Linear regression and LightGBM gradient boosting for advanced ranking
- **Easy switching**: Select ranking profile from settings modal - no redeployment needed
- **Quality vs speed**: Trade off latency for result quality based on your needs

## Scripts

### `run_nyrag.sh`

Quick start for Vespa Cloud:
- Sets up environment variables
- Starts NyRAG UI on http://localhost:8000
- Auto-opens browser

### `process_docs.sh`

Batch process documents without UI:
- Reads config from project settings
- Processes all documents
- Feeds to Vespa Cloud

## Troubleshooting

### Vespa Connection Issues

**"✗ Cannot connect to Vespa" or "Connection error"**

Common causes:
- **Invalid endpoint**: Use token endpoint format `https://[app-id].vespa-app.cloud`
- **Invalid token**: Format should be `vespa_cloud_...` (check for spaces/line breaks)
- **Missing cloud_tenant**: Set your Vespa Cloud tenant name in config
- **App not deployed**: Verify deployment is complete in Vespa Cloud Console

**Test connection**: Edit credentials in UI, tab out, watch header for `✓ Connected` or `✗ Error`

### LLM Connection Issues

**"✗ LLM error: Invalid API key"**

- Check API key format: OpenRouter (`sk-or-v1-...`), OpenAI (`sk-...`)
- Verify key is active in provider dashboard
- Make sure key is copied completely

**"✗ LLM error: Model not found"**

- Verify model name spelling (case-sensitive!)
- OpenRouter: `meta-llama/llama-3.2-3b-instruct:free`
- OpenAI: `gpt-4o-mini`

**Test connection**: Edit LLM credentials, tab out, watch terminal for `✓ LLM connected`

### Configuration Issues

**Config not loading or YAML errors**

```bash
# Check file exists
ls output/doc_example/conf.yml

# Verify permissions
chmod 644 output/*/conf.yml

# Restart NyRAG
./stop_nyrag.sh && ./run_nyrag.sh
```

**YAML syntax**: Use 2 spaces for indentation, `key: value` format (space after colon)

### Document Processing Issues

**No documents indexed after feeding**

- Check `start_loc` path is correct: `ls /your/path`
- Verify file extensions match config (default: `.pdf`, `.docx`, `.txt`, `.md`)
- Check file permissions: `chmod -R 644 /path/to/documents`
- Review terminal logs for processing errors

### Installation Issues

**"Command not found: uv" or "nyrag"**

```bash
# Install uv (if missing)
brew install uv  # macOS
# or: curl -LsSf https://astral.sh/uv/install.sh | sh

# Activate virtual environment
source .venv/bin/activate

# Reinstall nyrag
uv pip install -e .
```

### Port Issues

**"Port 8000 already in use"**

```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
nyrag ui --port 8080
```

### Getting More Help

- **Full troubleshooting guide**: See [blog/README.md](blog/README.md#troubleshooting)
- **Debug logging**: `export NYRAG_LOG_LEVEL=DEBUG`
- **Community**: Join [Vespa Slack](http://slack.vespa.ai/)
- **Issues**: [GitHub Issues](https://github.com/vespauniversity/vespa-ragblueprint/issues)

## Learn More

**Tutorials:**
- [Step-by-step blog post](blog/README.md) - Complete beginner tutorial
- [Vespa RAG Blueprint Tutorial](https://docs.vespa.ai/en/tutorials/rag-blueprint.html) - Official docs

**Resources:**
- [Vespa Documentation](https://docs.vespa.ai/)
- [Vespa Cloud Console](https://console.vespa-cloud.com/)
- [Original NyRAG Repository](https://github.com/vespaai-playground/NyRAG)
- [Vespa Slack](http://slack.vespa.ai/) - Get help

## Contributing

This is a reference implementation for educational purposes. Feel free to fork and modify for your use case!

## License

See [LICENSE](LICENSE) file.

## Credits

- **Vespa**: Scalable search engine by [vespa.ai](https://vespa.ai/)
- **NyRAG**: Document processing tool by [Abhishek Thakur](https://github.com/abhishekkrthakur)
- **RAG Blueprint**: Based on Vespa's official RAG Blueprint sample app

---

**Questions?** Join the [Vespa Slack](http://slack.vespa.ai/) or open an issue!
