import { Command, Flags } from '@oclif/core';
import { callCursorTool } from '../cursorClient';
import { resolveProjectPath } from '../config';

export default class Generate extends Command {
  static description = 'Generate kits and root blueprint';

  static flags = {
    help: Flags.help({ char: 'h' }),
    'no-root': Flags.boolean({
      description: 'Skip root blueprint creation',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(Generate);
    
    try {
      const projectPath = resolveProjectPath();
      
      const mcpFlags: any = {};
      if (flags['no-root']) {
        mcpFlags.noRoot = true;
      }
      
      this.log(`Generating kits for project: ${projectPath}`);
      
      const response = await callCursorTool('bluekit', 'generate_kits', {
        projectPath,
        flags: mcpFlags,
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
      this.error(error.message || 'Failed to generate kits', { exit: 1 });
    }
  }
}

