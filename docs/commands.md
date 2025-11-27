# BlueKit CLI Commands

Complete reference for all BlueKit CLI commands and their variations.

## Overview

The BlueKit CLI is a minimal, MCP-driven interface that forwards commands to the BlueKit MCP Server. All domain logic is handled by the MCP server; the CLI only routes requests and prints responses.

---

## `bluekit init`

Initialize a new BlueKit project in the current directory.

### Usage

```bash
bluekit init
bluekit init --help
bluekit init -h
```

### Description

Sends an MCP request to initialize a BlueKit project. The MCP server will:

- Create `bluekit.config.json`
- Create `kits/` and `values/` directories
- Create `project.root.md`
- Update `~/.bluekit/registry.json`
- Notify desktop app

### Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help information |

### Examples

```bash
# Initialize a project in the current directory
bluekit init

# Show help
bluekit init --help
```

### MCP Request

```typescript
callMcpTool("bluekit", "init_project", { projectPath })
```

---

## `bluekit generate`

Generate kits and root blueprint for the current project.

### Usage

```bash
bluekit generate
bluekit generate --no-root
bluekit generate --help
bluekit generate -h
```

### Description

Sends an MCP request to generate kits and optionally create a root blueprint. The MCP server handles:

- Kit generation
- Optional root blueprint creation
- Semantic analysis
- Interactive questioning if needed

### Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--no-root` | - | Skip root blueprint creation | `false` |
| `--help` | `-h` | Show help information | - |

### Examples

```bash
# Generate kits and root blueprint
bluekit generate

# Generate kits only (skip root blueprint)
bluekit generate --no-root

# Show help
bluekit generate --help
```

### MCP Request

```typescript
callMcpTool("bluekit", "generate_kits", { projectPath, flags })
```

Where `flags` may include:
- `noRoot: true` (when `--no-root` is used)

---

## `bluekit apply`

Apply instructions to generate code for the current project.

### Usage

```bash
bluekit apply
bluekit apply --local
bluekit apply --recursive
bluekit apply --local --recursive
bluekit apply --help
bluekit apply -h
```

### Description

Sends an MCP request to apply instructions and generate code. The MCP server handles:

- Scanning for kits, root, values
- Dependency graph construction
- Values/locals merging
- Interactive multi-step questioning
- Generating final plan
- Generating code

### Flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--local` | - | Use local values only | `false` |
| `--recursive` | - | Apply recursively | `false` |
| `--help` | `-h` | Show help information | - |

### Examples

```bash
# Apply instructions with default behavior
bluekit apply

# Apply using only local values
bluekit apply --local

# Apply recursively
bluekit apply --recursive

# Apply with both local values and recursive mode
bluekit apply --local --recursive

# Show help
bluekit apply --help
```

### MCP Request

```typescript
callMcpTool("bluekit", "apply_instructions", { projectPath, flags })
```

Where `flags` may include:
- `local: true` (when `--local` is used)
- `recursive: true` (when `--recursive` is used)

---

## `bluekit ping`

Health check for the BlueKit CLI and MCP server connection.

### Usage

```bash
bluekit ping
bluekit ping --help
bluekit ping -h
```

### Description

Performs a health check by attempting to connect to the BlueKit MCP server. If the MCP server is unavailable, it will still report that the CLI is working but note the connection issue.

### Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help information |

### Examples

```bash
# Check CLI and MCP server health
bluekit ping

# Show help
bluekit ping --help
```

### Behavior

- If MCP server is available: Prints the MCP server response
- If MCP server is unavailable: Prints "BlueKit CLI is working!" with a note about the connection error

### MCP Request

```typescript
callMcpTool("bluekit", "ping", {})
```

---

## Global Help

Get help for any command or see all available commands:

```bash
# Show all commands
bluekit --help
bluekit -h

# Show help for a specific command
bluekit <command> --help
bluekit <command> -h
```

---

## Command Summary

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `init` | Initialize a new BlueKit project | None |
| `generate` | Generate kits and root blueprint | `--no-root` |
| `apply` | Apply instructions to generate code | `--local`, `--recursive` |
| `ping` | Health check | None |

---

## Notes

- All commands operate on the current working directory (`process.cwd()`)
- All domain logic is handled by the BlueKit MCP Server
- The CLI only routes requests and prints responses
- MCP communication happens by spawning the MCP server process and communicating via stdio JSON-RPC
- Commands will fail if the MCP server is not found or cannot be started (except `ping`, which gracefully handles this)

