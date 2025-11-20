# BlueKit CLI

A minimal, MCP-driven command-line interface for BlueKit that forwards commands to the BlueKit MCP Server via Cursor.

## Installation

```bash
npm link
```

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

