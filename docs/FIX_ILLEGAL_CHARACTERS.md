# Fix: Illegal Characters in Vespa Feed

## Problem

When feeding documents to Vespa, especially from PDF extraction, you may encounter this error:

```
Could not parse field 'text' of type string: The string field value contains illegal code
```

This happens because:
1. **PDF extraction** can produce invalid UTF-8 sequences or control characters
2. **Vespa string fields** don't accept certain control characters (null bytes, etc.)
3. **Document conversion** may introduce problematic Unicode characters

## Solution

Added a `sanitize_text()` function in `src/nyrag/feed.py` that cleans text before feeding to Vespa.

### What It Does

The sanitization function:

1. ✅ **Ensures valid UTF-8** - Encodes/decodes with error handling
2. ✅ **Removes null bytes** (`\x00`)
3. ✅ **Removes control characters** (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F)
4. ✅ **Preserves valid whitespace** - Keeps newlines (`\n`), tabs (`\t`), carriage returns (`\r`)
5. ✅ **Removes Unicode surrogates** (0xD800-0xDFFF)
6. ✅ **Removes private use area chars** (0xE000-0xF8FF)
7. ✅ **Preserves normal text** - Including UTF-8 characters, emoji, etc.

### Code Changes

**File: `src/nyrag/feed.py`**

Added `sanitize_text()` function:
```python
def sanitize_text(text: str) -> str:
    """Sanitize text to remove illegal characters for Vespa."""
    # Ensure valid UTF-8
    text = text.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore")

    # Remove null bytes and control characters
    text = text.replace("\x00", "")
    text = re.sub(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]", "", text)

    # Remove problematic Unicode ranges
    text = re.sub(r"[\uD800-\uDFFF]", "", text)
    text = re.sub(r"[\uE000-\uF8FF]", "", text)

    return text
```

Updated `_prepare_record()` to use sanitization:
```python
# Sanitize text to remove illegal characters
text = sanitize_text(text)

# Sanitize title as well
title = sanitize_text(record.get("title", ""))
```

### Testing

Added comprehensive tests in `src/nyrag/tests/test_feed.py`:

```python
class TestSanitizeText:
    def test_removes_null_bytes(self):
        text = "Text\x00with\x00nulls"
        assert sanitize_text(text) == "Textwithnulls"

    def test_removes_control_characters(self):
        text = "Text\x01with\x02control\x03chars"
        assert sanitize_text(text) == "Textwithcontrolchars"

    def test_preserves_newlines_tabs_cr(self):
        text = "Line 1\nLine 2\tTabbed\rCarriage return"
        assert sanitize_text(text) == text

    def test_utf8_handling(self):
        text = "Hello 世界 🌍 café"
        assert sanitize_text(text) == text
```

Run tests:
```bash
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
pytest src/nyrag/tests/test_feed.py::TestSanitizeText -v
```

## Usage

The sanitization is **automatic** - no changes needed to your code. When you feed documents:

```bash
nyrag process --config doc_example.yml
```

All text and titles are automatically sanitized before being sent to Vespa.

## Examples

### Before Sanitization
```
"Text with null\x00byte and control\x01chars"
```

### After Sanitization
```
"Text with nullbyte and controlchars"
```

### Preserved Characters
```
"Normal text\nWith newlines\tAnd tabs
世界 🌍 café"  # UTF-8, emoji preserved
```

## Benefits

1. ✅ **No more feed errors** - Illegal characters are removed automatically
2. ✅ **PDF compatibility** - Handles problematic PDF extractions
3. ✅ **UTF-8 safe** - Ensures all text is valid UTF-8
4. ✅ **Preserves formatting** - Keeps newlines, tabs for readability
5. ✅ **Transparent** - No changes needed to existing code

## Verification

To verify the fix is working, try feeding your documents again:

```bash
cd /media/albert/sda/Code/rag/vespa-blog-posts/ragblueprint
nyrag process --config doc_example.yml
```

You should now see successful feeds instead of the "illegal code" error.

## Related Files

- `src/nyrag/feed.py` - Sanitization implementation
- `src/nyrag/tests/test_feed.py` - Unit tests
- `FIX_ILLEGAL_CHARACTERS.md` - This documentation
