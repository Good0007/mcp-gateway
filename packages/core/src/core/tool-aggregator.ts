/**
 * Tool Aggregator
 * Aggregates tools from all running services and handles tool calls
 */

import { Tool, CallToolRequest, CallToolResult } from '../types/mcp.js';
import { ErrorCode, ToolError } from '../types/errors.js';
import { ServiceRegistry } from './service-registry.js';
import { validateToolResult } from '../utils/result-validator.js';
import { logger } from '../utils/logger.js';

/**
 * Tool with service ID
 */
export interface AggregatedTool extends Tool {
  serviceId: string;
  serviceName: string;
}

/**
 * Tool Aggregator - manages tool discovery and execution
 */
export class ToolAggregator {
  private filter: ((serviceId: string) => boolean) | null = null;
  private lastToolFingerprint: string = '';

  constructor(
    private readonly registry: ServiceRegistry,
    private readonly resultLimit: number = 10 * 1024 * 1024 // 10MB
  ) {}

  /**
   * Set service filter
   */
  setFilter(filter: (serviceId: string) => boolean): void {
    this.filter = filter;
  }

  /**
   * Compute a fingerprint of the current tool list (sorted tool names).
   * Used to detect whether the available tools have actually changed.
   */
  async getToolFingerprint(): Promise<string> {
    const tools = await this.getAllTools();
    return tools.map(t => t.name).sort().join('\n');
  }

  /**
   * Take a snapshot of the current tools and return whether the list
   * has changed since the last snapshot. Updates the stored fingerprint.
   */
  async snapshotAndCheckChanged(): Promise<boolean> {
    const current = await this.getToolFingerprint();
    const changed = current !== this.lastToolFingerprint;
    if (changed) {
      const prevCount = this.lastToolFingerprint ? this.lastToolFingerprint.split('\n').filter(Boolean).length : 0;
      const currCount = current ? current.split('\n').filter(Boolean).length : 0;
      logger.info('Tool list changed', { previousCount: prevCount, currentCount: currCount });
    }
    this.lastToolFingerprint = current;
    return changed;
  }

  /**
   * Get all available tools from running services
   */
  async getAllTools(): Promise<AggregatedTool[]> {
    const runningServices = this.registry.getRunningServices();
    
    // Apply filter if set
    const filteredServices = this.filter 
      ? runningServices.filter(s => this.filter!(s.getMetadata().id))
      : runningServices;

    const toolsPromises = filteredServices.map(async (adapter) => {
      try {
        const result = await adapter.listTools();
        const metadata = adapter.getMetadata();

        return result.tools.map((tool) => ({
          ...tool,
          serviceId: metadata.id,
          serviceName: metadata.name,
        }));
      } catch (error) {
        logger.error('Failed to list tools from service', {
          serviceId: adapter.getMetadata().id,
          error,
        });
        return [];
      }
    });

    const toolsArrays = await Promise.all(toolsPromises);
    return toolsArrays.flat();
  }

  /**
   * Find a tool by name
   */
  async findTool(toolName: string): Promise<AggregatedTool | undefined> {
    const allTools = await this.getAllTools();
    return allTools.find((tool) => tool.name === toolName);
  }

  /**
   * Call a tool by name
   */
  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    logger.info(`Calling tool: ${request.name}`, { arguments: request.arguments });

    // Find which service provides this tool
    const tool = await this.findTool(request.name);

    if (!tool) {
      throw new ToolError(
        ErrorCode.TOOL_NOT_FOUND,
        request.name,
        `Tool ${request.name} not found in any running service`
      );
    }

    // Get the service adapter
    const adapter = this.registry.get(tool.serviceId);
    if (!adapter || !adapter.isRunning()) {
      throw new ToolError(
        ErrorCode.TOOL_CALL_FAILED,
        request.name,
        `Service ${tool.serviceName} is not running`
      );
    }

    try {
      // Call the tool
      const result = await adapter.callTool(request);

      // Validate and truncate result if needed
      const validatedResult = validateToolResult(result, this.resultLimit, request.name);

      logger.info(`Tool call completed: ${request.name}`, {
        serviceId: tool.serviceId,
        isError: validatedResult.isError,
      });

      return validatedResult;
    } catch (error) {
      logger.error(`Tool call failed: ${request.name}`, {
        serviceId: tool.serviceId,
        error,
      });

      // Return error as result
      return {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get tool statistics
   */
  async getStats() {
    const tools = await this.getAllTools();
    const serviceIds = new Set(tools.map((t) => t.serviceId));

    return {
      totalTools: tools.length,
      totalServices: serviceIds.size,
      toolsByService: Array.from(serviceIds).map((serviceId) => ({
        serviceId,
        serviceName: tools.find((t) => t.serviceId === serviceId)?.serviceName || '',
        toolCount: tools.filter((t) => t.serviceId === serviceId).length,
      })),
    };
  }

  /**
   * Check if a tool exists
   */
  async hasTool(toolName: string): Promise<boolean> {
    const tool = await this.findTool(toolName);
    return tool !== undefined;
  }

  /**
   * Get tools grouped by service
   */
  async getToolsByService(): Promise<Map<string, AggregatedTool[]>> {
    const tools = await this.getAllTools();
    const grouped = new Map<string, AggregatedTool[]>();

    for (const tool of tools) {
      const existing = grouped.get(tool.serviceId) || [];
      existing.push(tool);
      grouped.set(tool.serviceId, existing);
    }

    return grouped;
  }
}
