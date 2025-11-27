# BlueKit CLI

A minimal, MCP-driven command-line interface for BlueKit that forwards commands to the BlueKit MCP Server.

## Installation

```bash
npm link
```

## MCP Server Setup

The BlueKit CLI communicates directly with the BlueKit MCP Server by spawning it as a subprocess and communicating via stdio JSON-RPC.

### Configuration

The CLI automatically finds the MCP server by checking:

1. **Project-level config**: `bluekit.config.json` in your project root:
```json
{
  "mcp": {
    "command": "node",
    "args": ["/path/to/blueKitMcp/dist/main.js"]
  }
}
```

2. **Global config**: `~/.bluekit/config.json`:
```json
{
  "mcp": {
    "command": "node",
    "args": ["/path/to/blueKitMcp/dist/main.js"]
  }
}
```

3. **Auto-discovery**: If no config exists, the CLI will search common locations and create a config automatically.

### Requirements

1. **MCP server built**: The MCP server must be built (`cd blueKitMcp && npm run build`)
2. **Project path**: The CLI automatically detects the current working directory and passes it to the MCP server

### Test the Connection

```bash
bluekit ping
```

If the MCP server is configured correctly, you'll see a success message.

### Important Notes

- **Project path detection**: Commands operate on the current working directory (`process.cwd()`)
- **Auto-config**: The CLI will automatically create a config file if it can find the MCP server

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
2. Spawns the MCP server process and communicates via stdio JSON-RPC
3. Prints the response

## Development

```bash
npm run build
```

## License

MIT

