#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the MCP Server
const server = new McpServer({
  name: "mcp-news-server",
  version: "1.0.0",
});

// Helper: Insert article into MySQL database
async function insertIntoDatabase(article: {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
}) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const query = `
      INSERT INTO articles (title, slug, summary, content, category, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const tagsJson = JSON.stringify(article.tags);
    const [result] = await connection.execute(query, [
      article.title,
      slug,
      article.summary,
      article.content,
      article.category,
      tagsJson,
    ]);

    return { success: true, result };
  } finally {
    await connection.end();
  }
}

// Helper: Push article to REST API Endpoint
async function pushToApiEndpoint(article: {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
}) {
  const endpoint = process.env.API_ENDPOINT || "";
  const token = process.env.API_BEARER_TOKEN || "";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(article),
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

// Helper: Mock insertion by saving to a local JSON file (Fallback/Testing mode)
async function saveToLocalJson(article: {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
}) {
  const filePath = path.join(__dirname, "..", "local_articles.json");
  let articles = [];

  try {
    const data = await fs.readFile(filePath, "utf-8");
    articles = JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, start with empty array
  }

  const newArticle = {
    id: `art-${Date.now()}`,
    ...article,
    slug: article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, ""),
    created_at: new Date().toISOString(),
  };

  articles.push(newArticle);
  await fs.writeFile(filePath, JSON.stringify(articles, null, 2), "utf-8");

  return { success: true, filePath, articleId: newArticle.id };
}

// Register the publish_article tool
server.tool(
  "publish_article",
  "Publishes a news article directly to the website. Automatically routes to database, API, or local JSON based on environment configuration.",
  {
    title: z.string().describe("The headline/title of the news article"),
    summary: z.string().describe("A brief 1-2 sentence summary of the news"),
    content: z.string().describe("The complete body copy/text of the article"),
    category: z.string().describe("The news section/category (e.g. Local Festivals, Infrastructure, Sports)"),
    tags: z.array(z.string()).describe("Related tags or keywords for SEO classification"),
  },
  async ({ title, summary, content, category, tags }) => {
    const articlePayload = { title, summary, content, category, tags };

    try {
      // 1. Route to MySQL if configured
      if (process.env.DB_USER && process.env.DB_NAME) {
        const dbResult = await insertIntoDatabase(articlePayload);
        return {
          content: [
            {
              type: "text",
              text: `✅ Article successfully inserted into MySQL database!\nTitle: "${title}"`,
            },
          ],
        };
      }

      // 2. Route to REST API if configured
      if (process.env.API_ENDPOINT) {
        const apiResult = await pushToApiEndpoint(articlePayload);
        return {
          content: [
            {
              type: "text",
              text: `✅ Article successfully pushed to API Endpoint!\nResponse: ${JSON.stringify(apiResult)}`,
            },
          ],
        };
      }

      // 3. Fallback: Save to local JSON file (useful for initial local testing)
      const localResult = await saveToLocalJson(articlePayload);
      return {
        content: [
          {
            type: "text",
            text: `ℹ️ [Testing Mode] No database or API credentials found in .env.\nSaved article locally to: ${localResult.filePath}\nArticle ID: ${localResult.articleId}\nTitle: "${title}"`,
          },
        ],
      };
    } catch (error: any) {
      console.error("Publish tool error details:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `❌ Failed to publish article: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Map to hold active SSE transport sessions
const activeTransports: { [sessionId: string]: SSEServerTransport } = {};

// Start the server
async function main() {
  // Check if stdio flag is passed
  if (process.argv.includes("--stdio")) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP News Server running on stdio transport...");
  } else {
    // Start Express HTTP + SSE server
    const app = express();
    app.use(express.json());

    // Root endpoint for verification
    app.get("/", (req, res) => {
      res.send("MCP News Server is running. Connect via /sse");
    });

    // GET /sse: Establish SSE connection
    app.get("/sse", async (req, res) => {
      console.error(`Received SSE connection request from client.`);
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Cache-Control', 'no-cache');
      const transport = new SSEServerTransport("/messages", res);
      activeTransports[transport.sessionId] = transport;

      res.on("close", () => {
        console.error(`SSE session ${transport.sessionId} closed.`);
        delete activeTransports[transport.sessionId];
      });

      await server.connect(transport);
      console.error(`SSE session ${transport.sessionId} successfully connected.`);
    });

    // POST /messages: Handle incoming JSON-RPC requests
    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = activeTransports[sessionId];

      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        console.error(`Message received for unknown session: ${sessionId}`);
        res.status(400).send("No active session found for session ID");
      }
    });

    const port = parseInt(process.env.PORT || "3001", 10);
    app.listen(port, () => {
      console.log(`MCP News Server running on HTTP/SSE at http://localhost:${port}`);
      console.log(`- Connection URL: http://localhost:${port}/sse`);
      console.log(`- Message URL: http://localhost:${port}/messages`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
