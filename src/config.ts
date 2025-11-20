import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the current project path (process.cwd())
 */
export function getProjectPath(): string {
  return process.cwd();
}

/**
 * Resolve and validate project path
 */
export function resolveProjectPath(): string {
  const projectPath = getProjectPath();
  
  // Basic validation - ensure directory exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }
  
  return path.resolve(projectPath);
}

