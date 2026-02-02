import re
import time
import uuid
from typing import Any, Dict, Optional

from vespa.io import VespaResponse

from nyrag.config import Config
from nyrag.defaults import DEFAULT_VESPA_LOCAL_PORT, DEFAULT_VESPA_URL
from nyrag.deploy import deploy_app_package
from nyrag.logger import logger
from nyrag.schema import VespaSchema
from nyrag.utils import get_cloud_secret_token, get_tls_config_from_deploy, make_vespa_client


def sanitize_text(text: str) -> str:
    """Sanitize text to remove illegal characters for Vespa.

    Removes:
    - Null bytes and other control characters (except newlines, tabs, carriage returns)
    - Invalid UTF-8 sequences
    - Surrogates and other problematic Unicode characters

    Args:
        text: Input text to sanitize

    Returns:
        Sanitized text safe for Vespa ingestion
    """
    if not text:
        return ""

    # First, ensure valid UTF-8 by encoding/decoding with error handling
    text = text.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore")

    # Remove null bytes
    text = text.replace("\x00", "")

    # Remove other control characters except newline, tab, and carriage return
    # Keep: \n (0x0A), \r (0x0D), \t (0x09)
    # Remove: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F
    text = re.sub(r"[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]", "", text)

    # Remove Unicode surrogates (0xD800-0xDFFF) and other problematic ranges
    text = re.sub(r"[\uD800-\uDFFF]", "", text)

    # Remove private use area characters that might cause issues
    text = re.sub(r"[\uE000-\uF8FF]", "", text)

    return text


class VespaFeeder:
    """Feed documents into Vespa.

    The new schema uses Vespa's built-in chunking and embedding:
    - text field is automatically chunked via `chunk fixed-length 1024`
    - chunks are embedded via HuggingFace embedder configured in services.xml
    - embeddings are quantized to int8 via `pack_bits`

    Client only needs to send raw document fields (id, title, text, metadata).
    """

    def __init__(
        self,
        config: Config,
        redeploy: bool = False,
        vespa_url: str = DEFAULT_VESPA_URL,
        vespa_port: int = DEFAULT_VESPA_LOCAL_PORT,
    ):
        self.config = config
        self.schema_name = config.get_schema_name()
        self.app_package_name = config.get_app_package_name()

        schema_params = config.get_schema_params()
        self.chunk_size = schema_params.get("chunk_size", 1024)

        self.app = self._connect_vespa(redeploy, vespa_url, vespa_port, schema_params)

    def feed(self, record: Dict[str, Any]) -> bool:
        """Feed a single record into Vespa.

        Args:
            record: A dictionary with fields matching the schema:
                - text (required): The main text content
                - title (optional): Document title
                - id (optional): Document ID (generated if not provided)
                - created_timestamp (optional): Creation timestamp (epoch ms)
                - modified_timestamp (optional): Modification timestamp (epoch ms)
                - last_opened_timestamp (optional): Last opened timestamp (epoch ms)
                - open_count (optional): Number of times opened
                - favorite (optional): Whether document is favorited

        Returns:
            True if feed succeeded, False otherwise.
        """
        prepared = self._prepare_record(record)
        try:
            response = self.app.feed_data_point(
                schema=self.schema_name,
                data_id=prepared["id"],
                fields=prepared["fields"],
            )
        except Exception as e:
            msg = str(e)
            if "401" in msg and "Unauthorized" in msg:
                logger.error(
                    "Vespa feed returned 401 Unauthorized. "
                    "For Vespa Cloud, set VESPA_CLOUD_SECRET_TOKEN for token auth, "
                    "or VESPA_CLIENT_CERT/VESPA_CLIENT_KEY for mTLS auth."
                )
            logger.error(f"Feed request failed for id={prepared['id']}: {e}")
            return False

        if self._is_success(response):
            logger.success(f"Fed document id={prepared['id']}")
            return True

        logger.error(f"Feed failed for id={prepared['id']}: {getattr(response, 'json', response)}")
        return False

    def _connect_vespa(
        self,
        redeploy: bool,
        vespa_url: str,
        vespa_port: int,
        schema_params: Dict[str, Any],
    ):
        deploy_config = self.config.get_deploy_config()
        cert_path, key_path, ca_cert, verify = get_tls_config_from_deploy(deploy_config)

        # Get cloud secret token for token-based auth (preferred for cloud)
        cloud_token = None
        if deploy_config.is_cloud_mode():
            cloud_token = get_cloud_secret_token(deploy_config)
            if cloud_token:
                logger.info("Using token-based authentication for Vespa Cloud")
            elif cert_path and key_path:
                logger.info("Using mTLS authentication for Vespa Cloud")
            else:
                logger.warning(
                    "No authentication credentials found for Vespa Cloud. "
                    "Set VESPA_CLOUD_SECRET_TOKEN or configure mTLS certificates."
                )

        if redeploy:
            logger.info("Redeploying Vespa application before feeding")

            # Check if using existing vespa app
            if self.config.use_existing_vespa_app():
                app_path = self.config.get_app_path()
                logger.info(f"Using existing Vespa app from: {app_path}")

                from vespa.package import ApplicationPackage

                # Create minimal package for deployment
                app_package = ApplicationPackage(name=self.app_package_name)
                deploy_app_package(app_path, app_package=app_package, deploy_config=deploy_config)
            else:
                vespa_schema = VespaSchema(
                    schema_name=self.schema_name,
                    app_package_name=self.app_package_name,
                    **schema_params,
                )
                app_package = vespa_schema.get_package()
                deploy_app_package(None, app_package=app_package, deploy_config=deploy_config)

        logger.info(f"Connecting to Vespa at {vespa_url}:{vespa_port}")
        return make_vespa_client(
            vespa_url,
            vespa_port,
            cert_path,
            key_path,
            ca_cert,
            verify,
            vespa_cloud_secret_token=cloud_token,
        )

    def _prepare_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare a record for feeding to Vespa.

        With the new schema, Vespa handles chunking and embedding automatically.
        Client just sends the raw document fields.
        """
        # Get text content (required) - support both 'text' and 'content' for backwards compat
        text = record.get("text") or record.get("content", "")
        text = text.strip() if text else ""
        if not text:
            raise ValueError("Record is missing text content")

        # Sanitize text to remove illegal characters
        text = sanitize_text(text)
        if not text:
            raise ValueError("Record text became empty after sanitization")

        # Generate or use provided ID
        doc_id = record.get("id")
        if not doc_id:
            # Use loc/title for deterministic ID, or generate random
            loc = record.get("loc", "")
            base = loc if loc else f"nyrag-{uuid.uuid4()}"
            doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, base))

        # Get current timestamp for defaults
        now_ms = int(time.time() * 1000)

        # Sanitize title as well
        title = sanitize_text(record.get("title", ""))

        # Build fields dict matching the schema
        fields: Dict[str, Any] = {
            "id": doc_id,
            "title": title,
            "text": text,
            "created_timestamp": record.get("created_timestamp", now_ms),
            "modified_timestamp": record.get("modified_timestamp", now_ms),
            "last_opened_timestamp": record.get("last_opened_timestamp", now_ms),
            "open_count": record.get("open_count", 0),
            "favorite": record.get("favorite", False),
        }

        logger.debug(f"Prepared record id={doc_id}, text length={len(text)}")
        return {"id": doc_id, "fields": fields}

    def _make_id(self, loc: str) -> str:
        base = loc if loc else f"nyrag-{uuid.uuid4()}"
        return str(uuid.uuid5(uuid.NAMESPACE_URL, base))

    def _is_success(self, response: VespaResponse) -> bool:
        status_code = getattr(response, "status_code", None)
        if status_code is None:
            return False
        if status_code >= 400:
            return False
        return True


def feed_from_config(
    config_path: str,
    record: Dict[str, Any],
    redeploy: bool = False,
) -> bool:
    """Convenience helper to feed a single record using a YAML config path."""
    config = Config.from_yaml(config_path)
    feeder = VespaFeeder(config=config, redeploy=redeploy)
    return feeder.feed(record)
