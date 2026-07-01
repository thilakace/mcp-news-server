# AWS Lightsail Setup & Custom MCP Server: Full Conversation Summary

This document summarizes our full conversation, covering the architectural designs, hosting guides, configurations, custom MCP server codebases, and troubleshooting steps.

---

## 1. Multi-App AWS Lightsail Hosting (Nginx)

We designed a hosting plan to run a **PHP Laravel 8** app, a **Node.js** app, a **Vite.js** static frontend, and a **MySQL** database on a single AWS Lightsail instance.

*   **Instance Recommendation:** Ubuntu 22.04 LTS (minimum 1GB RAM, 2GB recommended).
*   **Swap File Setup:** Configured 2GB swap space to prevent Out Of Memory (OOM) crashes during builds.
*   **MySQL Configuration:** Created databases (`laravel_db`, `node_db`) and local user accounts.
*   **PHP & Node Installation:** Installed PHP 8.1 (for Laravel 8 compatibility) and Node.js v20 LTS.
*   **Nginx Virtual Hosts:** Created server blocks routing traffic by subdomain:
    *   `laravel.example.com` (Laravel root -> `/public` with PHP-FPM socket).
    *   `node.example.com` (Reverse-proxied to `localhost:3000` under PM2).
    *   `vite.example.com` (Served directly from `/dist` static folder).
*   **Security & SSL:** Pointed out the need for Let's Encrypt SSL via Certbot.

---

## 2. DNS, Firewall, & WHOIS Configuration

*   **GoDaddy DNS Management:** Guided the setup of **A Records** pointing `@` and subdomains (`laravel`, `node`, `vite`) to the Lightsail **Static IP**.
*   **Firewall Rules:** Detailed the IPv4 and IPv6 firewall setups. Stressed mirroring rules to open ports `80` (HTTP) and `443` (HTTPS) on both IP stacks for mobile compatibility.
*   **WHOIS Verification:** Explained the ICANN warning banner in GoDaddy and guided the user to verify their contact email to prevent domain suspension.

---

## 3. Custom Node.js MCP Server (`mcp-news-server`)

To automate publishing news articles directly from an AI chat client (like Claude or Antigravity), we built a custom Model Context Protocol (MCP) server.

*   **GitHub Repository Created:** [thilakace/mcp-news-server](https://github.com/thilakace/mcp-news-server)
*   **Local Path:** `C:\Users\ThilagarajaS\.gemini\antigravity\scratch\mcp-news-server`
*   **Features:**
    *   Registers a `publish_article` tool with Zod schema validation.
    *   Supports **MySQL database insertion**, **REST API pushing**, or **local JSON file saving** (testing mode) based on `.env` settings.
    *   Supports both local **stdio transport** and remote **HTTP/SSE transport** for hosted deployments.

---

## 4. Transitioning to Hosted SSE Transport (`mcp-news.nearmespot.in`)

To let Claude connect to this server remotely, we pivoted the MCP server to run as an Express app utilizing `SSEServerTransport` over the web.

*   **Code Refactoring:** Integrated Express, CORS middleware, and a session mapping array to track client SSE requests (`GET /sse` and `POST /messages`).
*   **Nginx SSL Reverse Proxy:** Configured the subdomain `mcp-news.nearmespot.in` on the Lightsail server to proxy to port `3001` with buffering disabled.

---

## 5. Troubleshooting & Debugging

During compilation and deployment, we solved the following:
1.  **TypeScript Build Error (Zod Schema):** Fixed a type mismatch in `server.tool` where the SDK expected a flat Zod schema instead of a nested `parameters: z.object({...})` declaration.
2.  **Failed to Connect (Session Not Found):** Addressed connection drops caused by:
    *   **Nginx Buffering:** Solved by adding `X-Accel-Buffering: no` in Nginx and Express.
    *   **WebSocket Upgrades:** Pointed out that standard WebSocket headers (`Upgrade: upgrade`) disrupt long-lived HTTP SSE streams.
    *   **CORS Blocks:** Added CORS middleware to handle cross-origin client handshakes.

---

## 6. Current Pending Action (Investigation)
*   **Status:** The server is running and responding. However, the SSE session drops immediately after connecting.
*   **Next Diagnostic Step:** Checking the server Nginx logs (`access.log` and `error.log`) and local Claude Desktop client logs (`%APPDATA%\Claude\logs\mcp.log`) to identify the exact disconnection handshake code.
