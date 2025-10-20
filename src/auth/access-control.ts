/**
 * Access Control Service for Tool Authorization
 * Manages which tools clients can access based on TOOLS environment variable
 */

import { validateToolNames, getAllValidToolsString } from '../utils/valid-tools';

export class AccessControlService {
  private readonly allowedTools: string[] | 'all';
  
  constructor(toolsConfig: string) {
    this.allowedTools = this.parseToolList(toolsConfig);
  }
  
  /**
   * Parse and validate TOOLS environment variable
   * @param toolsString - Raw TOOLS env var value
   * @returns Array of tool names or 'all' keyword
   * @throws Error if TOOLS is empty or invalid
   */
  parseToolList(toolsString: string): string[] | 'all' {
    if (!toolsString || toolsString.trim() === '') {
      throw new Error('TOOLS environment variable is required');
    }
    
    const normalized = toolsString.trim().toLowerCase();
    if (normalized === 'all') {
      return 'all';
    }
    
    // Parse comma-separated list
    const tools = toolsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (tools.length === 0) {
      throw new Error('TOOLS must contain at least one tool name or "all"');
    }
    
    // Validate tool names
    const validation = validateToolNames(tools);
    if (!validation.isValid) {
      throw new Error(
        `Invalid tool names: ${validation.invalidTools.join(', ')}. ` +
        `Valid tools are: ${getAllValidToolsString()}. ` +
        `Use TOOLS=all for full access.`
      );
    }
    
    return tools;
  }
  
  /**
   * Check if a specific tool is allowed
   * @param toolName - Name of the tool to check
   * @returns true if tool is allowed, false otherwise
   */
  isToolAllowed(toolName: string): boolean {
    if (this.allowedTools === 'all') {
      return true;
    }
    
    // Exact match only - no wildcards
    return this.allowedTools.includes(toolName);
  }
  
  /**
   * Filter list of tools based on access control
   * @param allTools - Array of all available tools
   * @returns Filtered array of allowed tools
   */
  filterAvailableTools(allTools: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
    if (this.allowedTools === 'all') {
      return allTools;
    }
    
    return allTools.filter(tool => this.isToolAllowed(tool.name));
  }
  
  /**
   * Get human-readable summary of current configuration
   * @returns Configuration summary string
   */
  getConfigSummary(): string {
    if (this.allowedTools === 'all') {
      return 'all tools';
    }
    return `${this.allowedTools.length} tools: ${this.allowedTools.join(', ')}`;
  }
  
  /**
   * Get list of allowed tool names
   * @returns Array of allowed tool names or 'all'
   */
  getAllowedTools(): string[] | 'all' {
    return this.allowedTools;
  }
}

