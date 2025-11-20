import { Command } from '@oclif/core';
import { callCursorTool } from '../cursorClient';

export default class Ping extends Command {
  static description = 'Health check for BlueKit CLI';

  async run() {
    try {
      // Try to ping the MCP server
      const response = await callCursorTool('bluekit', 'ping', {});
      
      if (typeof response === 'string') {
        this.log(response);
      } else if (response && response.message) {
        this.log(response.message);
      } else {
        this.log('BlueKit CLI is working!');
        this.log('MCP server response:', JSON.stringify(response, null, 2));
      }
    } catch (error: any) {
      // If MCP is not available, just print the basic message
      this.log('BlueKit CLI is working!');
      if (error.message) {
        this.log(`Note: MCP server unavailable - ${error.message}`);
      }
    }
  }
}

