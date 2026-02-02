# Fix: Vespa Query API Error

## Problem

When querying Vespa, you encountered this error:

```
vespa.exceptions.VespaError: [{'code': 3, 'summary': 'Illegal query', 'message':
"Could not set 'presentation.summaryFeatures': 'summaryFeatures' is not a valid property in 'presentation'.
See the query api for valid keys starting by 'presentation'."}]
```

## Root Cause

The code was using an **outdated Vespa query parameter**: `presentation.summaryFeatures: True`

This parameter format is from an older version of Vespa and is no longer valid in modern Vespa versions.

## Solution

**Removed the invalid parameter** from the query body in `api.py`.

### Before (Line 698):
```python
body = {
    "yql": "select * from sources * where userInput(@query)",
    "query": query,
    "hits": hits,
    "summary": DEFAULT_SUMMARY,
    "ranking.profile": DEFAULT_RANKING,
    "input.query(embedding)": embedding,
    "input.query(k)": k,
    "presentation.summaryFeatures": True,  # ❌ INVALID
}
```

### After:
```python
body = {
    "yql": "select * from sources * where userInput(@query)",
    "query": query,
    "hits": hits,
    "summary": DEFAULT_SUMMARY,
    "ranking.profile": DEFAULT_RANKING,
    "input.query(embedding)": embedding,
    "input.query(k)": k,
    # Note: summaryFeatures are defined in the rank profile, not in presentation
}
```

## Why This Works

Summary features are **already configured** in the rank profile (`schema.py`):

```python
schema.add_rank_profile(
    RankProfile(
        name="base-features",
        inputs=inputs,
        functions=functions,
        summary_features=[
            "top_3_chunk_sim_scores",  # ✅ Defined here
        ],
        ...
    )
)
```

When you specify `summary_features` in the rank profile definition, Vespa automatically includes them in the query response. You don't need to request them via `presentation.summaryFeatures`.

The code already handles extracting these features from the response (lines 718-721):

```python
summary_features = (
    hit.get("summaryfeatures")
    or hit.get("summaryFeatures")
    or fields.get("summaryfeatures")
    or {}
)
chunk_score_raw = summary_features.get("best_chunk_score", hit_score)
```

## Testing

After this fix, queries should work without the "Illegal query" error:

```bash
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
nyrag ui
# Open http://localhost:8000 and try a search query
```

Or via API:
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "hits": 10}'
```

## Modern Vespa Query API

For reference, valid query parameters include:

**Presentation:**
- `presentation.bolding`
- `presentation.format`
- `presentation.summary`
- `presentation.timing`

**Ranking:**
- `ranking.profile`
- `ranking.features`
- `ranking.properties`
- `ranking.matchPhase`

**Summary Features:**
- Defined in the **rank profile** (schema), not in the query
- Automatically included in response when configured
- Access via `hit.get("summaryfeatures")` in response

## Files Modified

- `src/nyrag/api.py` (line 698): Removed invalid `presentation.summaryFeatures` parameter

## Related Documentation

- [Vespa Query API Reference](https://docs.vespa.ai/en/reference/query-api-reference.html)
- [Vespa Ranking](https://docs.vespa.ai/en/ranking.html)
- [Summary Features](https://docs.vespa.ai/en/reference/schema-reference.html#summary-features)
