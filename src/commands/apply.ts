import { Command, Flags } from '@oclif/core';
import { callCursorTool } from '../cursorClient';
import { resolveProjectPath } from '../config';

export default class Apply extends Command {
  static description = 'Apply instructions to generate code';

  static flags = {
    help: Flags.help({ char: 'h' }),
    local: Flags.boolean({
      description: 'Use local values only',
      default: false,
    }),
    recursive: Flags.boolean({
      description: 'Apply recursively',
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(Apply);
    
    try {
      const projectPath = resolveProjectPath();
      
      const mcpFlags: any = {};
      if (flags.local) {
        mcpFlags.local = true;
      }
      if (flags.recursive) {
        mcpFlags.recursive = true;
      }
      
      this.log(`Applying instructions for project: ${projectPath}`);
      
      const response = await callCursorTool('bluekit', 'apply_instructions', {
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
      this.error(error.message || 'Failed to apply instructions', { exit: 1 });
    }
  }
}

