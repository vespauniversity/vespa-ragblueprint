# Changes Summary: Support for Existing Vespa Application

## Overview

Modified the ragblueprint project to support using a pre-existing Vespa application instead of generating a new one on every run. All features remain the same, but users can now optionally specify an existing `vespa_app` directory to use.

## Files Modified

### 1. `src/nyrag/config.py`
- Added `vespa_app_path: Optional[str]` field to the `Config` class
- Updated `get_app_path()` method to return the custom path when `vespa_app_path` is set
- Added `use_existing_vespa_app()` method to check if using pre-existing app
- Updated docstrings to document the new feature

### 2. `src/nyrag/process.py`
- Modified `_create_schema()` function to:
  - Check if `config.use_existing_vespa_app()` is True
  - Skip schema generation and load existing app when vespa_app_path is set
  - Validate that the path exists and is a directory
  - Continue with normal schema generation when vespa_app_path is not set

### 3. `src/nyrag/feed.py`
- Updated `_connect_vespa()` method to support redeploy with existing app
- Added logic to use existing vespa_app_path during redeployment
- Maintains backward compatibility with generated schemas

### 4. Example Configuration Files
- Updated `doc_example.yml` to include `vespa_app_path` pointing to the existing app
- Updated `web_example.yml` to include `vespa_app_path` pointing to the existing app

### 5. Documentation
- Created `VESPA_APP_USAGE.md` with detailed usage instructions
- Updated `README-original.md` to include section on using existing Vespa apps
- Added `vespa_app_path` to the configuration reference table

### 6. Tests
- Updated `src/nyrag/tests/test_config.py` to add tests for:
  - `test_get_app_path_with_existing_vespa_app()` - verifies custom path is used
  - `test_use_existing_vespa_app()` - verifies the detection logic

## Usage

To use an existing Vespa application, simply add `vespa_app_path` to your configuration:

```yaml
name: my-project
mode: docs
start_loc: /path/to/documents
vespa_app_path: /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint/vespa_app
```

## Backward Compatibility

All changes are backward compatible:
- If `vespa_app_path` is not specified, the system works exactly as before
- Existing configurations continue to work without any modifications
- All other features (crawling, feeding, querying) remain unchanged

## Benefits

1. **Reusability**: Share the same Vespa schema across multiple projects
2. **Advanced Features**: Use pre-configured rank profiles, models, and query profiles
3. **No Regeneration**: Skip schema generation step, saving time during project setup
4. **Control**: Maintain full control over Vespa application configuration

## Testing

To test the changes:

```bash
# Run the existing test suite
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
pytest src/nyrag/tests/test_config.py -v

# Test with a real configuration
nyrag process --config doc_example.yml
```

## Notes

- The existing vespa_app at `/media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint/vespa_app` contains a complete Vespa application with:
  - Document schema with chunking and embedding support
  - Multiple rank profiles (linear, GBDT)
  - Query profiles (hybrid, RAG, deep research)
  - Pre-trained LightGBM model
  - Configured embedder (nomic-ai-modernbert-embed-base)
  - OpenAI LLM integration
