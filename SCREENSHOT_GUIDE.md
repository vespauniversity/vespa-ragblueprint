# Screenshot Guide for Documentation Updates

This guide lists all screenshots needed to complete the documentation updates for UI-based configuration.

**Note:** Vespa CLI installation has been removed from the main tutorial steps. It's now shown only in the "Behind the Scenes" section as an optional advanced feature for direct querying.

## Screenshots Needed

### 1. Project Selector Dropdown
**Filename**: `blog/img/nyrag_project_selector.png`

**When to take**:
- Open NyRAG UI at http://localhost:8000
- Click on the project dropdown menu in the header (next to the NyRAG logo)
- Show the dropdown expanded with "doc_example" visible

**What to show**:
- The project dropdown menu open
- "doc_example" option highlighted or visible in the list
- Clear view of the header area

**Used in**: blog/README.md - Step 3.3, Step 1

---

### 2. Advanced Menu with Edit Config Option
**Filename**: `blog/img/nyrag_edit_config_menu.png`

**When to take**:
- Click the three-dot menu button (⋮) in the top right corner of the header
- Show the dropdown menu that appears

**What to show**:
- The advanced menu dropdown expanded
- "Edit Config" option clearly visible and highlighted
- Context showing it's in the top right area of the UI

**Used in**: blog/README.md - Step 3.3, Step 2

---

### 3. Configuration Editor Panel (Empty/Default)
**Filename**: `blog/img/nyrag_config_editor.png`

**When to take**:
- After clicking "Edit Config"
- Show the configuration editor panel that appears

**What to show**:
- The interactive YAML configuration editor panel
- The editor showing the default/example configuration
- Any save/close buttons visible
- The "Project Configuration" header
- The terminal output panel below (if visible)

**Used in**: blog/README.md - Step 3.3, Step 3

---

### 4. Start Indexing Button and UI
**Filename**: `blog/img/nyrag_start_indexing.png`

**When to take**:
- Configuration panel visible or closed
- Show the main UI with the "Start Indexing" button

**What to show**:
- The "Start Indexing" button clearly visible
- The "Resume from existing data" checkbox option
- The terminal output panel
- Any status indicators

**Used in**: blog/README.md - Step 3.3, Step 4

---

### 5. Processing Progress with Terminal Logs
**Filename**: `blog/img/nyrag_processing_progress.png`

**When to take**:
- While documents are being processed (after clicking "Start Indexing")
- Wait for some processing logs to appear

**What to show**:
- Terminal output panel showing processing progress
- Log messages showing documents being processed
- Progress indicators (if any)
- Status showing "Processing" or similar

**Used in**: blog/README.md - Step 3.3, Step 4

---

### 6. Web Crawling Configuration
**Filename**: `blog/img/nyrag_web_config.png`

**When to take**:
- Open the configuration editor
- Show configuration set to web mode

**What to show**:
- Configuration editor with `mode: web` setting
- `start_loc` set to a URL (e.g., https://docs.vespa.ai/)
- `crawl_params` section visible
- Example of web crawling configuration

**Used in**: blog/README.md - Bonus section

---

### 7. Web Crawling in Progress
**Filename**: `blog/img/nyrag_web_crawling.png`

**When to take**:
- While web crawling is active
- Terminal logs showing URLs being discovered and processed

**What to show**:
- Terminal output with web crawling logs
- URLs being discovered and processed
- Crawling progress indicators
- Any status messages about pages crawled

**Used in**: blog/README.md - Bonus section

---

## Screenshot Checklist

- [ ] `blog/img/nyrag_project_selector.png` - Project dropdown
- [ ] `blog/img/nyrag_edit_config_menu.png` - Edit Config menu option
- [ ] `blog/img/nyrag_config_editor.png` - Configuration editor panel
- [ ] `blog/img/nyrag_start_indexing.png` - Start Indexing button and UI
- [ ] `blog/img/nyrag_processing_progress.png` - Processing with terminal logs
- [ ] `blog/img/nyrag_web_config.png` - Web crawling configuration
- [ ] `blog/img/nyrag_web_crawling.png` - Web crawling in progress

---

## Notes

- Make sure all screenshots are taken at a consistent resolution
- Capture enough context around each element so users can orient themselves
- Use a clean browser window without clutter
- If possible, use sample data that looks realistic but doesn't contain sensitive information
- Consider highlighting or annotating key elements if needed

## After Taking Screenshots

1. Save each screenshot with the exact filename listed above
2. Place them in the `blog/img/` directory
3. Replace the placeholder text in `blog/README.md` with the actual image markdown: `![Description](img/filename.png)`
4. Test that all images load correctly in the rendered markdown
