# PATGROUP Workspace - Copilot Instructions

## Project Overview

Multi-language workspace (Node.js, Python) with simple HTTP server and health check utilities. Focus on minimal dependencies and consistent formatting across all code files.

## Architecture

-   **app/index.js**: Main HTTP server with `/` and `/health` endpoints, configurable via `PORT` env var (default: 3000)
-   **scripts/check.js**: Health check client for `/health` endpoint (used for monitoring)
-   **scripts/check-server.js**: Basic connectivity check for `/` endpoint
-   All modules export server instance for potential testing integration

## Key Workflows

### Running the Server

```bash
npm start  # or node app/index.js
PORT=8080 npm start  # custom port
```

### Debugging

Use VS Code launch configs:

-   "Node: Launch App Server" - Start [app/index.js](../app/index.js) with debugger
-   "Node Launch Current File" - Debug any open JS file
-   "Python: Current File" - Debug open Python files

### Formatting

**Always run before committing:**

```bash
npm run format  # or npx prettier --write .
```

Prettier enforces 4-space indentation (see [.editorconfig](../.editorconfig)). Format-on-save is enabled in workspace settings.

### Health Checks

```bash
# After starting server
node scripts/check.js  # checks /health (exits 0 on success, 2 on failure)
node scripts/check-server.js  # checks / endpoint
```

## Code Conventions

### HTTP Response Pattern

Both server endpoints follow this structure:

```javascript
if (req.url === "/endpoint") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
} else {
    res.writeHead(404);
    res.end("Not Found");
}
```

### PORT Configuration

All Node scripts use: `process.env.PORT || 3000` for consistency

### Exit Codes (Check Scripts)

-   0: Success
-   2: Unexpected response
-   3: Network/connection error

## File Organization

-   **app/**: Application entry points
-   **scripts/**: Utility scripts (health checks, validation)
-   **.vscode/**: Shared team configuration (settings, launch configs, tasks)

## VS Code Configuration

-   Format on save enabled (Prettier)
-   Trailing whitespace auto-trimmed
-   Final newline auto-inserted
-   GitLens current line enabled for Git context

## Branch Protection

Repository uses branch protection ([branch-protection.json](../branch-protection.json)):

-   Requires 1 approval for PRs
-   Dismisses stale reviews
-   Admin enforcement enabled
