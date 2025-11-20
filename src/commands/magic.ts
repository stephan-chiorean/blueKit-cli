import { Command } from '@oclif/core';
import { callCursorTool } from '../cursorClient';
import { getProjectPath } from '../config';

export default class Magic extends Command {
  static description = 'Create a .magic.md file in the current directory';

  async run() {
    try {
      const directory = getProjectPath();
      
      // Call the MCP tool with the current directory
      const response = await callCursorTool('bluekit', 'magic', { directory });
      
      // Extract the text content from the response
      if (response && response.content && Array.isArray(response.content)) {
        const textContent = response.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
        
        if (textContent) {
          this.log(textContent);
        } else {
          this.log('✅ .magic.md file created successfully!');
        }
      } else if (typeof response === 'string') {
        this.log(response);
      } else {
        this.log('✅ .magic.md file created successfully!');
        this.log('Response:', JSON.stringify(response, null, 2));
      }
    } catch (error: any) {
      this.error(`Failed to create .magic.md file: ${error.message}`);
    }
  }
}



