/**
 * Omise MCP Server Main File
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, validateOmiseKeys, getServerInfo } from './utils/config.js';
import { Logger } from './utils/logger.js';
import { OmiseClient } from './utils/omise-client.js';
import { AccessControlService } from './auth/access-control.js';
import { PaymentTools } from './tools/payment-tools.js';
import { CustomerTools } from './tools/customer-tools.js';
import { TokenTools } from './tools/token-tools.js';
import { SourceTools } from './tools/source-tools.js';
import { TransferTools } from './tools/transfer-tools.js';
import { RecipientTools } from './tools/recipient-tools.js';
import { RefundTools } from './tools/refund-tools.js';
import { DisputeTools } from './tools/dispute-tools.js';
import { ScheduleTools } from './tools/schedule-tools.js';
import { EventTools } from './tools/event-tools.js';
import { CapabilityTools } from './tools/capability-tools.js';
import type { ServerInfo } from './types/mcp.js';

async function main() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    validateOmiseKeys(config);

    // Initialize logger
    const logger = new Logger(config);

    // Initialize Omise client
    const omiseClient = new OmiseClient({ ...config.omise, logging: config.logging }, logger);

    // Initialize access control (mandatory)
    const accessControl = new AccessControlService(config.tools.allowed);
      logger.info('Access control initialized', {
          configuration: accessControl.getConfigSummary()
    });

    // Initialize tools
    const paymentTools = new PaymentTools(omiseClient, logger);
    const customerTools = new CustomerTools(omiseClient, logger);
    const tokenTools = new TokenTools(omiseClient, logger);
    const sourceTools = new SourceTools(omiseClient, logger);
    const transferTools = new TransferTools(omiseClient, logger);
    const recipientTools = new RecipientTools(omiseClient, logger);
    const refundTools = new RefundTools(omiseClient, logger);
    const disputeTools = new DisputeTools(omiseClient, logger);
    const scheduleTools = new ScheduleTools(omiseClient, logger);
    const eventTools = new EventTools(omiseClient, logger);
    const capabilityTools = new CapabilityTools(omiseClient, logger);

    // Get server information
    const serverInfo = getServerInfo(config);

    // Initialize MCP server
    const server = new Server({
      name: config.server.name,
      version: config.server.version,
    });

    // Server info is handled automatically by MCP SDK

    // Get list of tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [
        ...paymentTools.getTools(),
        ...customerTools.getTools(),
        ...tokenTools.getTools(),
        ...sourceTools.getTools(),
        ...transferTools.getTools(),
        ...recipientTools.getTools(),
        ...refundTools.getTools(),
        ...disputeTools.getTools(),
        ...scheduleTools.getTools(),
        ...eventTools.getTools(),
        ...capabilityTools.getTools(),
      ];

      // Filter tools based on access control
      const availableTools = accessControl.filterAvailableTools(allTools);

      logger.info('Available tools requested', {
          total: allTools.length,
          allowed: availableTools.length,
          tools: availableTools.map(t => t.name)
      });

      return {
        tools: availableTools,
      };
    });

    // Handle tool execution
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logger.info('Tool execution requested', {
          requestId,
          tool: name,
          arguments: args
      });

      // ACCESS CONTROL CHECK
      if (!accessControl.isToolAllowed(name)) {
        const duration = Date.now() - startTime;
        logger.warn('Tool access denied', {
          requestId,
          tool: name,
          duration,
          reason: 'Tool not in allowed list'
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
              success: false,
              error: `Access denied: Tool '${name}' is not authorized`,
              code: 'TOOL_NOT_AUTHORIZED',
              allowed_configuration: accessControl.getConfigSummary(),
              metadata: {
                requestId,
                timestamp: new Date().toISOString(),
                duration
                }
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      try {
        logger.info(`Executing tool: ${name}`, { 
          requestId, 
          args: args ? Object.keys(args) : [],
          rateLimitInfo: omiseClient.getRateLimitInfo()
        });

        let result;

        switch (name) {
          // Charge API tools
          case 'create_charge':
            result = await paymentTools.createCharge(args as any);
            break;
          case 'retrieve_charge':
            result = await paymentTools.retrieveCharge(args as any);
            break;
          case 'list_charges':
            result = await paymentTools.listCharges(args as any);
            break;
          case 'update_charge':
            result = await paymentTools.updateCharge(args as any);
            break;
          case 'capture_charge':
            result = await paymentTools.captureCharge(args as any);
            break;
          case 'reverse_charge':
            result = await paymentTools.reverseCharge(args as any);
            break;
          case 'expire_charge':
            result = await paymentTools.expireCharge(args as any);
            break;
          // Customer API tools
          case 'create_customer':
            result = await customerTools.createCustomer(args as any);
            break;
          case 'retrieve_customer':
            result = await customerTools.retrieveCustomer(args as any);
            break;
          case 'list_customers':
            result = await customerTools.listCustomers(args as any);
            break;
          case 'update_customer':
            result = await customerTools.updateCustomer(args as any);
            break;
          case 'destroy_customer':
            result = await customerTools.destroyCustomer(args as any);
            break;
          case 'list_customer_cards':
            result = await customerTools.listCustomerCards(args as any);
            break;
          case 'retrieve_customer_card':
            result = await customerTools.retrieveCustomerCard(args as any);
            break;
          case 'update_customer_card':
            result = await customerTools.updateCustomerCard(args as any);
            break;
          case 'destroy_customer_card':
            result = await customerTools.destroyCustomerCard(args as any);
            break;
          // Token API tools
          case 'create_token':
            result = await tokenTools.createToken(args as any);
            break;
          case 'retrieve_token':
            result = await tokenTools.retrieveToken(args as any);
            break;
          // Source API tools
          case 'create_source':
            result = await sourceTools.createSource(args as any);
            break;
          case 'retrieve_source':
            result = await sourceTools.retrieveSource(args as any);
            break;
          // Transfer API tools
          case 'create_transfer':
            result = await transferTools.createTransfer(args as any);
            break;
          case 'retrieve_transfer':
            result = await transferTools.retrieveTransfer(args as any);
            break;
          case 'list_transfers':
            result = await transferTools.listTransfers(args as any);
            break;
          case 'update_transfer':
            result = await transferTools.updateTransfer(args as any);
            break;
          case 'destroy_transfer':
            result = await transferTools.destroyTransfer(args as any);
            break;
          // Recipient API tools
          case 'create_recipient':
            result = await recipientTools.createRecipient(args as any);
            break;
          case 'retrieve_recipient':
            result = await recipientTools.retrieveRecipient(args as any);
            break;
          case 'list_recipients':
            result = await recipientTools.listRecipients(args as any);
            break;
          case 'update_recipient':
            result = await recipientTools.updateRecipient(args as any);
            break;
          case 'destroy_recipient':
            result = await recipientTools.destroyRecipient(args as any);
            break;
          case 'verify_recipient':
            result = await recipientTools.verifyRecipient(args as any);
            break;
          // Refund API tools
          case 'create_refund':
            result = await refundTools.createRefund(args as any);
            break;
          case 'retrieve_refund':
            result = await refundTools.retrieveRefund(args as any);
            break;
          case 'list_refunds':
            result = await refundTools.listRefunds(args as any);
            break;
          // Dispute API tools
          case 'list_disputes':
            result = await disputeTools.listDisputes(args as any);
            break;
          case 'retrieve_dispute':
            result = await disputeTools.retrieveDispute(args as any);
            break;
          case 'accept_dispute':
            result = await disputeTools.acceptDispute(args as any);
            break;
          case 'update_dispute':
            result = await disputeTools.updateDispute(args as any);
            break;
          case 'list_dispute_documents':
            result = await disputeTools.listDisputeDocuments(args as any);
            break;
          case 'retrieve_dispute_document':
            result = await disputeTools.retrieveDisputeDocument(args as any);
            break;
          case 'upload_dispute_document':
            result = await disputeTools.uploadDisputeDocument(args as any);
            break;
          case 'destroy_dispute_document':
            result = await disputeTools.destroyDisputeDocument(args as any);
            break;
          // Schedule API tools
          case 'create_schedule':
            result = await scheduleTools.createSchedule(args as any);
            break;
          case 'retrieve_schedule':
            result = await scheduleTools.retrieveSchedule(args as any);
            break;
          case 'list_schedules':
            result = await scheduleTools.listSchedules(args as any);
            break;
          case 'destroy_schedule':
            result = await scheduleTools.destroySchedule(args as any);
            break;
          case 'list_schedule_occurrences':
            result = await scheduleTools.listScheduleOccurrences(args as any);
            break;
          // Event API tools
          case 'list_events':
            result = await eventTools.listEvents(args as any);
            break;
          case 'retrieve_event':
            result = await eventTools.retrieveEvent(args as any);
            break;
          // Capability API tools
          case 'retrieve_capability':
            result = await capabilityTools.retrieveCapability(args as any);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const duration = Date.now() - startTime;
        result.metadata = {
          requestId,
          timestamp: new Date().toISOString(),
          duration
        };

        if (result.success) {
          logger.info(`Tool execution successful: ${name}`, { 
            requestId, 
            duration,
            rateLimitInfo: omiseClient.getRateLimitInfo()
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: result.data,
                  message: result.message,
                  metadata: result.metadata,
                }, null, 2),
              },
            ],
          };
        } else {
          logger.warn(`Tool execution failed: ${name}`, { 
            requestId, 
            duration, 
            error: result.error 
          });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: result.error,
                  metadata: result.metadata,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Tool execution error: ${name}`, error as Error, { 
          requestId, 
          duration,
          args 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                metadata: {
                  requestId,
                  timestamp: new Date().toISOString(),
                  duration
                }
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Omise MCP Server started successfully', {
      name: config.server.name,
      version: config.server.version,
      environment: config.omise.environment,
      apiVersion: config.omise.apiVersion,
      baseUrl: config.omise.baseUrl,
      supportedTools: serverInfo.supportedTools.length,
      supportedResources: serverInfo.supportedResources.length,
      rateLimitEnabled: config.rateLimit.enabled,
      requestLogging: config.logging.enableRequestLogging,
      responseLogging: config.logging.enableResponseLogging
    });

  } catch (error) {
    // Use stderr for error logging to avoid interfering with MCP JSON-RPC on stdout
    process.stderr.write(`Failed to start Omise MCP Server: ${error}\n`);
    process.exit(1);
  }
}

// Catch unhandled exceptions and process termination
process.on('uncaughtException', (error) => {
  // Use stderr to avoid interfering with MCP JSON-RPC on stdout
  process.stderr.write(`Uncaught Exception: ${error}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  // Use stderr to avoid interfering with MCP JSON-RPC on stdout  
  process.stderr.write(`Unhandled Rejection at: ${promise}, reason: ${reason}\n`);
  process.exit(1);
});

// Start server
main().catch((error) => {
  // Use stderr to avoid interfering with MCP JSON-RPC on stdout
  process.stderr.write(`Failed to start server: ${error}\n`);
  process.exit(1);
});
