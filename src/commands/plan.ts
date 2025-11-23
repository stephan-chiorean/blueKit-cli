import { Command } from '@oclif/core';
import { callCursorTool } from '../cursorClient';
import { resolveProjectPath } from '../config';

export default class Plan extends Command {
  static description = 'Plan BlueKit kits - analyze directory and build domain tree (no file generation)';

  static examples = [
    '$ bluekit plan',
  ];

  async run() {
    await this.parse(Plan);

    try {
      const projectPath = resolveProjectPath();

      this.log(`Sending planning command for directory: ${projectPath}\n`);

      // Send intent message to Cursor via MCP
      const response = await callCursorTool('bluekit', 'receiveUserCommand', {
        intent: '@bluekit/plan',
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
      this.error(error.message || 'Failed to plan kits', { exit: 1 });
    }
  }
}

