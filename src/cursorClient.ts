import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

const SOCKET_PATH = path.join(os.homedir(), '.cursor', 'mcp', 'bridge.sock');

/**
 * Call a Cursor MCP tool via JSON-RPC over Unix socket
 */
export async function callCursorTool(
  server: string,
  tool: string,
  args: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(SOCKET_PATH);

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('MCP request timeout'));
    }, 30000); // 30 second timeout

    let buffer = '';

    client.on('connect', () => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: `${server}/${tool}`,
          arguments: args,
        },
      };

      client.write(JSON.stringify(request) + '\n');
    });

    client.on('data', (data) => {
      buffer += data.toString();
      
      // Try to parse complete JSON responses
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.id) {
              clearTimeout(timeout);
              client.destroy();
              
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

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`MCP connection error: ${err.message}`));
    });

    client.on('end', () => {
      clearTimeout(timeout);
      if (buffer.trim()) {
        try {
          const response = JSON.parse(buffer);
          if (response.error) {
            reject(new Error(response.error.message || 'MCP error'));
          } else {
            resolve(response.result || response);
          }
        } catch (e) {
          reject(new Error('Invalid MCP response'));
        }
      } else {
        reject(new Error('MCP connection closed unexpectedly'));
      }
    });
  });
}

