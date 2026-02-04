# Build a High-Quality RAG App on Vespa Cloud in 15 Minutes

*From Zero to RAG: A Simple Step-by-Step Tutorial*

![nyrag_ui](img/nyrag_ui.png)

In this tutorial, you'll build a complete RAG (Retrieval-Augmented Generation) application in just four steps. By the end, you'll have a Vespa Cloud-backed search service, a small pipeline that turns PDFs (and other sources) into searchable chunks, and a chat UI that answers questions using only your own content.

You'll do this with two pieces that are designed to fit together: the Vespa RAG Blueprint (a pre-configured Vespa application that already includes hybrid retrieval and ranking), and NyRAG (a small tool that handles document processing, embeddings, feeding, and the UI).

Time required is about 15 minutes for setup, plus however long it takes to process your documents.

**The 4-Step Process:**  
![Steps Illustration](img/steps_illustration.png)

## What is RAG?

Retrieval-Augmented Generation (RAG) is the pattern where you give an LLM (Large Language Model) controlled access to your own data at question time. LLMs are powerful, but on their own they can hallucinate, they have a knowledge cutoff, and they certainly do not know anything about your private documents, internal wikis, or company data.

RAG bridges this gap by retrieving relevant information from your data and feeding it to the LLM as "context" to answer a user's question grounded in truth.

## The Challenge: Quality Context Window

The limiting factor in RAG is often the **context window** of the LLM. You can't just feed your entire database into a prompt. You have a finite budget of tokens.
The challenge, therefore, is not just *finding* data, but finding the *most relevant* data. If you fill the context window with low-quality, keyword-matched search results, the LLM will produce low-quality answers. You need semantic understanding, precision, and the ability to rank diverse data types.

![illustration_2](img/illustration_2.png)

## The Solution: Vespa Out-of-the-Box RAG on Vespa Cloud

Vespa Cloud provides an out-of-the-box setup that maximizes the quality of what you send to the LLM. Instead of relying on only nearest-neighbor vector search, Vespa combines semantic vector retrieval with lexical BM25 matching, and then applies advanced ranking (for example BERT, LightGBM, or custom logic) so the chunks you send to the model are the best candidates you have.

This "Hybrid Search" ensures that the documents sent to the LLM are the absolute best matches for the query, drastically improving the final generated answer.

---

## Step 1: Deploy Vespa RAG Blueprint to Vespa Cloud

First, deploy the pre-configured RAG Blueprint to Vespa Cloud (it's free to start). You will do this entirely from the Vespa Cloud console.

**1.1 Sign up for Vespa Cloud**

Go to the [Vespa Cloud Console](https://console.vespa-cloud.com/) and create an account. If you have not used Vespa Cloud before, the free trial is a good place to start.

![image_1](img/image_1.png)

**1.2 Deploy RAG Blueprint**

In the console, choose **"Deploy your first application"**.
![image_2](img/image_2.png)

Pick **"Select a sample application to deploy directly from the browser"**.
![image_3](img/image_3.png)

Select **"RAG Blueprint"**.
![image_4](img/image_4.png)

Finally, click **"Deploy"** and wait for the deployment to finish.
![image_5](img/image_5.png)
![image_8](img/image_8.png)

**1.3 Save your credentials**

When the console shows you a token, save it right away.
![image_9](img/image_9.png)

That token is how NyRAG will authenticate to your Vespa Cloud endpoint. Treat it like a password.

Continue through the setup screens, then open the application view.
![image_10](img/image_10.png)
![image_11](img/image_11.png)
![image_12](img/image_12.png)
![image_13](img/image_13.png)
![image_15](img/image_15.png)

**1.4 Note your endpoint URL**

In the application view you will also find the endpoint URL. It typically looks like `https://[app-id].vespa-cloud.com`. Save both the endpoint and the token; you will use them in Step 3 to connect NyRAG to your deployment.

---

## Step 2: Install NyRAG

Now install the NyRAG tool from the vespa-ragblueprint repository:

```bash
# Clone the repository
git clone https://github.com/vespauniversity/vespa-ragblueprint
cd vespa-ragblueprint

# Install uv (Fast, modern Python package manager)
# macOS
brew install uv

# Linux & macOS
# curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows (PowerShell)
# powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify uv installation
uv --version

# Install dependencies using uv
uv sync
source .venv/bin/activate

# Install nyrag locally
uv pip install -e .

# Verify nyrag installation
nyrag --help
```

**What is NyRAG?**

NyRAG is the glue for this tutorial. It reads documents (local files or websites), splits text into chunks, generates embeddings, feeds the results to Vespa, and then exposes a simple chat UI that answers questions using the retrieved chunks as context.

This version is optimized to work with the Vespa RAG Blueprint schema.

**Tip:** The repository includes a `run_nyrag.sh` script that makes it easy to start NyRAG with your Vespa Cloud deployment!

---

## Step 3: Configure Your Project and Process Documents

Now you'll configure your project using the web UI to connect to your Vespa Cloud deployment and set up document processing.

**3.1 Get an LLM API key**

NyRAG needs an OpenAI-compatible API key so it can generate the final answer after retrieval. If you just want the easiest starting point, OpenRouter works well because it provides access to many models behind a single API.

If you use OpenRouter, your configuration looks like this:
```yaml
llm_config:
  base_url: https://openrouter.ai/api/v1
  model: meta-llama/llama-3.2-3b-instruct:free
  api_key: sk-or-v1-...
```

If you prefer OpenAI directly, the shape is the same:
```yaml
llm_config:
  base_url: https://api.openai.com/v1
  model: gpt-4o-mini
  api_key: sk-...
```

Whichever provider you pick, keep the API key handy; you will paste it into the config editor in the next step.

---

**3.2 Start the NyRAG UI:**

**Quick way (using the provided script):**
```bash
# This script handles all configuration automatically
./run_nyrag.sh
```

The `run_nyrag.sh` script starts the UI and wires up the configuration so NyRAG can talk to Vespa Cloud. In practice, it loads your project config, uses the token you provide for authentication, and starts the web UI on port 8000.


Open http://localhost:8000 in your browser.

**3.3 Configure your project:**

**Step 1: Select and edit the example project**

In the top header, the project dropdown shows **"doc_example"**. If you are starting from the example config, it is usually pre-selected. The configuration editor typically opens automatically; if it does not (for example you land directly in chat), open the three-dot menu (⋮) and choose **"Edit Config"**.

![Project selector dropdown with "doc_example" highlighted](img/nyrag_7.png)
**Description**: Shows the project dropdown menu in the header with "doc_example" option

> **Note:** If the configuration editor doesn't appear (shows chat interface instead), click the **three-dot menu** (⋮) in the top right corner and select **"Edit Config"** to open it manually.

**Step 2: Update your credentials**

In the configuration editor, paste in the credentials you saved from Vespa Cloud and your LLM provider. You only need three things to get going: your Vespa tenant name, your Vespa endpoint + token, and your LLM API key.

**Required fields to update:**

```yaml
# Your Vespa Cloud credentials (from Vespa Cloud Console)
cloud_tenant: your-tenant          # Your Vespa Cloud tenant name
vespa_cloud:
  endpoint: https://your-app.vespa-cloud.com  # Your Vespa token endpoint (not mtls)
  token: vespa_cloud_YOUR_TOKEN_HERE          # Your Vespa data plane token

# Your LLM configuration (default: OpenRouter)
llm_config:
  api_key: sk-or-v1-YOUR_KEY_HERE   # Your OpenRouter API key (or other provider)
```

**Notes:**

The default LLM provider is OpenRouter. If you switch providers, also update `base_url` and `model` to match. For the included example documents, `start_loc` defaults to `./dataset`, so you can run the pipeline without changing anything else.

**Step 3: Save and start processing**

After updating the configuration, you can close the editor (changes are saved automatically) and start indexing. If you are using the example dataset, keep `./dataset` as-is; otherwise, point `start_loc` at the folder (or site) you want to ingest. When you click **"Start Indexing"**, NyRAG reads your input, chunks it into 1024-character segments, generates embeddings, feeds everything to Vespa Cloud, and shows progress in the terminal panel so you can see exactly what is happening.

![Processing progress with terminal logs](img/nyrag_10.png)
**Description**: Shows documents being processed with terminal logs displaying progress  

---

## Step 4: Chat with Your Data

Once processing is complete, use the NyRAG chat interface to ask questions!

![nyrag_ui](img/nyrag_ui.png)

When you ask a question, NyRAG expands it into a few focused search queries, Vespa runs hybrid retrieval (BM25 + vector similarity), and the best chunks are fused into a small context window. The LLM then generates the final answer using only that retrieved context.

If you want a quick sanity check, ask something broad ("What are the main topics in these documents?") and then follow up with something specific ("Find information about <topic>") to confirm the retrieved chunks are relevant.

**That's it!** You now have a fully functional RAG application.

### Adjusting Search Quality with Ranking Profiles

Want better search results? You can fine-tune how Vespa ranks your documents using the Settings modal (⚙️ icon in the top right).

**Available Ranking Profiles:**

The RAG Blueprint includes 6 different ranking profiles, each optimized for different trade-offs between speed and quality:

1. **base-features** (default, fast). This profile keeps things simple: it blends BM25 text matching with vector similarity and is usually the best choice while you are getting started. It is also a good everyday profile when you want quick answers and reasonable relevance.

2. **learned-linear** (linear model). This profile adds a light learned model (logistic regression) on top of the base features. It is a nice middle ground when you want a quality bump without paying the full cost of heavier second-phase ranking.

3. **second-with-gbdt** (GBDT, best quality). This profile uses a LightGBM gradient boosting model in a second phase. It tends to give the best ranking quality, especially for harder queries, but it is slower than the simpler profiles.

4. **match-only** (no ranking, fastest). This profile is primarily a debugging tool: it returns matches without doing much ranking work. If you are trying to verify that retrieval works at all, this is a useful baseline.

5. **collect-training-data** and **collect-second-phase** (training). These profiles are meant for advanced workflows where you collect signals and training data to build or tune your own ranking models.

> **For Advanced Users:** Want to understand the technical details behind these ranking profiles? Learn about phased ranking architecture, LightGBM model integration, tensor operations, and how Vespa scales ranking to billions of documents. See the comprehensive [Ranking Profiles technical guide](https://github.com/vespauniversity/vespa-ragblueprint#ranking-profiles) in the main README, including GitHub folder structure (`vespa_cloud/schemas/doc/*.profile`) and profile inheritance.

**When to use different profiles:** In daily use, stick with `base-features` for fast, good-enough results. When you care about squeezing out the best possible relevance, switch to `second-with-gbdt` for that query (it can make a big difference on complex questions). And if you are debugging retrieval, `match-only` is a helpful way to confirm that matches are coming back at all.

**How to change ranking profiles:** Open the ⚙️ **Settings** panel, choose a **Ranking Profile** from the dropdown, and click **"Save"**. The very next query you run will use the new profile.

![Settings modal with ranking profile dropdown](img/nyrag_settings_ranking_profiles.png)  
**Description**: Settings modal showing ranking profile selection dropdown with 6 available options

**Pro tip**: The quality difference between `base-features` and `second-with-gbdt` can be dramatic for complex queries. Try both and see which works best for your use case!

---

**Advanced: Querying with Ranking Profiles via CLI**

If you prefer using the Vespa CLI for direct queries (without the NyRAG UI), you can specify the ranking profile:

```bash
# Query with specific ranking profile
vespa query 'query=machine learning' 'ranking=second-with-gbdt'

# Compare results with different profiles
vespa query 'query=RAG architecture' 'ranking=base-features'
vespa query 'query=RAG architecture' 'ranking=second-with-gbdt'
```

See the [Vespa CLI section](#querying-vespa-directly-with-cli-advanced) in "Behind the Scenes" for setup instructions.

---

### Managing Your Data

Need to reset or clean up your data? Open the advanced menu (three-dot icon ⋮ in the top right) and you will find two cleanup actions. **Clear Local Cache** removes cached files for all projects on your machine, which is useful when you want to re-process from scratch locally. **Clear Vespa Data** deletes the indexed documents in Vespa for the project, which is useful when you want a clean index before re-feeding. Both actions ask for confirmation so you do not delete data by accident.

---

## Bonus: Try Web Crawling Mode

Want to create a RAG application from website content instead of local documents? NyRAG supports web crawling!

**How to switch to web crawling mode:** Open the configuration editor and select `web_example (web)` from the dropdown at the top. If you are currently on the chat screen, open the three-dot menu (⋮) and choose **"Edit Config"** to bring the editor back. From there, update the same credential fields as you did for `doc_example`, then click **"Start Indexing"** to crawl and feed the site.

![Web crawling in progress](img/nyrag_indexing_web_2.png) 
**Description**: Shows web crawling in progress with terminal logs displaying discovered URLs and processed pages

**Web Mode Features:** Web mode discovers and follows links automatically, while still respecting `robots.txt` and crawl delays so you do not hammer a site. It also does smart content extraction to drop navigation and boilerplate, deduplicates very similar pages, and supports resume so you can continue a crawl after interruption.

**Example Use Cases:** Web mode is a good fit for product documentation, knowledge bases, blog archives, help-center content, and technical wikis. In general, it works best on sites with consistent HTML structure and clean, text-heavy pages.

**Tips:** Start small. Crawl a limited part of a site first so you can sanity-check what gets extracted and indexed, then expand. Use `exclude` patterns to skip sections you do not want (for example `/pricing` or `/sales/*`), and keep an eye on the terminal output panel so you can spot loops, unexpected URLs, or pages that fail to parse.


---

<!--
## Alternative: Query with Python or CLI

If you prefer coding over the UI, you can query Vespa directly:

**Using Vespa CLI:**
```bash
# Install Vespa CLI
brew install vespa-cli

# Configure to use your cloud deployment
vespa config set target cloud
vespa config set application your-tenant.your-app

# Authenticate (one-time setup)
vespa auth login

# Or use certificate authentication
vespa auth cert app

# Simple query
vespa query 'query=What is RAG?'

# Query with custom headers (if using token auth)
vespa query \
  --header="Authorization: Bearer your-token-here" \
  'query=What is RAG?'
```

**Using Python (pyvespa):**
```bash
pip install pyvespa
```

```python
from vespa.application import Vespa

# Option 1: Connect with token authentication
app = Vespa(
    url="https://your-app.vespa-cloud.com",
    vespa_cloud_secret_token="your-vespa-cloud-token"  # From Step 1
)

# Option 2: Connect with certificate authentication
# app = Vespa(
#     url="https://your-app.vespa-cloud.com",
#     cert="/path/to/your/certificate.pem"
# )

# Option 3: For local deployment (no auth needed)
# app = Vespa(url="http://localhost:8080")

# Search
response = app.query(
    yql="select * from doc where userQuery()",
    query="What is RAG?",
    hits=5
)

# Print results
for hit in response.hits:
    print(f"Title: {hit['fields']['title']}")
    print(f"Chunks: {hit['fields']['chunks'][:2]}")
    print("---")
```

**Note:** Use the token you saved in Step 1 for authentication. The token allows secure access to your Vespa Cloud deployment.

---
-->

## Troubleshooting

Running into issues? We've got you covered! For detailed troubleshooting guides covering Vespa connection errors, LLM configuration, document processing, and more, see the **[Troubleshooting section](https://github.com/vespauniversity/vespa-ragblueprint#troubleshooting)** in the main README.

**Quick help:** If you get stuck, the fastest path is usually to ask in the [Vespa Slack](http://slack.vespa.ai/) community, where people can help you interpret logs and query behavior. If you think you found a bug or want to request an improvement, open an issue in [GitHub Issues](https://github.com/vespauniversity/vespa-ragblueprint/issues). And when you want deeper background on schema, ranking, and deployment, the [Vespa Docs](https://docs.vespa.ai/) are the canonical reference.

---

## Behind the Scenes

Want to understand what's happening under the hood? Here are the technical details:

### The Schema

The RAG Blueprint uses a carefully designed schema that defines how your documents are stored and searched:

`vespa_cloud/schemas/doc.sd`:

```java
schema doc {
    document doc {
        field id type string {
            indexing: summary | attribute
        }
        field title type string {
            indexing: index | summary
            index: enable-bm25
        }
        field text type string {
        }

        # Optional metadata fields for tracking document usage
        field created_timestamp type long {
            indexing: attribute | summary
        }
        field modified_timestamp type long {
            indexing: attribute | summary
        }
        field last_opened_timestamp type long {
            indexing: attribute | summary
        }
        field open_count type int {
            indexing: attribute | summary
        }
        field favorite type bool {
            indexing: attribute | summary
        }
    }

    # Binary quantized embeddings for the title (768 floats → 96 int8)
    field title_embedding type tensor<int8>(x[96]) {
        indexing: input title | embed | pack_bits | attribute | index
        attribute {
            distance-metric: hamming
        }
    }

    # Automatically chunks text into 1024-character segments
    field chunks type array<string> {
        indexing: input text | chunk fixed-length 1024 | summary | index
        index: enable-bm25
    }

    # Binary quantized embeddings for each chunk
    field chunk_embeddings type tensor<int8>(chunk{}, x[96]) {
        indexing: input text | chunk fixed-length 1024 | embed | pack_bits | attribute | index
        attribute {
            distance-metric: hamming
        }
    }

    fieldset default {
        fields: title, chunks
    }

    document-summary top_3_chunks {
        from-disk
        summary chunks_top3 {
            source: chunks
            select-elements-by: top_3_chunk_sim_scores
        }
    }
}
```

**What's happening here:** Your documents store their raw content in `title` and `text`. At indexing time, `text` is chunked into an array of 1024-character segments, and embeddings are computed for both titles and chunks. Those embeddings are binary-quantized with `pack_bits` so they are much smaller on disk (768 floats become 96 int8 values), while still supporting efficient vector similarity search. On top of that, BM25 is enabled for lexical matching, which is how the blueprint achieves hybrid retrieval.

### How Data Flows

**In this setup:**
1. **NyRAG** reads your documents and generates embeddings (using sentence-transformers)
2. **NyRAG** chunks text into 1024-character segments
3. **NyRAG** feeds documents with embeddings to Vespa
4. **Vespa** stores everything and performs hybrid search
5. **NyRAG** uses an LLM to generate answers from retrieved chunks

**Note:** While Vespa can generate embeddings and call LLMs directly (via HuggingFace embedder and OpenAI components in `services.xml`), this tutorial uses NyRAG to handle those tasks for simplicity. This NyRAG version is optimized for this workflow.

### Querying Vespa Directly with CLI (Advanced)

While the NyRAG UI provides an easy interface for querying your data, you can also query Vespa directly using the Vespa CLI. This gives you more control and insight into how queries work under the hood.

**Install Vespa CLI:**

```bash
# macOS
brew install vespa-cli

# Linux, macOS, Windows
# Download binary from: https://github.com/vespa-engine/vespa/releases
# Place in your PATH

# Verify installation
vespa version
```

**Configure Vespa CLI for your deployment:**

```bash
# Set target to cloud
vespa config set target cloud

# Set your application (from Step 1)
# Format: <tenant-name>.<application-name>.<instance-name>
# Example: mytenant.rag-blueprint.default
vespa config set application <your-tenant>.<your-app>.<your-instance>

# Authenticate with Vespa Cloud
vespa auth login
```

**Example queries:**

```bash
# Simple text search
vespa query 'yql=select * from doc where userQuery()' \
  'query=what is vespa?' \
  'hits=5'

# Hybrid search (text + vector)
vespa query 'yql=select * from doc where userQuery() or ({targetHits:100}nearestNeighbor(chunk_embeddings,embedding))' \
  'query=machine learning' \
  'hits=5'

# With specific rank profile
vespa query 'yql=select * from doc where userQuery()' \
  'query=RAG architecture' \
  'ranking=hybrid' \
  'hits=10'

# Verbose mode (see full HTTP request/response)
vespa query -v 'query=search query'
```

**Why use Vespa CLI?** The CLI is optional, but it is handy when you want a direct view of what Vespa returns without the UI and LLM layer in between. It makes it easy to experiment with ranking profiles and query parameters, to debug why a query is (or is not) retrieving the right documents, and to integrate searches into scripts and automation. It is also lower-latency than full chat because it skips answer generation.

**Note:** This is optional! The NyRAG UI handles all of this for you, plus adds LLM-powered answer generation. The CLI is useful for debugging, testing, and advanced use cases.

---

## Conclusion

**Congratulations!** You now have a working RAG app: a Vespa Cloud deployment that can retrieve high-quality context, and a small UI that lets you ingest data and chat with it.

The main thing you built is a hybrid retrieval setup that combines vector similarity and BM25 text matching, and then ranks results so the LLM sees the best context you can provide. Once it is set up, keeping it current is simply a matter of re-running indexing when you add new documents.

If you want to go deeper, start with the code in the repository and the Vespa tutorials. When you run into questions, the Vespa Slack community is a great place to ask.

Next steps: If you want to keep exploring, start with the repository ([vespa-ragblueprint on GitHub](https://github.com/vespauniversity/vespa-ragblueprint)) and compare it with the original NyRAG project ([NyRAG GitHub](https://github.com/vespaai-playground/NyRAG)) to see what is customized for this blueprint. For a deeper conceptual walkthrough, the Vespa docs tutorial is a great follow-on: [RAG Blueprint Tutorial](https://docs.vespa.ai/en/tutorials/rag-blueprint.html). And if you want help or want to share what you built, join the [Vespa Slack](http://slack.vespa.ai/) community; it is the quickest way to get advice on retrieval, ranking, and deployment details.
