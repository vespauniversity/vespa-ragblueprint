"""Tests for the feed module."""

from unittest.mock import Mock, patch

import pytest

from nyrag.config import Config, RAGParams
from nyrag.feed import VespaFeeder, sanitize_text


@pytest.fixture
def mock_config():
    """Create a mock configuration for testing."""
    config = Config(
        name="test_app",
        mode="web",
        start_loc="https://example.com",
        rag_params=RAGParams(
            embedding_model="sentence-transformers/all-MiniLM-L6-v2",
            chunk_size=512,
            chunk_overlap=50,
        ),
    )
    return config


class TestVespaFeeder:
    """Tests for VespaFeeder class."""

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_initialization(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test VespaFeeder initialization."""
        mock_model = Mock()
        mock_transformer.return_value = mock_model
        mock_app = Mock()
        mock_make_client.return_value = mock_app

        feeder = VespaFeeder(
            config=mock_config,
            redeploy=False,
            vespa_url="http://localhost",
            vespa_port=8080,
        )

        assert feeder.config == mock_config
        assert feeder.schema_name == "nyragtestapp"
        assert feeder.app_package_name == "nyragtestapp"
        assert feeder.embedding_model_name == "sentence-transformers/all-MiniLM-L6-v2"
        assert feeder.chunk_size == 512
        assert feeder.chunk_overlap == 50
        mock_transformer.assert_called_once_with("sentence-transformers/all-MiniLM-L6-v2")

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_default_parameters(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test VespaFeeder with default RAG parameters."""
        mock_config.rag_params = None
        mock_transformer.return_value = Mock()
        mock_make_client.return_value = Mock()

        feeder = VespaFeeder(config=mock_config, redeploy=False)

        # Should use defaults from schema params or constants
        assert feeder.embedding_model_name is not None
        assert feeder.chunk_size is not None

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_feed_success(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test successful feed operation."""
        import numpy as np

        mock_model = Mock()
        # Return 2 embeddings: 1 for content + 1 for the chunk
        mock_model.encode.return_value = np.array([[0.1] * 384, [0.2] * 384])  # content embedding  # chunk embedding
        mock_transformer.return_value = mock_model

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.is_successful.return_value = True

        mock_app = Mock()
        mock_app.feed_data_point.return_value = mock_response
        mock_make_client.return_value = mock_app

        feeder = VespaFeeder(config=mock_config, redeploy=False)

        record = {
            "content": "Test content for feeding",
            "loc": "https://example.com/page",
        }

        result = feeder.feed(record)
        assert result is True

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_feed_failure(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test failed feed operation."""
        import numpy as np

        mock_model = Mock()
        # Return 2 embeddings: 1 for content + 1 for the chunk
        mock_model.encode.return_value = np.array([[0.1] * 384, [0.2] * 384])  # content embedding  # chunk embedding
        mock_transformer.return_value = mock_model

        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.is_successful.return_value = False

        mock_app = Mock()
        mock_app.feed_data_point.return_value = mock_response
        mock_make_client.return_value = mock_app

        feeder = VespaFeeder(config=mock_config, redeploy=False)

        record = {"content": "Test content", "loc": "https://example.com"}

        result = feeder.feed(record)
        assert result is False

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_feed_with_minimal_record(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test feeding with minimal record data."""
        import numpy as np

        mock_model = Mock()
        # Return 2 embeddings: 1 for content + 1 for the chunk
        mock_model.encode.return_value = np.array([[0.1] * 384, [0.2] * 384])  # content embedding  # chunk embedding
        mock_transformer.return_value = mock_model

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.is_successful.return_value = True

        mock_app = Mock()
        mock_app.feed_data_point.return_value = mock_response
        mock_make_client.return_value = mock_app

        feeder = VespaFeeder(config=mock_config, redeploy=False)

        # Minimal record with just content
        record = {"content": "Test content"}

        result = feeder.feed(record)
        assert result is True

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_redeploy_flag(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test that redeploy flag triggers deployment."""
        mock_transformer.return_value = Mock()
        mock_make_client.return_value = Mock()

        _ = VespaFeeder(config=mock_config, redeploy=True)

        # deploy_app_package should be called when redeploy=True
        mock_deploy.assert_called()

    @patch("nyrag.feed.SentenceTransformer")
    @patch("nyrag.feed.deploy_app_package")
    @patch("nyrag.feed.make_vespa_client")
    def test_custom_vespa_url_and_port(self, mock_make_client, mock_deploy, mock_transformer, mock_config):
        """Test initialization with custom Vespa URL and port."""
        mock_transformer.return_value = Mock()
        mock_make_client.return_value = Mock()

        custom_url = "https://my-vespa.example.com"
        custom_port = 9090

        feeder = VespaFeeder(
            config=mock_config,
            redeploy=False,
            vespa_url=custom_url,
            vespa_port=custom_port,
        )

        assert feeder is not None


class TestSanitizeText:
    """Tests for sanitize_text function."""

    def test_normal_text(self):
        """Test that normal text is unchanged."""
        text = "This is normal text with spaces and punctuation!"
        assert sanitize_text(text) == text

    def test_preserves_newlines_tabs_cr(self):
        """Test that newlines, tabs, and carriage returns are preserved."""
        text = "Line 1\nLine 2\tTabbed\rCarriage return"
        assert sanitize_text(text) == text

    def test_removes_null_bytes(self):
        """Test that null bytes are removed."""
        text = "Text\x00with\x00nulls"
        expected = "Textwithnulls"
        assert sanitize_text(text) == expected

    def test_removes_control_characters(self):
        """Test that control characters are removed."""
        text = "Text\x01with\x02control\x03chars"
        expected = "Textwithcontrolchars"
        assert sanitize_text(text) == expected

    def test_mixed_valid_and_invalid(self):
        """Test text with mix of valid and invalid characters."""
        text = "Valid\ntext\x00with\x01bad\tchars"
        expected = "Valid\ntextwithbad\tchars"
        assert sanitize_text(text) == expected

    def test_empty_string(self):
        """Test that empty string returns empty string."""
        assert sanitize_text("") == ""

    def test_none_returns_empty(self):
        """Test that None returns empty string."""
        assert sanitize_text(None) == ""

    def test_only_invalid_chars(self):
        """Test string with only invalid characters."""
        text = "\x00\x01\x02\x03"
        assert sanitize_text(text) == ""

    def test_utf8_handling(self):
        """Test that valid UTF-8 characters are preserved."""
        text = "Hello 世界 🌍 café"
        assert sanitize_text(text) == text

    def test_removes_delete_character(self):
        """Test that DEL character (0x7F) is removed."""
        text = "Text\x7Fwith\x7Fdelete"
        expected = "Textwithdelete"
        assert sanitize_text(text) == expected
