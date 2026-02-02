# Fix: Force CPU Mode for Embeddings

## Problem

Even when specifying `device: cpu` in the config, PyTorch/transformers was trying to use CUDA:

```
torch.AcceleratorError: CUDA error: no kernel image is available for execution on the device
```

This happened because the `SentenceTransformer` model in the API was being loaded **without** specifying the device parameter, causing it to auto-detect and use CUDA when available.

## Solution

Updated the code to properly respect the `device` setting from configuration:

### 1. Added `device` to RAGParams (`config.py`)

```python
class RAGParams(BaseModel):
    embedding_model: str = DEFAULT_EMBEDDING_MODEL
    embedding_dim: int = DEFAULT_EMBEDDING_DIM
    chunk_size: int = DEFAULT_CHUNK_SIZE
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
    max_tokens: Optional[int] = None
    device: str = "cpu"  # NEW: Device for embedding model
```

### 2. Added method to get device (`config.py`)

```python
def get_embedding_device(self) -> str:
    """Get embedding device from rag_params."""
    if self.rag_params is None:
        return "cpu"
    return self.rag_params.device
```

### 3. Updated API to use device setting (`api.py`)

**Model loading:**
```python
model = SentenceTransformer(
    settings["embedding_model"],
    device=settings.get("embedding_device", "cpu")  # Force CPU if not specified
)
```

**Settings from config:**
```python
def _load_settings_from_config(cfg: Config) -> Dict[str, Any]:
    return {
        ...
        "embedding_device": cfg.get_embedding_device(),  # Get from config
        ...
    }
```

**Default settings:**
```python
def _get_default_settings() -> Dict[str, Any]:
    device = os.getenv("EMBEDDING_DEVICE", "cpu")  # Default to CPU
    return {
        ...
        "embedding_device": device,
        ...
    }
```

## Usage

### Option 1: Config File (Recommended)

Set the device in your `doc_example.yml`:

```yaml
rag_params:
  embedding_model: sentence-transformers/all-mpnet-base-v2
  embedding_dim: 768
  chunk_size: 512
  chunk_overlap: 50
  device: cpu  # Force CPU mode
```

### Option 2: Environment Variable

```bash
export EMBEDDING_DEVICE=cpu
nyrag process --config doc_example.yml
```

### Option 3: Hide CUDA from PyTorch

```bash
# Force PyTorch to not see any CUDA devices
CUDA_VISIBLE_DEVICES="" nyrag process --config doc_example.yml
```

## Default Behavior

- **Default device: `cpu`** - Safer and works on all systems
- **GPU mode**: Set `device: cuda` to use GPU (requires compatible CUDA installation)
- **Auto-detection disabled**: Device must be explicitly specified

## Testing

After the fix, running with `device: cpu` should work without CUDA errors:

```bash
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
nyrag process --config doc_example.yml
```

You should see:
- ✅ No CUDA errors
- ✅ Model loads on CPU
- ✅ Processing continues successfully

## GPU Mode (Optional)

If you have a compatible CUDA installation and want to use GPU:

```yaml
rag_params:
  device: cuda
```

Or:
```bash
export EMBEDDING_DEVICE=cuda
```

## Files Modified

1. `src/nyrag/config.py`:
   - Added `device: str = "cpu"` to `RAGParams`
   - Added `get_embedding_device()` method to `Config`

2. `src/nyrag/api.py`:
   - Updated `SentenceTransformer` initialization to use device parameter
   - Added `embedding_device` to `_get_default_settings()`
   - Added `embedding_device` to `_load_settings_from_config()`

## Related Issues

This fix resolves:
- ✅ CUDA errors when `device: cpu` is specified
- ✅ Auto-detection causing GPU usage on CPU-only configs
- ✅ Incompatible CUDA version errors
- ✅ "no kernel image available" errors
