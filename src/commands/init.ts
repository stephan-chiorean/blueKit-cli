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

  private logBox(message: string, icon: string = '│') {
    this.log(`│  ${icon} ${message}`);
  }

  private logHeader() {
    this.log('\n┌  BlueKit CLI 🚀\n│');
  }

  private logFooter(success: boolean = true) {
    if (success) {
      this.log('└  🎉 Done!\n');
    } else {
      this.log('└  ❌ Failed\n');
    }
  }

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
      this.logHeader();
      
      const projectPath = resolveProjectPath();
      const bluekitDir = path.join(os.homedir(), '.bluekit');
      
      // Check if ~/.bluekit directory exists, prompt if not
      if (!fs.existsSync(bluekitDir)) {
        this.logBox('BlueKit store directory (~/.bluekit) not found', '●');
        this.log('│');
        const answer = await this.promptUser(
          `│  Do you want to create it? (yes/no): `
        );
        
        if (answer === 'yes' || answer === 'y') {
          fs.mkdirSync(bluekitDir, { recursive: true });
          this.logBox(`Created BlueKit store at ${bluekitDir}`, '✓');
        } else {
          this.logBox('Operation cancelled', '✗');
          this.logFooter(false);
          this.exit(0);
        }
      }
      
      this.logBox(`Initializing project at: ${projectPath}`, '●');
      this.log('│');
      this.logBox('Writing project configuration', '◇');
      
      const response = await callMcpTool('bluekit', 'init_project', {
        projectPath,
      });
      
      // Print whatever the MCP returns
      if (typeof response === 'string') {
        this.logBox(response, '│');
      } else if (response && response.message) {
        this.logBox(response.message, '│');
        if (response.data) {
          this.logBox(JSON.stringify(response.data, null, 2), '│');
        }
      } else {
        this.logBox(JSON.stringify(response, null, 2), '│');
      }
      
      this.logFooter(true);
    } catch (error: any) {
      this.logFooter(false);
      this.error(error.message || 'Failed to initialize project', { exit: 1 });
    }
  }
}

