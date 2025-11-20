# BlueKit CLI

A minimal, MCP-driven command-line interface for BlueKit that forwards commands to the BlueKit MCP Server via Cursor.

## Installation

```bash
npm link
```

## MCP Server Setup

The BlueKit CLI communicates with the BlueKit MCP Server through Cursor's MCP bridge. You can configure the MCP server either globally or per-project.

### Option 1: Per-Project Configuration (Recommended)

Create a `.cursor/mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "bluekit": {
      "command": "node",
      "args": ["path/to/bluekit-mcp-server/index.js"],
      "env": {}
    }
  }
}
```

**How it works:**
- The CLI connects to Cursor's global bridge socket (`~/.cursor/mcp/bridge.sock`)
- The CLI sends the `projectPath` in the request arguments
- Cursor's bridge uses the project's `.cursor/mcp.json` to route to the BlueKit MCP server
- Each project can have its own MCP server configuration

### Option 2: Global Configuration

Alternatively, configure the MCP server globally in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bluekit": {
      "command": "node",
      "args": ["path/to/bluekit-mcp-server/index.js"],
      "env": {}
    }
  }
}
```

**How it works:**
- The MCP server is configured once globally
- Works for all projects
- No need to create `.cursor/mcp.json` in each project

### Requirements

1. **Cursor must be running**: The bridge socket (`~/.cursor/mcp/bridge.sock`) is created by Cursor when it's running
2. **MCP server configured**: Either per-project (`.cursor/mcp.json`) or globally (`~/.cursor/mcp.json`)
3. **Project path**: The CLI automatically detects the current working directory and passes it to the MCP server

### Test the Connection

```bash
bluekit ping
```

If the MCP server is configured correctly, you'll see a success message. If not, you'll see:
```
BlueKit CLI is working!
Note: MCP server unavailable - MCP connection error: connect ENOENT /Users/.../.cursor/mcp/bridge.sock
```

### Important Notes

- **Per-project config**: Create `.cursor/mcp.json` in each project root (Option 1)
- **Global config**: Configure once in `~/.cursor/mcp.json` (Option 2)
- **Cursor must be running**: The bridge socket only exists when Cursor is active
- **Project path detection**: Commands operate on the current working directory (`process.cwd()`)
- **No CLI config needed**: The CLI itself doesn't need any configuration - it just routes requests

## Usage

### `bluekit init`

Initialize a new BlueKit project:

```bash
bluekit init
```

This sends an MCP request to create:
- `bluekit.config.json`
- `kits/` and `values/` directories
- `project.root.md`
- Updates `~/.bluekit/registry.json`
- Notifies desktop app

### `bluekit generate`

Generate kits and root blueprint:

```bash
bluekit generate
bluekit generate --no-root
```

### `bluekit apply`

Apply instructions to generate code:

```bash
bluekit apply
bluekit apply --local
bluekit apply --recursive
```

### `bluekit ping`

Health check:

```bash
bluekit ping
```

## Architecture

The CLI performs **zero** domain logic. All orchestration, scanning, parsing, and code generation is handled by the BlueKit MCP Server. The CLI is only a thin request router that:

1. Detects the project path
2. Calls the MCP server via Cursor's socket (`~/.cursor/mcp/bridge.sock`)
3. Prints the response

## Development

```bash
npm run build
```

## License

MIT

