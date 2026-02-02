# Fix: Rank Profile and Query Parameters

## Problems Found

When querying Vespa, you encountered no results due to **two critical mismatches**:

### Problem 1: Invalid Rank Profile
```python
'ranking.profile': 'default'  # ❌ Doesn't exist in schema
```

### Problem 2: Wrong Embedding Parameter Name
```python
'input.query(embedding)': embedding  # ❌ Should be float_embedding
```

## Root Cause

### Issue 1: Non-existent Rank Profile

The code used `DEFAULT_RANKING = "default"` but the schema doesn't have a `default` rank profile.

**Available rank profiles** in `vespa_app/schemas/doc/`:
- `match-only`
- `base-features` ✅ (best default)
- `learned-linear`
- `collect-training-data`
- `collect-second-phase`
- `second-with-gbdt`

### Issue 2: Embedding Type Mismatch

The `base-features` rank profile expects **two** embedding inputs:

```
inputs {
    query(embedding) tensor<int8>(x[96])          # Packed int8 embedding
    query(float_embedding) tensor<float>(x[768])  # Full float embedding
}
```

But the code was:
- ❌ Generating a **float embedding** (768 dimensions)
- ❌ Passing it as `query(embedding)` (expects int8, 96 dimensions)
- ❌ Not passing `query(float_embedding)` at all

The rank profile functions use `query(float_embedding)`:
```python
function chunk_sim_scores() {
    expression: chunk_dot_prod() / (
        vector_norms(chunk_emb_vecs()) *
        vector_norms(query(float_embedding))  # Expects this!
    )
}
```

## Solutions

### Fix 1: Use Correct Rank Profile (Line 31)

**Before:**
```python
DEFAULT_RANKING = "default"  # ❌ Doesn't exist
```

**After:**
```python
DEFAULT_RANKING = "base-features"  # ✅ Exists in schema
```

### Fix 2: Pass Embedding as `float_embedding` (Line 690, 652)

**Before (`_fetch_chunks`):**
```python
embedding = model.encode(query, convert_to_numpy=True).tolist()
body = {
    ...
    "input.query(embedding)": embedding,  # ❌ Wrong parameter
}
```

**After:**
```python
float_embedding = model.encode(query, convert_to_numpy=True).tolist()
body = {
    ...
    "input.query(float_embedding)": float_embedding,  # ✅ Correct!
}
```

**Before (`search` endpoint):**
```python
embedding = model.encode(req.query, convert_to_numpy=True).tolist()
body = {
    ...
    "input.query(embedding)": embedding,  # ❌ Wrong parameter
}
```

**After:**
```python
float_embedding = model.encode(req.query, convert_to_numpy=True).tolist()
body = {
    ...
    "input.query(float_embedding)": float_embedding,  # ✅ Correct!
}
```

## Why This Matters

### The Rank Profile Workflow:

1. **Query arrives** with `query(float_embedding)` (768 floats)
2. **Documents have** `chunk_embeddings` (packed int8, 96 per chunk)
3. **Ranking functions**:
   - Unpack document embeddings to float (768 dimensions)
   - Compute dot product with query embedding
   - Normalize to get cosine similarity
   - Rank chunks by similarity

Without `query(float_embedding)`, the ranking functions fail and return no/wrong results.

## Available Rank Profiles

You can now use any of these profiles:

### 1. `base-features` (Default)
- **Purpose**: Baseline semantic + lexical ranking
- **Features**: Cosine similarity, BM25, chunk scoring
- **Use**: General search, development

### 2. `learned-linear`
- **Purpose**: Linear model with learned weights
- **Inherits**: `base-features`
- **Use**: Better ranking with trained coefficients

### 3. `second-with-gbdt`
- **Purpose**: Two-phase ranking with LightGBM
- **Features**: Advanced ranking with ML model
- **Use**: Production, best quality results

### 4. `match-only`
- **Purpose**: No ranking, just matching
- **Use**: Testing, debugging

## Testing

After these fixes, queries should return results:

```bash
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
nyrag ui
# Open http://localhost:8000 and search for "poc acronym meaning"
```

The query should now:
- ✅ Use valid rank profile: `base-features`
- ✅ Pass correct embedding: `query(float_embedding)`
- ✅ Return ranked results

## Expected Query Format

```python
{
    "yql": "select * from sources * where userInput(@query)",
    "query": "poc acronym meaning",
    "hits": 5,
    "summary": "top_3_chunks",
    "ranking.profile": "base-features",  # ✅ Valid
    "input.query(float_embedding)": [...768 floats...],  # ✅ Correct
    "input.query(k)": 3
}
```

## Files Modified

- `src/nyrag/api.py`:
  - Line 31: Changed `DEFAULT_RANKING` from `"default"` to `"base-features"`
  - Line 652-660: Fixed `/search` endpoint to use `float_embedding`
  - Line 689-697: Fixed `_fetch_chunks` to use `float_embedding`

## Related Fixes

This fix completes the integration with the existing vespa_app:
- ✅ `FIX_SCHEMA_MISMATCH.md` - Summary names
- ✅ `FIX_VESPA_QUERY_API.md` - Query parameters
- ✅ `FIX_RANK_PROFILE.md` - This fix (rank profile + embeddings)
- ✅ `FIX_CUDA_DEVICE.md` - Device selection
- ✅ `FIX_ILLEGAL_CHARACTERS.md` - Text sanitization
