import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// Path to the MCP server project
const MCP_SERVER_PATH = '/Users/stephanchiorean/Documents/projects/blueKitApps/blueKitMcp';

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
    // Spawn the MCP server process
    const mcpProcess = spawn('npx', ['tsx', 'src/main.ts'], {
      cwd: MCP_SERVER_PATH,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

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
