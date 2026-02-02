"""Tests for the crawly module."""

from nyrag.crawly.crawly import Crawly, WebsiteItem
from nyrag.crawly.user_agents import get_user_agent


class TestCrawly:
    """Tests for Crawly spider class."""

    def test_initialization_single_url(self):
        """Test Crawly initialization with a single URL."""
        spider = Crawly(start_urls="https://example.com")
        assert spider.start_urls == ["https://example.com"]
        assert len(spider.allowed_domains) > 0
        assert spider.name == "crawly"

    def test_initialization_multiple_urls(self):
        """Test Crawly initialization with multiple URLs."""
        urls = ["https://example.com", "https://test.com"]
        spider = Crawly(start_urls=urls)
        assert spider.start_urls == urls
        assert len(spider.allowed_domains) >= 1

    def test_custom_allowed_domains(self):
        """Test Crawly with custom allowed domains."""
        spider = Crawly(
            start_urls="https://example.com",
            allowed_domains=["example.com", "test.com"],
        )
        assert "example.com" in spider.allowed_domains
        assert "test.com" in spider.allowed_domains

    def test_exclude_urls(self):
        """Test Crawly with excluded URLs."""
        spider = Crawly(start_urls="https://example.com", exclude_urls=[r".*/admin/.*", r".*/login"])
        assert spider.exclude_urls == [r".*/admin/.*", r".*/login"]

    def test_respect_robots_txt_false(self):
        """Test Crawly with robots.txt disabled."""
        spider = Crawly(start_urls="https://example.com", respect_robots_txt=False)
        assert spider.custom_settings.get("ROBOTSTXT_OBEY") is False

    def test_aggressive_crawl_settings(self):
        """Test Crawly with aggressive crawl settings."""
        spider = Crawly(start_urls="https://example.com", aggressive_crawl=True)
        assert spider.custom_settings.get("CONCURRENT_REQUESTS") == 100
        assert spider.custom_settings.get("DOWNLOAD_DELAY") == 0.1

    def test_normal_crawl_settings(self):
        """Test Crawly with normal (non-aggressive) crawl settings."""
        spider = Crawly(start_urls="https://example.com", aggressive_crawl=False)
        assert spider.custom_settings.get("CONCURRENT_REQUESTS") == 8
        assert spider.custom_settings.get("DOWNLOAD_DELAY") == 2

    def test_custom_user_agent(self):
        """Test Crawly with custom user agent."""
        custom_ua = "MyBot/1.0"
        spider = Crawly(start_urls="https://example.com", custom_user_agent=custom_ua)
        assert spider.custom_settings.get("USER_AGENT") == custom_ua

    def test_user_agent_types(self):
        """Test Crawly with different user agent types."""
        for ua_type in ["chrome", "firefox", "safari", "mobile", "bot"]:
            spider = Crawly(start_urls="https://example.com", user_agent_type=ua_type)
            assert spider.custom_settings.get("USER_AGENT") is not None

    def test_follow_subdomains_true(self):
        """Test Crawly with follow_subdomains enabled."""
        spider = Crawly(start_urls="https://subdomain.example.com", follow_subdomains=True)
        # Should allow the parent domain
        assert any("example.com" in domain for domain in spider.allowed_domains)

    def test_strict_mode(self):
        """Test Crawly with strict mode enabled."""
        spider = Crawly(start_urls="https://example.com", strict_mode=True)
        assert spider.strict_mode is True

    def test_processed_urls_tracking(self):
        """Test Crawly with pre-existing processed URLs."""
        processed = {"https://example.com/page1", "https://example.com/page2"}
        spider = Crawly(start_urls="https://example.com", processed_urls=processed)
        assert spider.processed_urls == processed

    def test_extract_domain_method(self):
        """Test the _extract_domain method."""
        spider = Crawly(start_urls="https://example.com")
        domain = spider._extract_domain("https://subdomain.example.com/path")
        assert "example.com" in domain

    def test_extract_exact_domain_method(self):
        """Test the _extract_exact_domain method."""
        spider = Crawly(start_urls="https://example.com")
        domain = spider._extract_exact_domain("https://subdomain.example.com/path")
        # _extract_exact_domain returns base domain without subdomain
        assert domain == "example.com"


class TestWebsiteItem:
    """Tests for WebsiteItem class."""

    def test_website_item_creation(self):
        """Test creating a WebsiteItem."""
        item = WebsiteItem()
        item["loc"] = "https://example.com"
        item["content"] = "Test content"
        item["title"] = "Test Title"
        item["timestamp"] = "2025-12-29"

        assert item["loc"] == "https://example.com"
        assert item["content"] == "Test content"
        assert item["title"] == "Test Title"
        assert item["timestamp"] == "2025-12-29"


class TestUserAgents:
    """Tests for user agent utilities."""

    def test_get_chrome_user_agent(self):
        """Test getting Chrome user agent."""
        ua = get_user_agent("chrome")
        assert ua is not None
        assert len(ua) > 0

    def test_get_firefox_user_agent(self):
        """Test getting Firefox user agent."""
        ua = get_user_agent("firefox")
        assert ua is not None
        assert len(ua) > 0

    def test_get_safari_user_agent(self):
        """Test getting Safari user agent."""
        ua = get_user_agent("safari")
        assert ua is not None
        assert len(ua) > 0

    def test_get_mobile_user_agent(self):
        """Test getting mobile user agent."""
        ua = get_user_agent("mobile")
        assert ua is not None
        assert len(ua) > 0

    def test_get_bot_user_agent(self):
        """Test getting bot user agent."""
        ua = get_user_agent("bot")
        assert ua is not None
        assert len(ua) > 0

    def test_default_user_agent(self):
        """Test default user agent fallback."""
        ua = get_user_agent("invalid_type")
        assert ua is not None
        assert len(ua) > 0
