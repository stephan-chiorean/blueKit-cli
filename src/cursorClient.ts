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

  // 3) If neither exists, create the user-level config automatically
  const defaultConfig = {
    mcp: {
      command: 'bluekit-mcp',
      args: [],
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
export async function callCursorTool(
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
      mcpProcess.kill();
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
                mcpProcess.kill();
                reject(new Error(`Initialize failed: ${response.error.message || 'Unknown error'}`));
              }
              return;
            }
            
            // Handle tools/call response
            if (response.id === requestId) {
              clearTimeout(timeout);
              mcpProcess.kill();
              
              if (response.error) {
                reject(new Error(response.error.message || 'MCP error'));
              } else {
                resolve(response.result || response);
              }
              return;
            }
          } catch (e) {
            // Not valid JSON yet, continue accumulating
          }
        }
      }
    });

    // Handle stderr
    mcpProcess.stderr.on('data', (data: Buffer) => {
      // Log stderr for debugging, but don't fail on it
      console.error(`MCP stderr: ${data.toString()}`);
    });

    // Handle process errors
    mcpProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to spawn MCP server: ${err.message}`));
    });

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
