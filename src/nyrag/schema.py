from dataclasses import dataclass

from vespa.package import (
    ApplicationPackage,
    Document,
    DocumentSummary,
    Field,
    FieldSet,
    Function,
    RankProfile,
    Schema,
    Summary,
)


@dataclass
class VespaSchema:
    schema_name: str
    app_package_name: str
    embedding_dim: int = 96  # int8 packed bits dimension (768 floats -> 96 int8)
    chunk_size: int = 1024

    def create_schema(self) -> Schema:
        """Create a Vespa schema matching rag-blueprint doc.sd."""
        # Document fields (inside document block)
        document = Document(
            fields=[
                Field(
                    name="id",
                    type="string",
                    indexing=["summary", "attribute"],
                ),
                Field(
                    name="title",
                    type="string",
                    indexing=["index", "summary"],
                    index="enable-bm25",
                ),
                Field(
                    name="text",
                    type="string",
                    indexing=[],
                ),
                Field(
                    name="created_timestamp",
                    type="long",
                    indexing=["attribute", "summary"],
                ),
                Field(
                    name="modified_timestamp",
                    type="long",
                    indexing=["attribute", "summary"],
                ),
                Field(
                    name="last_opened_timestamp",
                    type="long",
                    indexing=["attribute", "summary"],
                ),
                Field(
                    name="open_count",
                    type="int",
                    indexing=["attribute", "summary"],
                ),
                Field(
                    name="favorite",
                    type="bool",
                    indexing=["attribute", "summary"],
                ),
            ]
        )

        # Create schema with document
        schema = Schema(name=self.schema_name, document=document)

        # Synthetic fields (outside document block)
        # title_embedding with pack_bits and hamming distance
        schema.add_fields(
            Field(
                name="title_embedding",
                type=f"tensor<int8>(x[{self.embedding_dim}])",
                indexing=["input title | embed | pack_bits | attribute | index"],
                attribute=["distance-metric: hamming"],
            )
        )

        # chunks field with built-in chunking
        schema.add_fields(
            Field(
                name="chunks",
                type="array<string>",
                indexing=[f"input text | chunk fixed-length {self.chunk_size} | summary | index"],
                index="enable-bm25",
            )
        )

        # chunk_embeddings with chunking, embedding, and pack_bits
        schema.add_fields(
            Field(
                name="chunk_embeddings",
                type=f"tensor<int8>(chunk{{}}, x[{self.embedding_dim}])",
                indexing=[f"input text | chunk fixed-length {self.chunk_size} | embed | pack_bits | attribute | index"],
                attribute=["distance-metric: hamming"],
            )
        )

        # Define fieldset
        schema.add_field_set(FieldSet(name="default", fields=["title", "chunks"]))

        # Add document summaries
        self._add_document_summaries(schema)

        return schema

    def _add_document_summaries(self, schema: Schema) -> None:
        """Add document summaries to the schema."""
        # Document summary: no-chunks
        schema.add_document_summary(
            DocumentSummary(
                name="no-chunks",
                summary_fields=[
                    Summary(name="id"),
                    Summary(name="title"),
                    Summary(name="created_timestamp"),
                    Summary(name="modified_timestamp"),
                    Summary(name="last_opened_timestamp"),
                    Summary(name="open_count"),
                    Summary(name="favorite"),
                    Summary(name="chunks"),
                ],
            )
        )

        # Document summary: top_3_chunks removed - requires top_3_chunk_sim_scores in summary-features

    def add_rank_profile(self, schema: Schema) -> None:
        """Add base-features rank profile with chunk scoring functions."""
        # Inputs for query embeddings
        inputs = [
            ("query(embedding)", f"tensor<int8>(x[{self.embedding_dim}])"),
            ("query(float_embedding)", "tensor<float>(x[768])"),
        ]

        # Functions matching base-features.profile
        functions = [
            Function(
                name="chunk_text_scores",
                expression="elementwise(bm25(chunks), chunk, float)",
            ),
            Function(
                name="chunk_emb_vecs",
                expression="unpack_bits(attribute(chunk_embeddings))",
            ),
            Function(
                name="chunk_dot_prod",
                expression="reduce(query(float_embedding) * chunk_emb_vecs(), sum, x)",
            ),
            Function(
                name="vector_norms",
                expression="sqrt(sum(pow(t, 2), x))",
                args=["t"],
            ),
            Function(
                name="chunk_sim_scores",
                expression="chunk_dot_prod() / (vector_norms(chunk_emb_vecs()) * vector_norms(query(float_embedding)))",
            ),
            Function(
                name="top_3_chunk_text_scores",
                expression="top(3, chunk_text_scores())",
            ),
            Function(
                name="top_3_chunk_sim_scores",
                expression="top(3, chunk_sim_scores())",
            ),
            Function(
                name="avg_top_3_chunk_text_scores",
                expression="reduce(top_3_chunk_text_scores(), avg, chunk)",
            ),
            Function(
                name="avg_top_3_chunk_sim_scores",
                expression="reduce(top_3_chunk_sim_scores(), avg, chunk)",
            ),
            Function(
                name="max_chunk_text_scores",
                expression="reduce(chunk_text_scores(), max, chunk)",
            ),
            Function(
                name="max_chunk_sim_scores",
                expression="reduce(chunk_sim_scores(), max, chunk)",
            ),
        ]

        # Summary features removed - using default (no summary-features)

        schema.add_rank_profile(
            RankProfile(
                name="base-features",
                inputs=inputs,
                functions=functions,
                rank_properties=[("rank.chunks.element-gap", "0")],
                first_phase="max_chunk_sim_scores()",
            )
        )

    def get_package(self) -> ApplicationPackage:
        """Get the Vespa application package with schema and rank profile."""
        schema = self.create_schema()
        self.add_rank_profile(schema)
        app_package = ApplicationPackage(name=self.app_package_name, schema=[schema])
        return app_package

    def save_package(self, output_dir: str) -> None:
        """Save the Vespa application package to the specified directory."""
        app_package = self.get_package()
        app_package.to_files(output_dir)
