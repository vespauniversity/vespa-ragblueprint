# Build a High-Quality RAG App on Vespa Cloud in 15 Minutes

*From Zero to RAG: A Simple Step-by-Step Tutorial*

![nyrag_ui](img/nyrag_ui.png)


Retrieval-Augmented Generation (RAG) is the pattern where you give an LLM (Large Language Model) controlled access to your own data at question time. LLMs are powerful, but on their own they can hallucinate, they have a knowledge cutoff, and they certainly do not know anything about your private documents, internal wikis, or company data.

RAG bridges this gap by retrieving relevant information from your data and feeding it to the LLM as "context" to answer a user's question grounded in truth.

## The Challenge: Quality Context Window

The limiting factor in RAG is often the **context window** of the LLM. You can't just feed your entire database into a prompt. You have a finite budget of tokens.
The challenge, therefore, is not just *finding* data, but finding the *most relevant* data. If you fill the context window with low-quality, keyword-matched search results, the LLM will produce low-quality answers. You need semantic understanding, precision, and the ability to rank diverse data types.

![illustration_2](img/illustration_2.png)

## The Solution: Vespa Out-of-the-Box RAG on Vespa Cloud

Vespa Cloud provides an out-of-the-box setup that maximizes the quality of what you send to the LLM. Instead of relying on only nearest-neighbor vector search, Vespa combines semantic vector retrieval with lexical BM25 matching, and then applies advanced ranking (for example BERT, LightGBM, or custom logic) so the chunks you send to the model are the best candidates you have.

This "Hybrid Search" ensures that the documents sent to the LLM are the absolute best matches for the query, drastically improving the final generated answer.

In this blog, we'll build a complete RAG (Retrieval-Augmented Generation) application. Here is the architecture of what we are building:

![Vespa RAG Architecture](img/architecture_diagram.png)

This diagram illustrates the complete RAG application. The process is divided into two main flows: data ingestion and query processing.

**Data Ingestion (One-time setup):**
First, we feed our data sources (such as documents, PDFs, or websites) into a Python-based ingestion pipeline. This pipeline processes the data, chunks it into manageable pieces, generates embeddings, and then feeds them into our Vespa Cloud application, which is pre-configured with a schema and ranking profiles. This populates our search index.

**Query Flow (Live interaction):**
1.  A user enters a query into the **Vespa RAG UI**.
2.  The UI sends the query to the **Python backend**, which in turn sends a hybrid search query (combining keyword and vector search) to **Vespa Cloud**.
3.  **Vespa Cloud** returns the most relevant document chunks to the backend.
4.  The backend takes these chunks and, along with the original query, sends them as context to an **OpenAI** model.
5.  **OpenAI** returns a generated answer based on the provided context to the backend.
6.  The backend streams the generated answer to the UI for the user to see.

This architecture ensures that the answers are grounded in your data, leveraging the powerful retrieval capabilities of Vespa and the generative power of large language models.

Time required is about 15 minutes for setup, plus however long it takes to process your documents.

---

## Deploy Vespa RAG Blueprint to Vespa Cloud

First, deploy the pre-configured RAG Blueprint to Vespa Cloud (it's free to start). You will do this entirely from the Vespa Cloud console.

**Sign up for Vespa Cloud**

Go to the [Vespa Cloud Console](https://console.vespa-cloud.com/) and create an account. If you have not used Vespa Cloud before, the free trial is a good place to start.

![image_1](img/image_1.png)

**Deploy RAG Blueprint**

In the console, choose **"Deploy your first application"**.
![image_2](img/image_2.png)

Pick **"Select a sample application to deploy directly from the browser"**.
![image_3](img/image_3.png)

Select **"RAG Blueprint"**.
![image_4](img/image_4.png)

Finally, click **"Deploy"** and wait for the deployment to finish.
![image_5](img/image_5.png)
![image_8](img/image_8.png)

**Save your credentials**

When the console shows you a token, save it right away.
![image_9](img/image_9.png)

That token is how NyRAG will authenticate to your Vespa Cloud endpoint. Treat it like a password.

Continue through the setup screens, then open the application view.
![image_10](img/image_10.png)
![image_11](img/image_11.png)
![image_12](img/image_12.png)
![image_13](img/image_13.png)
![image_15](img/image_15.png)

**Note your endpoint URL**

In the application view you will also find the endpoint URL. It typically looks like `https://[app-id].vespa-cloud.com`. Save both the endpoint and the token; you will need them to configure NyRAG in the next section.

## Behind the Scenes

When you clicked "Deploy", Vespa Cloud automatically provisioned all the necessary infrastructure and deployed a **Vespa Application Package**. This package contains all the configuration for your RAG application, including a pre-defined schema for your documents, a set of powerful ranking profiles for retrieval, and the necessary service definitions. You've essentially launched a ready-to-use, production-grade retrieval engine.

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


**OOTB Ranking Profiles:**

The RAG Blueprint includes 6 different ranking profiles, each optimized for different trade-offs between speed and quality:

1. **base-features** (default, fast). This profile keeps things simple: it blends BM25 text matching with vector similarity and is usually the best choice while you are getting started. It is also a good everyday profile when you want quick answers and reasonable relevance.

2. **learned-linear** (linear model). This profile adds a light learned model (logistic regression) on top of the base features. It is a nice middle ground when you want a quality bump without paying the full cost of heavier second-phase ranking.

3. **second-with-gbdt** (GBDT, best quality). This profile uses a LightGBM gradient boosting model in a second phase. It tends to give the best ranking quality, especially for harder queries, but it is slower than the simpler profiles.

4. **match-only** (no ranking, fastest). This profile is primarily a debugging tool: it returns matches without doing much ranking work. If you are trying to verify that retrieval works at all, this is a useful baseline.

5. **collect-training-data** and **collect-second-phase** (training). These profiles are meant for advanced workflows where you collect signals and training data to build or tune your own ranking models.

> **For Advanced Users:** Want to understand the technical details behind these ranking profiles? Learn about phased ranking architecture, LightGBM model integration, tensor operations, and how Vespa scales ranking to billions of documents. See the comprehensive [Ranking Profiles technical guide](https://github.com/vespauniversity/vespa-ragblueprint#ranking-profiles) in the main README, including GitHub folder structure (`vespa_cloud/schemas/doc/*.profile`) and profile inheritance.

**When to use different profiles:**  In daily use, stick with `base-features` for fast, good-enough results. When you care about squeezing out the best possible relevance, switch to `second-with-gbdt` for that query (it can make a big difference on complex questions). And if you are debugging retrieval, `match-only` is a helpful way to confirm that matches are coming back at all.

---

## Add front end UI and feeding pipelines

Now let's install the NyRAG tool from the vespa-ragblueprint repository that handles front end UI and feeding pipelines. NyRAG is the glue that reads documents (local files or websites), splits text into chunks, generates embeddings, feeds the results to Vespa, and then exposes a simple chat UI that answers questions using the retrieved chunks as context.

### Technical Setup

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

# Windows (PowerShell)
# powershell -ExecutionPolicy Bypass
# . .\.venv\Scripts\activate

# Install nyrag locally
uv pip install -e .

# Verify nyrag installation
nyrag --help
```


---

## Configure Your Project and Process Documents

Now you'll configure your project using the web UI to connect to your Vespa Cloud deployment and set up document processing.

**Get an LLM API key**

NyRAG needs an OpenAI-compatible API key so it can generate the final answer after retrieval. If you just want the easiest starting point, OpenRouter works well because it provides access to many models behind a single API.

In this blog, we will use OpenRouter. Feel free to change it to your flavors of LLM in your real application. To continue with the technical setup, please sign up on OpenRouter and obtain an api_key. 

---

**Start the NyRAG UI:**

```bash
# This script handles all configuration automatically
./run_nyrag.sh

# Windows (PowerShell)
# powershell -ExecutionPolicy Bypass
# .\run_nyrag.ps1
```

The `run_nyrag.sh` script starts the UI and wires up the configuration so NyRAG can talk to Vespa Cloud. In practice, it loads your project config, uses the token you provide for authentication, and starts the web UI on port 8000.


Open http://localhost:8000 in your browser.

**Configure your project:**

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

## Chat with Your Data

Once processing is complete, use the NyRAG chat interface to ask questions!

![nyrag_ui](img/nyrag_ui.png)

When you ask a question, NyRAG expands it into a few focused search queries, Vespa runs hybrid retrieval (BM25 + vector similarity), and the best chunks are fused into a small context window. The LLM then generates the final answer using only that retrieved context.

If you want a quick sanity check, ask something broad ("What are the main topics in these documents?") and then follow up with something specific ("Find information about <topic>") to confirm the retrieved chunks are relevant.

**That's it!** You now have a fully functional RAG application.

### Adjusting Search Quality with Ranking Profiles

Want better search results? You can fine-tune how Vespa ranks your documents using the Settings modal (⚙️ icon in the top right).



**How to change ranking profiles:** Open the ⚙️ **Settings** panel, choose a **Ranking Profile** from the dropdown, and click **"Save"**. The very next query you run will use the new profile.

![Settings modal with ranking profile dropdown](img/nyrag_settings_ranking_profiles.png)  
**Description**: Settings modal showing ranking profile selection dropdown with 6 available options

**Pro tip**: The quality difference between `base-features` and `second-with-gbdt` can be dramatic for complex queries. Try both and see which works best for your use case!

---


### Managing Your Data

Need to reset or clean up your data? Open the advanced menu (three-dot icon ⋮ in the top right) and you will find two cleanup actions. **Clear Local Cache** removes cached files for all projects on your machine, which is useful when you want to re-process from scratch locally. **Clear Vespa Data** deletes the indexed documents in Vespa for the project, which is useful when you want a clean index before re-feeding. Both actions ask for confirmation so you do not delete data by accident.

---

## Bonus: Try Web Crawling Mode

Want to create a RAG application from website content instead of local documents? NyRAG supports web crawling!

**How to switch to web crawling mode:**  Select `web_example (web)` from the dropdown at the top and open the configuration editor. If you are currently on the chat screen, open the three-dot menu (⋮) and choose **"Edit Config"** to bring the editor back. From there, update the same credential fields as you did for `doc_example`, then click **"Start Indexing"** to crawl and feed the site.

![Web crawling in progress](img/nyrag_indexing_web_2.png) 
**Description**: Shows web crawling in progress with terminal logs displaying discovered URLs and processed pages

**Web Mode Features:** Web mode discovers and follows links automatically, while still respecting `robots.txt` and crawl delays so you do not hammer a site. It also does smart content extraction to drop navigation and boilerplate, deduplicates very similar pages, and supports resume so you can continue a crawl after interruption.

**Example Use Cases:** Web mode is a good fit for product documentation, knowledge bases, blog archives, help-center content, and technical wikis. In general, it works best on sites with consistent HTML structure and clean, text-heavy pages.

**Tips:** Start small. Crawl a limited part of a site first so you can sanity-check what gets extracted and indexed, then expand. Use `exclude` patterns to skip sections you do not want (for example `/pricing` or `/sales/*`), and keep an eye on the terminal output panel so you can spot loops, unexpected URLs, or pages that fail to parse.


---

## Troubleshooting

Running into issues? We've got you covered! For detailed troubleshooting guides covering Vespa connection errors, LLM configuration, document processing, and more, see the **[Troubleshooting section](https://github.com/vespauniversity/vespa-ragblueprint#troubleshooting)** in the main README.

**Quick help:** If you get stuck, the fastest path is usually to ask in the [Vespa Slack](http://slack.vespa.ai/) community, where people can help you interpret logs and query behavior. If you think you found a bug or want to request an improvement, open an issue in [GitHub Issues](https://github.com/vespauniversity/vespa-ragblueprint/issues). And when you want deeper background on schema, ranking, and deployment, the [Vespa Docs](https://docs.vespa.ai/) are the canonical reference.

---

## Conclusion

**Congratulations!** You now have a working RAG app: a Vespa Cloud deployment that can retrieve high-quality context, and a small UI that lets you ingest data and chat with it.

The main thing you built is a hybrid retrieval setup that combines vector similarity and BM25 text matching, and then ranks results so the LLM sees the best context you can provide. Once it is set up, keeping it current is simply a matter of re-running indexing when you add new documents.

If you want to go deeper, start with the code in the repository and the Vespa tutorials. When you run into questions, the Vespa Slack community is a great place to ask.

Next steps: If you want to keep exploring, start with the repository ([vespa-ragblueprint on GitHub](https://github.com/vespauniversity/vespa-ragblueprint)) and compare it with the original NyRAG project ([NyRAG GitHub](https://github.com/vespaai-playground/NyRAG)) to see what is customized for this blueprint. For a deeper conceptual walkthrough, the Vespa docs tutorial is a great follow-on: [RAG Blueprint Tutorial](https://docs.vespa.ai/en/tutorials/rag-blueprint.html). And if you want help or want to share what you built, join the [Vespa Slack](http://slack.vespa.ai/) community; it is the quickest way to get advice on retrieval, ranking, and deployment details.



