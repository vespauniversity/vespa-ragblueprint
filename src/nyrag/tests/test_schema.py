"""Tests for the schema module."""

from nyrag.schema import VespaSchema


class TestVespaSchema:
    """Tests for VespaSchema class."""

    def test_default_initialization(self):
        """Test VespaSchema initialization with default values."""
        schema = VespaSchema(schema_name="test_schema", app_package_name="test_app")
        assert schema.schema_name == "test_schema"
        assert schema.app_package_name == "test_app"
        assert schema.embedding_dim == 96  # int8 packed bits dimension
        assert schema.chunk_size == 1024

    def test_custom_initialization(self):
        """Test VespaSchema initialization with custom values."""
        schema = VespaSchema(
            schema_name="custom_schema",
            app_package_name="custom_app",
            embedding_dim=128,
            chunk_size=2048,
        )
        assert schema.schema_name == "custom_schema"
        assert schema.app_package_name == "custom_app"
        assert schema.embedding_dim == 128
        assert schema.chunk_size == 2048

    def test_create_schema(self):
        """Test that create_schema returns a valid Schema object."""
        schema = VespaSchema(schema_name="test_schema", app_package_name="test_app")
        vespa_schema = schema.create_schema()

        # Check that it returns a Schema object
        assert vespa_schema is not None
        assert hasattr(vespa_schema, "name")
        assert vespa_schema.name == "test_schema"

    def test_create_app_package(self):
        """Test that schema can be converted to application package."""
        schema = VespaSchema(schema_name="test_schema", app_package_name="test_app")
        app_package = schema.get_package()

        assert app_package is not None
        assert app_package.name == "test_app"

    def test_schema_with_different_dimensions(self):
        """Test schema creation with different embedding dimensions."""
        dimensions = [64, 96, 128, 192]

        for dim in dimensions:
            schema = VespaSchema(
                schema_name="test_schema",
                app_package_name="test_app",
                embedding_dim=dim,
            )
            vespa_schema = schema.create_schema()
            assert vespa_schema is not None

    def test_schema_with_different_chunk_sizes(self):
        """Test schema creation with different chunk sizes."""
        chunk_sizes = [256, 512, 1024, 2048, 4096]

        for size in chunk_sizes:
            schema = VespaSchema(schema_name="test_schema", app_package_name="test_app", chunk_size=size)
            vespa_schema = schema.create_schema()
            assert vespa_schema is not None

    def test_schema_has_document_fields(self):
        """Test that schema has the expected document fields."""
        schema = VespaSchema(schema_name="doc", app_package_name="test_app")
        vespa_schema = schema.create_schema()

        # Get document fields
        doc_field_names = [f.name for f in vespa_schema.document.fields]

        # Check for required document fields
        assert "id" in doc_field_names
        assert "title" in doc_field_names
        assert "text" in doc_field_names
        assert "created_timestamp" in doc_field_names
        assert "modified_timestamp" in doc_field_names
        assert "last_opened_timestamp" in doc_field_names
        assert "open_count" in doc_field_names
        assert "favorite" in doc_field_names

    def test_schema_has_synthetic_fields(self):
        """Test that schema has synthetic fields (outside document block)."""
        schema = VespaSchema(schema_name="doc", app_package_name="test_app")
        vespa_schema = schema.create_schema()

        # Get all field names (document + synthetic)
        all_field_names = [f.name for f in vespa_schema.fields]

        # Check for synthetic fields
        assert "title_embedding" in all_field_names
        assert "chunks" in all_field_names
        assert "chunk_embeddings" in all_field_names

    def test_rank_profile_added(self):
        """Test that rank profile is added to schema."""
        schema = VespaSchema(schema_name="doc", app_package_name="test_app")
        vespa_schema = schema.create_schema()
        schema.add_rank_profile(vespa_schema)

        # Check that base-features rank profile exists
        rank_profile_names = [rp.name for rp in vespa_schema.rank_profiles]
        assert "base-features" in rank_profile_names
