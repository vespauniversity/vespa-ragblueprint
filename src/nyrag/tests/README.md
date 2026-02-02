# Test Configuration

This directory contains the test suite for nyrag.

## Running Tests

### Run all tests
```bash
pytest
```

### Run specific test file
```bash
pytest src/nyrag/tests/test_config.py
```

### Run with coverage
```bash
pytest --cov=src/nyrag --cov-report=html
```

### Run specific test class or function
```bash
pytest src/nyrag/tests/test_config.py::TestConfig::test_web_mode_config
```

### Run tests matching a pattern
```bash
pytest -k "test_config"
```

## Test Structure

- `test_config.py` - Tests for configuration parsing and validation
- `test_utils.py` - Tests for utility functions
- `test_schema.py` - Tests for Vespa schema generation
- `test_feed.py` - Tests for data feeding functionality
- `test_crawly.py` - Tests for web crawling utilities

## Writing Tests

Tests use pytest and follow these conventions:
- Test files are named `test_*.py`
- Test classes are named `Test*`
- Test functions are named `test_*`
- Use fixtures for common setup
- Use mocks for external dependencies

## Markers

- `@pytest.mark.slow` - For slow-running tests
- `@pytest.mark.integration` - For integration tests
- `@pytest.mark.unit` - For unit tests
