# MCP Resume Context & Memory: Sankarankovil News Publisher Setup

This memory file is designed to be fed to any AI assistant to resume the current conversation and continue debugging immediately.

---

## 1. Project Metadata & URLs
*   **Repository:** [thilakace/mcp-news-server](https://github.com/thilakace/mcp-news-server)
*   **Subdomain:** `mcp-news.nearmespot.in`
*   **Port:** `3001` (Internal Express App port on Lightsail)
*   **Local Project Path:** `C:\Users\ThilagarajaS\.gemini\antigravity\scratch\mcp-news-server`
*   **Remote Project Path:** `/var/www/mcp-news-server`
*   **Local IDE Config Path:** `C:\Users\ThilagarajaS\.gemini\antigravity\scratch\mcp-news-server\.agents\mcp_config.json` (Also configured in global `~/.gemini/config/mcp_config.json`)

---

## 2. Current Status: Where We Left Off
We successfully created, refactored, and deployed a Node.js/TypeScript MCP server that exposes the `publish_article` tool. 

The server is up and running on AWS Lightsail under PM2 (`mcp-news-server`). Visiting `https://mcp-news.nearmespot.in/` correctly returns:
`MCP News Server is running. Connect via /sse`

### The Current Issue:
When trying to toggle the server **On** in the Antigravity Settings, the IDE throws this error:
`Error: calling "initialize": sending "initialize": failed to connect (session ID: ): session not found`

### Server-Side PM2 Logs:
Running `pm2 logs mcp-news-server` during the connection attempt shows:
1. `Received SSE connection request from client.`
2. `SSE session <uuid> successfully connected.`
3. `SSE session <uuid> closed.` *(Immediately after connecting)*

---

## 3. Completed Troubleshooting Actions
1.  **TypeScript build error fixed:** Corrected `server.tool` signature in `src/index.ts` to match the official SDK.
2.  **CORS Added:** Installed `cors` middleware in Express to allow cross-origin requests from IDE webviews/extensions.
3.  **Buffer Disable Header Added:** Sent `X-Accel-Buffering: no` in the Express `/sse` route.
4.  **WebSocket upgrade headers removed:** Instructed the user to check their Nginx virtual host configuration (`/etc/nginx/sites-available/mcp-news.nearmespot.in`) and verify they are not using `proxy_set_header Connection "upgrade"` or `proxy_set_header Upgrade $http_upgrade` in their **HTTPS/443 SSL server block**, as these headers will disrupt standard HTTP Server-Sent Events.

---

## 4. Next Diagnostic Steps (For the Resuming Assistant)
If the connection is still dropping:
1.  **Check Nginx Logs:** Review `/var/log/nginx/error.log` and `/var/log/nginx/access.log` to see what HTTP status codes and disconnect reasons Nginx is recording.
2.  **Check Client Logs:** Open the local Claude/Antigravity logs on the user's Windows machine at `%APPDATA%\Claude\logs\mcp.log` to see the exact error the client receives when attempting to read the SSE stream.
3.  **Validate Keep-Alive/Timeout settings:** If Nginx is timing out or dropping the connection, ensure `proxy_read_timeout 3600s;` is set.
