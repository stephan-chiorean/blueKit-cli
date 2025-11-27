import { Command } from '@oclif/core';
import { callMcpTool } from '../mcpClient';
import { resolveProjectPath } from '../config';

export default class Generate extends Command {
  static description = 'Generate BlueKit kits - plan + create all kits for this directory';

  static examples = [
    '$ bluekit generate',
  ];

  async run() {
    await this.parse(Generate);
    
    try {
      const projectPath = resolveProjectPath();

      this.log(`Sending generation command for directory: ${projectPath}\n`);

      // Send intent message to MCP server
      const response = await callMcpTool('bluekit', 'receiveUserCommand', {
        intent: '@bluekit/generate',
        cwd: projectPath,
      });

      // Display response
      if (response && typeof response === 'object') {
        if (Array.isArray(response.content)) {
          response.content.forEach((item: any) => {
            if (item.type === 'text') {
              this.log(item.text);
            }
          });
        } else if (response.message) {
          this.log(response.message);
        } else {
          this.log(JSON.stringify(response, null, 2));
        }
      } else if (typeof response === 'string') {
        this.log(response);
      }
    } catch (error: any) {
      this.error(error.message || 'Failed to generate kits', { exit: 1 });
    }
  }
}

