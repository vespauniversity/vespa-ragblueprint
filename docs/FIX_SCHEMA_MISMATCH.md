# Fix: Schema and Code Mismatch

## Problem

When querying Vespa, you encountered this error:

```
vespa.exceptions.VespaError: [{'code': 17, 'summary': 'Bad request.', 'message':
'Invalid request [/search/?schema=doc]: invalid presentation.summary=top_k_chunks'}]
```

## Root Cause

The code was using summary and field names that **don't match** the schema definition:

### Mismatches Found:

1. **Summary name**: Code used `top_k_chunks`, but schema defines `top_3_chunks`
2. **Field name**: Code looked for `chunks_topk`, but schema uses `chunks_top3`

## Solution

Updated `api.py` to match the existing vespa_app schema:

### Fix 1: Summary Name (Line 32)

**Before:**
```python
DEFAULT_SUMMARY = "top_k_chunks"  # ❌ Doesn't exist in schema
```

**After:**
```python
DEFAULT_SUMMARY = "top_3_chunks"  # ✅ Matches schema definition
```

### Fix 2: Field Name (Line 711)

**Before:**
```python
chunk_texts = fields.get("chunks_topk") or []  # ❌ Wrong field name
```

**After:**
```python
chunk_texts = fields.get("chunks_top3") or []  # ✅ Matches schema
```

### Fix 3: Documentation (Line 127)

**Before:**
```python
summary: Optional[str] = Field(None, description="Document summary to request (defaults to top_k_chunks)")
```

**After:**
```python
summary: Optional[str] = Field(None, description="Document summary to request (defaults to top_3_chunks)")
```

## Schema Reference

The existing `vespa_app/schemas/doc.sd` defines these summaries:

### 1. `no-chunks` Summary
```
document-summary no-chunks {
    summary id {}
    summary title {}
    summary created_timestamp {}
    summary modified_timestamp {}
    summary last_opened_timestamp {}
    summary open_count {}
    summary favorite {}
    summary chunks {}
}
```

### 2. `top_3_chunks` Summary
```
document-summary top_3_chunks {
    from-disk
    summary chunks_top3 {
        source: chunks
        select-elements-by: top_3_chunk_sim_scores
    }
}
```

**Key details:**
- Summary name: `top_3_chunks`
- Field name: `chunks_top3`
- Selects top 3 chunks by similarity score

## Why These Names?

The schema uses `top_3_chunks` and `chunks_top3` because:
- It selects the **top 3** most relevant chunks
- Uses `top_3_chunk_sim_scores` from the rank profile
- Optimized for RAG (retrieval augmented generation) use cases

## Testing

After these fixes, queries should work correctly:

```bash
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
nyrag process --config doc_example.yml
```

Or via the UI:
```bash
nyrag ui
# Open http://localhost:8000
```

Query example:
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test query",
    "hits": 10,
    "summary": "top_3_chunks"
  }'
```

## Available Summaries

You can now use either summary in your queries:

1. **`no-chunks`**: Returns document metadata without chunks
   - Lighter, faster
   - Good for listing/browsing

2. **`top_3_chunks`**: Returns top 3 most relevant chunks
   - Heavier, more detailed
   - Good for RAG/question answering
   - **Default** for search queries

## Files Modified

- `src/nyrag/api.py`:
  - Line 32: Changed `DEFAULT_SUMMARY` from `"top_k_chunks"` to `"top_3_chunks"`
  - Line 127: Updated description
  - Line 711: Changed field name from `chunks_topk` to `chunks_top3`

## Related Fixes

This fix works together with:
- `FIX_VESPA_QUERY_API.md` - Removed invalid `presentation.summaryFeatures`
- `FIX_CUDA_DEVICE.md` - Fixed device selection for embeddings
- `FIX_ILLEGAL_CHARACTERS.md` - Added text sanitization
