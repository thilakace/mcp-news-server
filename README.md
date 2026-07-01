# MCP News Server

A Model Context Protocol (MCP) server written in Node.js / TypeScript that registers a `publish_article` tool. It enables AI coding assistants (like Antigravity or Claude Desktop) to publish search results, news, or articles directly onto your website database or REST API endpoint.

---

## Features
*   **Flexible Routing:** Can publish directly to a **MySQL database**, send a POST request to a **REST API**, or save to a local **JSON file** (fallback for testing).
*   **Automatic Slugs:** Generates SEO-friendly URLs/slugs automatically from the article title.
*   **Zod Schemas:** Standard, type-safe request payload validation.
*   **Model Context Protocol Compliant:** Communicates over stdio transport.

---

## Installation & Setup

### 1. Clone & Build
Ensure you have Node.js (v18+) and npm installed:
```bash
# Clone the repository
git clone https://github.com/thilakace/mcp-news-server.git
cd mcp-news-server

# Install dependencies
npm install

# Compile TypeScript
npm run build
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your details:
*   To insert into a database, complete the `DB_*` parameters.
*   To push via REST API, specify the `API_ENDPOINT` and `API_BEARER_TOKEN`.
*   If both are left empty, it runs in **Testing Mode** and saves articles to `local_articles.json`.

---

## Registering in your AI Client / IDE

To let your AI assistant use this tool, add the server configuration to your MCP settings.

### In Gemini Antigravity (or Cline/Roo-Code/Windsurf)
Add the server configuration to your global or project `mcp_config.json`:

```json
{
  "mcpServers": {
    "mcp-news-server": {
      "command": "node",
      "args": ["C:/Users/ThilagarajaS/.gemini/antigravity/scratch/mcp-news-server/build/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_USER": "db_user",
        "DB_PASSWORD": "YourStrongPassword123!",
        "DB_NAME": "laravel_db"
      }
    }
  }
}
```
*(Make sure to update the absolute path to point to your `build/index.js` file).*

---

## Tool API Reference

### `publish_article`
Publishes a news article directly to your platform.

#### Parameters:
*   `title` (string, required): The headline/title of the news article.
*   `summary` (string, required): A brief 1-2 sentence summary of the news.
*   `content` (string, required): The complete body copy/text of the article.
*   `category` (string, required): The news section/category (e.g. Local Festivals, Infrastructure, Sports).
*   `tags` (array of strings, required): Related tags or keywords for SEO classification.

---

## License
MIT
