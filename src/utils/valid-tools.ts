/**
 * Valid Tools Registry
 * Centralized list of all valid Omise API tools
 */

export const VALID_TOOLS = [
  // Payment Tools (7 tools)
  'create_charge',
  'retrieve_charge', 
  'list_charges',
  'update_charge',
  'capture_charge',
  'reverse_charge',
  'expire_charge',
  
  // Customer Tools (9 tools)
  'create_customer',
  'retrieve_customer',
  'list_customers',
  'update_customer',
  'destroy_customer',
  'list_customer_cards',
  'retrieve_customer_card',
  'update_customer_card',
  'destroy_customer_card',
  
  // Source Tools (2 tools)
  'create_source',
  'retrieve_source',
  
  // Transfer Tools (5 tools)
  'create_transfer',
  'retrieve_transfer',
  'list_transfers',
  'update_transfer',
  'destroy_transfer',
  
  // Recipient Tools (6 tools)
  'create_recipient',
  'retrieve_recipient',
  'list_recipients',
  'update_recipient',
  'destroy_recipient',
  'verify_recipient',
  
  // Refund Tools (3 tools)
  'create_refund',
  'retrieve_refund',
  'list_refunds',
  
  // Dispute Tools (8 tools)
  'list_disputes',
  'retrieve_dispute',
  'accept_dispute',
  'update_dispute',
  'list_dispute_documents',
  'retrieve_dispute_document',
  'upload_dispute_document',
  'destroy_dispute_document',
  
  // Schedule Tools (5 tools)
  'create_schedule',
  'retrieve_schedule',
  'list_schedules',
  'destroy_schedule',
  'list_schedule_occurrences',
  
  // Event Tools (2 tools)
  'list_events',
  'retrieve_event',
  
  // Capability Tools (1 tool)
  'retrieve_capability'
] as const;

export type ValidTool = typeof VALID_TOOLS[number];

/**
 * Check if a tool name is valid
 * @param toolName - The tool name to validate
 * @returns true if the tool is valid, false otherwise
 */
export function isValidTool(toolName: string): toolName is ValidTool {
  return VALID_TOOLS.includes(toolName as ValidTool);
}

/**
 * Validate a list of tool names
 * @param toolNames - Array of tool names to validate
 * @returns Object with validation result and invalid tools
 */
export function validateToolNames(toolNames: string[]): {
  isValid: boolean;
  invalidTools: string[];
  validTools: string[];
} {
  const invalidTools: string[] = [];
  const validTools: string[] = [];
  
  for (const toolName of toolNames) {
    if (isValidTool(toolName)) {
      validTools.push(toolName);
    } else {
      invalidTools.push(toolName);
    }
  }
  
  return {
    isValid: invalidTools.length === 0,
    invalidTools,
    validTools
  };
}

/**
 * Get all valid tool names as a comma-separated string
 * @returns String of all valid tools
 */
export function getAllValidToolsString(): string {
  return VALID_TOOLS.join(', ');
}
