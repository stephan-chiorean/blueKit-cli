import { Command, Flags } from '@oclif/core';
import * as readline from 'readline';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { callMcpTool } from '../mcpClient';
import { resolveProjectPath } from '../config';

export default class Init extends Command {
  static description = 'Initialize a BlueKit project - adds project to BlueKit registry';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  private async promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });
  }

  async run() {
    const { flags } = await this.parse(Init);
    
    try {
      const projectPath = resolveProjectPath();
      const bluekitDir = path.join(os.homedir(), '.bluekit');
      
      // Check if ~/.bluekit directory exists, prompt if not
      if (!fs.existsSync(bluekitDir)) {
        const answer = await this.promptUser(
          `\nThe BlueKit store directory (~/.bluekit) does not exist.\n` +
          `Do you want to create it? (yes/no): `
        );
        
        if (answer === 'yes' || answer === 'y') {
          fs.mkdirSync(bluekitDir, { recursive: true });
          this.log(`✅ Created BlueKit store directory at ${bluekitDir}\n`);
        } else {
          this.log('\nOperation cancelled. BlueKit store directory is required.');
          this.exit(0);
        }
      }
      
      this.log(`Initializing BlueKit project at: ${projectPath}`);
      
      const response = await callMcpTool('bluekit', 'init_project', {
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

