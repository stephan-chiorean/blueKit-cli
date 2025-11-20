import { Command, Flags } from '@oclif/core';
import { callCursorTool } from '../cursorClient';
import { resolveProjectPath } from '../config';

export default class Init extends Command {
  static description = 'Initialize a BlueKit project';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  async run() {
    const { flags } = await this.parse(Init);
    
    try {
      const projectPath = resolveProjectPath();
      
      this.log(`Initializing BlueKit project at: ${projectPath}`);
      
      const response = await callCursorTool('bluekit', 'init_project', {
        projectPath,
      });
      
      // Print whatever the MCP returns
      if (typeof response === 'string') {
        this.log(response);
      } else if (response && response.message) {
        this.log(response.message);
        if (response.data) {
          this.log(JSON.stringify(response.data, null, 2));
        }
      } else {
        this.log(JSON.stringify(response, null, 2));
      }
    } catch (error: any) {
      this.error(error.message || 'Failed to initialize project', { exit: 1 });
    }
  }
}

