# Using Existing Vespa Application

This guide explains how to use a pre-existing Vespa application package instead of generating a new one.

## Overview

By default, nyrag generates a new Vespa application package for each project based on your configuration. However, you can now specify a pre-existing Vespa application to use instead.

## Configuration

To use an existing Vespa application, add the `vespa_app_path` parameter to your configuration file:

```yaml
name: my-project
mode: docs  # or web
start_loc: /path/to/documents
vespa_app_path: /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint/vespa_app
```

## Benefits

1. **Consistency**: Use the same Vespa application configuration across multiple projects
2. **Advanced Features**: Leverage pre-configured rank profiles, query profiles, and models
3. **Control**: Maintain full control over your Vespa application schema and configuration
4. **Speed**: Skip schema generation step during project initialization

## Example Configurations

### Web Crawling Example

```yaml
name: webrag
mode: web
start_loc: https://example.com/
vespa_app_path: /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint/vespa_app
deploy_mode: local

crawl_params:
  respect_robots_txt: true
  follow_subdomains: true
```

### Document Processing Example

```yaml
name: doc-project
mode: docs
start_loc: /path/to/documents
vespa_app_path: /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint/vespa_app
deploy_mode: local

doc_params:
  recursive: true
  file_extensions:
    - .pdf
    - .docx
    - .txt
    - .md
```

## Pre-built Vespa Application

The included `vespa_app` directory at `/media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint/vespa_app` contains:

- **Schema**: Document schema with chunking and embedding support (`schemas/doc.sd`)
- **Rank Profiles**: Multiple ranking strategies including:
  - `base-features`: Basic feature extraction
  - `learned-linear`: Linear ranking model
  - `second-with-gbdt`: LightGBM-based ranking
- **Query Profiles**: Pre-configured profiles for hybrid search, RAG, and deep research
- **Models**: Pre-trained LightGBM model for ranking
- **Services**: Configured embedder (nomic-ai-modernbert-embed-base) and OpenAI LLM integration

## Schema Compatibility

The existing Vespa app uses a schema named "doc" with the following fields:

- `id`: Document identifier
- `title`: Document title
- `text`: Full text content
- `created_timestamp`, `modified_timestamp`, `last_opened_timestamp`: Timestamps
- `open_count`: Number of times opened
- `favorite`: Favorite flag
- `title_embedding`: Embedded title (auto-generated)
- `chunks`: Text chunks (auto-generated from text)
- `chunk_embeddings`: Embedded chunks (auto-generated)

When feeding documents, you only need to provide:
- `title` (optional)
- `text` (required)
- Metadata fields (optional)

The system automatically handles chunking and embedding.

## How It Works

When `vespa_app_path` is set:

1. The system skips schema generation
2. Loads the existing Vespa application from the specified path
3. Deploys the existing application to your target (local Docker or Vespa Cloud)
4. Feeds documents using the existing schema

All other features (crawling, document processing, feeding, querying) work exactly the same.

## Notes

- The `vespa_app_path` must point to a valid Vespa application package directory
- The directory must contain `services.xml` and `schemas/` subdirectory
- The schema name in your existing app should match the document type being fed
- You can still override deployment settings like `deploy_mode`, `cloud_tenant`, etc.
