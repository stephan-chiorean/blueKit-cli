import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface McpServerConfig {
  command: string;
  args: string[];
  cwd?: string;
}

/**
 * Get MCP server configuration, checking project-level bluekit.config.json first,
 * then falling back to ~/.bluekit/config.json
 */
function getMcpServerConfig(projectRoot: string = process.cwd()): McpServerConfig {
  const projectConfigPath = path.join(projectRoot, 'bluekit.config.json');
  const userConfigPath = path.join(os.homedir(), '.bluekit', 'config.json');

  // 1) Try project-level config first
  if (fs.existsSync(projectConfigPath)) {
    try {
      const configContent = fs.readFileSync(projectConfigPath, 'utf-8');
      const config = JSON.parse(configContent);
      if (!config.mcp) {
        throw new Error(`Missing 'mcp' entry in ${projectConfigPath}`);
      }
      return config.mcp;
    } catch (error: any) {
      throw new Error(`Failed to load config from ${projectConfigPath}: ${error.message}`);
    }
  }

  // 2) Try global ~/.bluekit/config.json
  if (fs.existsSync(userConfigPath)) {
    try {
      const configContent = fs.readFileSync(userConfigPath, 'utf-8');
      const config = JSON.parse(configContent);
      if (!config.mcp) {
        throw new Error(`Missing 'mcp' entry in ${userConfigPath}`);
      }
      return config.mcp;
    } catch (error: any) {
      throw new Error(`Failed to load config from ${userConfigPath}: ${error.message}`);
    }
  }

  // 3) If neither exists, try to find the MCP server and create config automatically
  // Try to find the MCP server in common locations
  const possibleMcpPaths = [
    // If CLI is in a monorepo, MCP server might be at ../blueKitMcp/dist/main.js (from CLI dist/)
    path.resolve(__dirname, '../../blueKitMcp/dist/main.js'),
    // If CLI is in a monorepo, MCP server might be at ../../blueKitMcp/dist/main.js (from CLI src/)
    path.resolve(__dirname, '../../../blueKitMcp/dist/main.js'),
    // If installed globally, might be in node_modules
    path.resolve(__dirname, '../../node_modules/bluekit-mcp-server/dist/main.js'),
    // Try relative to project root (where user runs the command)
    path.resolve(projectRoot, '../blueKitMcp/dist/main.js'),
    // Try in node_modules relative to project
    path.resolve(projectRoot, 'node_modules/bluekit-mcp-server/dist/main.js'),
    // Try absolute path from workspace root (if we can detect it)
    path.resolve(projectRoot, '../../blueKitMcp/dist/main.js'),
  ];

  let mcpServerPath: string | null = null;
  for (const mcpPath of possibleMcpPaths) {
    if (fs.existsSync(mcpPath)) {
      mcpServerPath = mcpPath;
      break;
    }
  }

  if (!mcpServerPath) {
    throw new Error(
      `Could not find BlueKit MCP server. Please create a config file at ${userConfigPath} or ${projectConfigPath} with:\n` +
      `{\n` +
      `  "mcp": {\n` +
      `    "command": "node",\n` +
      `    "args": ["/absolute/path/to/blueKitMcp/dist/main.js"]\n` +
      `  }\n` +
      `}\n` +
      `\nOr build the MCP server first: cd blueKitMcp && npm run build`
    );
  }

  const defaultConfig = {
    mcp: {
      command: 'node',
      args: [mcpServerPath],
    },
  };

  fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
  fs.writeFileSync(userConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  return defaultConfig.mcp;
}

/**
 * Call a BlueKit MCP tool by spawning the MCP server directly
 * and communicating via stdio JSON-RPC
 */
export async function callMcpTool(
  server: string,
  tool: string,
  args: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    // Get MCP server configuration
    let mcpConfig: McpServerConfig;
    try {
      mcpConfig = getMcpServerConfig();
    } catch (error: any) {
      reject(new Error(`Failed to load MCP server config: ${error.message}`));
      return;
    }
    
    // Spawn the MCP server process using config
    const spawnOptions: any = {
      stdio: ['pipe', 'pipe', 'pipe'],
    };
    
    if (mcpConfig.cwd) {
      spawnOptions.cwd = mcpConfig.cwd;
    }
    
    const mcpProcess = spawn(mcpConfig.command, mcpConfig.args, spawnOptions);

    let stdoutBuffer = '';
    let requestId: number | null = null;
    let initialized = false;

    const timeout = setTimeout(() => {
      // Properly cleanup on timeout
      if (mcpProcess.stdin && !mcpProcess.stdin.destroyed) {
        mcpProcess.stdin.end();
      }
      setTimeout(() => {
        if (!mcpProcess.killed) {
          mcpProcess.kill();
        }
      }, 100);
      reject(new Error('MCP request timeout'));
    }, 30000); // 30 second timeout

    // Handle stdout (server responses)
    mcpProcess.stdout.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString();
      
      // Process complete JSON-RPC messages (one per line)
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            
            // Handle initialize response (id: 1 is our initialize request)
            if (response.id === 1 && !initialized) {
              if (response.result) {
                initialized = true;
                // Now send the tools/call request
                sendToolCall(mcpProcess, server, tool, args);
              } else if (response.error) {
                clearTimeout(timeout);
                // Properly cleanup on error
                if (mcpProcess.stdin && !mcpProcess.stdin.destroyed) {
                  mcpProcess.stdin.end();
                }
                setTimeout(() => {
                  if (!mcpProcess.killed) {
                    mcpProcess.kill();
                  }
                }, 100);
                reject(new Error(`Initialize failed: ${response.error.message || 'Unknown error'}`));
              }
              return;
            }
            
            // Handle tools/call response
            if (response.id === requestId) {
              clearTimeout(timeout);
              
              // Resolve/reject first
              if (response.error) {
                reject(new Error(response.error.message || 'MCP error'));
              } else {
                resolve(response.result || response);
              }
              
              // Then cleanup after a delay to allow any pending writes to complete
              // The MCP server might try to send notifications or final messages
              setTimeout(() => {
                if (mcpProcess.stdin && !mcpProcess.stdin.destroyed) {
                  mcpProcess.stdin.end();
                }
                // Give process time to finish writing and exit naturally
                // Only kill if it's still running after a reasonable delay
                setTimeout(() => {
                  if (!mcpProcess.killed && mcpProcess.exitCode === null) {
                    // Process is still running, force kill
                    mcpProcess.kill('SIGTERM');
                    // If still not dead after another delay, force kill
                    setTimeout(() => {
                      if (!mcpProcess.killed && mcpProcess.exitCode === null) {
                        mcpProcess.kill('SIGKILL');
                      }
                    }, 500);
                  }
                }, 300);
              }, 100); // Delay before closing stdin to allow pending writes
              
              return;
            }
          } catch (e) {
            // Not valid JSON yet, continue accumulating
          }
        }
      }
    });

    // Handle stdout errors (EPIPE is expected when closing)
    mcpProcess.stdout.on('error', (err: any) => {
      // Ignore EPIPE errors - they're expected when closing the stream
      if (err.code !== 'EPIPE') {
        console.error(`MCP stdout error: ${err.message}`);
      }
    });

    // Handle stderr
    mcpProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      // Filter out EPIPE errors - they're expected when closing streams
      if (!message.includes('EPIPE') && !message.includes('write EPIPE')) {
        // Log stderr for debugging, but don't fail on it
        console.error(`MCP stderr: ${message}`);
      }
    });

    // Handle stderr errors (EPIPE is expected when closing)
    mcpProcess.stderr.on('error', (err: any) => {
      // Ignore EPIPE errors - they're expected when closing the stream
      if (err.code !== 'EPIPE') {
        console.error(`MCP stderr error: ${err.message}`);
      }
    });

    // Handle process errors (but ignore EPIPE which is expected when closing)
    mcpProcess.on('error', (err: any) => {
      // Ignore EPIPE errors - they happen when we close stdin while server is writing
      if (err.code === 'EPIPE') {
        return;
      }
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn MCP server: ${err.message}`));
    });

    // Handle process exit - ignore errors on exit as they're often EPIPE
    mcpProcess.on('exit', (code, signal) => {
      // Process exited, cleanup timeout if still active
      clearTimeout(timeout);
    });

    // Handle stdin errors gracefully (EPIPE is expected when closing)
    if (mcpProcess.stdin) {
      mcpProcess.stdin.on('error', (err: any) => {
        // Ignore EPIPE errors - they're expected when closing the stream
        if (err.code !== 'EPIPE') {
          console.error(`MCP stdin error: ${err.message}`);
        }
      });
    }

    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'bluekit-cli',
          version: '0.1.0',
        },
      },
    };

    if (!mcpProcess.stdin) {
      clearTimeout(timeout);
      reject(new Error('Failed to get stdin for MCP server'));
      return;
    }

    mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    // Function to send the tool call after initialization
    function sendToolCall(process: ChildProcess, server: string, tool: string, args: any) {
      if (!process.stdin) {
        reject(new Error('Failed to get stdin for MCP server'));
        return;
      }

      requestId = Date.now();
      const toolCallRequest = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: `${server}.${tool}`,
          arguments: args,
        },
      };

      process.stdin.write(JSON.stringify(toolCallRequest) + '\n');
    }
  });
}

