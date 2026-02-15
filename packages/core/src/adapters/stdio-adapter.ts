/**
 * Stdio Service Adapter
 * Manages MCP services that communicate via stdio (child process)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  InitializeResult,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ToolParameter,
} from '../types/mcp.js';
import { StdioServiceConfig } from '../types/config.js';
import { ErrorCode, ServiceError } from '../types/errors.js';
import { BaseServiceAdapter } from './base-adapter.js';
import { logger } from '../utils/logger.js';

/**
 * Stdio adapter for child process-based MCP services
 */
export class StdioServiceAdapter extends BaseServiceAdapter {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(config: StdioServiceConfig) {
    super(config);
  }

  /**
   * Get typed config
   */
  private get stdioConfig(): StdioServiceConfig {
    return this.config as StdioServiceConfig;
  }

  /**
   * Initialize the stdio service
   */
  protected async doInitialize(): Promise<InitializeResult> {
    const config = this.stdioConfig;

    try {
      // Prepare environment variables (filter out undefined values)
      const env = config.env
        ? Object.fromEntries(
            Object.entries({ ...process.env, ...config.env }).filter(
              ([_, value]) => value !== undefined
            ) as [string, string][]
          )
        : undefined;

      // Create transport with optional working directory
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env,
        cwd: config.cwd,  // Set working directory for the service process
      });

      // Create client
      this.client = new Client(
        {
          name: 'mcp-agent',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect with timeout
      const connectTimeout = 30000; // 30 seconds
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('连接超时：服务启动时间过长')), connectTimeout);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Get server info
      const serverInfo = this.client.getServerVersion();
      const capabilities = this.client.getServerCapabilities();

      if (!serverInfo) {
        throw new ServiceError(
          ErrorCode.SERVICE_INITIALIZATION_FAILED,
          config.id,
          'Failed to get server info from stdio service'
        );
      }

      logger.info(`Service ${config.id} initialized successfully`, {
        serverInfo,
        capabilities,
      });

      return {
        protocolVersion: '2024-11-05',
        serverInfo,
        capabilities: capabilities || {},
      };
    } catch (error: any) {
      // Cleanup on error
      await this.cleanup();

      // Enhance error messages with helpful information
      let errorMessage = error.message || 'Unknown error';
      let suggestion = '';

      // Check for common error patterns
      if (error.code === 'ENOENT' || errorMessage.includes('ENOENT')) {
        errorMessage = `命令未找到: ${config.command}`;
        suggestion = this.getCommandNotFoundSuggestion(config.command);
      } else if (error.code === 'EACCES' || errorMessage.includes('EACCES')) {
        errorMessage = `权限被拒绝: ${config.command}`;
        suggestion = `请检查命令是否有执行权限，或尝试: chmod +x ${config.command}`;
      } else if (errorMessage.includes('spawn') && errorMessage.includes('ENOENT')) {
        errorMessage = `无法启动进程: ${config.command}`;
        suggestion = this.getCommandNotFoundSuggestion(config.command);
      } else if (errorMessage.includes('连接超时')) {
        suggestion = '服务启动时间过长，可能需要：\n1. 检查命令和参数是否正确\n2. 检查服务是否需要安装依赖\n3. 查看服务日志获取详细错误信息';
      }

      const fullMessage = suggestion ? `${errorMessage}\n\n建议: ${suggestion}` : errorMessage;

      throw new ServiceError(
        ErrorCode.SERVICE_INITIALIZATION_FAILED,
        config.id,
        fullMessage,
        undefined,
        error
      );
    }
  }

  /**
   * Get helpful suggestion for command not found errors
   */
  private getCommandNotFoundSuggestion(command: string): string {
    const suggestions: Record<string, string> = {
      'npx': '请安装 Node.js 和 npm:\n• macOS: brew install node\n• Ubuntu: sudo apt install nodejs npm\n• Windows: 从 https://nodejs.org 下载安装',
      'node': '请安装 Node.js:\n• macOS: brew install node\n• Ubuntu: sudo apt install nodejs\n• Windows: 从 https://nodejs.org 下载安装',
      'python': '请安装 Python:\n• macOS: brew install python\n• Ubuntu: sudo apt install python3\n• Windows: 从 https://python.org 下载安装',
      'python3': '请安装 Python 3:\n• macOS: brew install python\n• Ubuntu: sudo apt install python3\n• Windows: 从 https://python.org 下载安装',
      'uvx': '请安装 uv (Python 包管理器):\n• pip install uv\n• 或访问: https://docs.astral.sh/uv/',
    };

    return suggestions[command] || `请确保 ${command} 已安装并在系统 PATH 中。\n可以运行 "which ${command}" (Unix) 或 "where ${command}" (Windows) 检查。`;
  }

  /**
   * List tools from the service
   */
  protected async doListTools(): Promise<ListToolsResult> {
    if (!this.client) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'Client not initialized'
      );
    }

    try {
      const response = await this.client.listTools();
      return {
        tools: response.tools.map((tool) => ({
          name: tool.name,
          description: tool.description || '',
          parameters: (tool.inputSchema?.properties as Record<string, ToolParameter>) || {},
        })),
      };
    } catch (error) {
      logger.error('Failed to list tools', { serviceId: this.config.id, error });
      throw new ServiceError(
        ErrorCode.SERVICE_INITIALIZATION_FAILED,
        this.config.id,
        'Failed to list tools',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Call a tool
   */
  protected async doCallTool(request: CallToolRequest): Promise<CallToolResult> {
    if (!this.client) {
      throw new ServiceError(
        ErrorCode.SERVICE_NOT_RUNNING,
        this.config.id,
        'Client not initialized'
      );
    }

    try {
      const response = await this.client.callTool({
        name: request.name,
        arguments: request.arguments,
      });

      // Type assertion for response
      const content = Array.isArray(response.content) ? response.content : [];

      return {
        content: content.map((item: unknown) => ({
          type: 'text' as const,
          text: typeof item === 'object' && item !== null && 'type' in item && item.type === 'text' && 'text' in item ? String(item.text) : JSON.stringify(item),
        })),
        isError: Boolean(response.isError),
      };
    } catch (error) {
      logger.error('Tool call failed', {
        serviceId: this.config.id,
        toolName: request.name,
        error,
      });

      // Return error result instead of throwing
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
   * Close the service
   */
  protected async doClose(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        logger.warn('Error closing client', { serviceId: this.config.id, error });
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        logger.warn('Error closing transport', { serviceId: this.config.id, error });
      }
      this.transport = null;
    }
  }
}
