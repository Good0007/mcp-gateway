/**
 * MCP Configuration Parser
 * 解析 Claude Desktop / VS Code 标准格式的 MCP 配置
 * 转换为我们内部使用的服务配置格式
 */

export interface MCPServerConfig {
  type?: 'stdio' | 'sse' | 'http';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface MCPServersConfig {
  mcpServers?: Record<string, MCPServerConfig>;
  // VS Code 格式
  servers?: Record<string, MCPServerConfig>;
  // VS Code 设置格式（带点号的键）
  'mcp.servers'?: Record<string, MCPServerConfig>;
}

export interface ParseResult {
  success: boolean;
  services?: Array<{
    id: string;
    type: 'stdio' | 'sse';
    name: string;
    description: string;
    enabled: boolean;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
  }>;
  error?: string;
}

/**
 * 从 command 推断服务名称和描述
 */
function inferServiceInfo(id: string, config: MCPServerConfig): { name: string; description: string } {
  // 常见服务映射
  const knownServices: Record<string, { name: string; description: string }> = {
    'filesystem': { name: 'Filesystem Service', description: 'File system operations - read/write/list files' },
    'memory': { name: 'Memory Service', description: 'Knowledge graph memory - store entities and relations' },
    'github': { name: 'GitHub Service', description: 'GitHub API integration - repos, issues, PRs' },
    'postgres': { name: 'PostgreSQL Service', description: 'PostgreSQL database operations' },
    'redis': { name: 'Redis Service', description: 'Redis key-value store operations' },
    'puppeteer': { name: 'Puppeteer Service', description: 'Browser automation - web scraping and testing' },
    'slack': { name: 'Slack Service', description: 'Slack integration - messages and channels' },
    'weather': { name: 'Weather Service', description: 'Weather information and forecasts' },
    'calculator': { name: 'Calculator Service', description: 'Basic arithmetic operations' },
  };

  // 尝试从 ID 匹配
  for (const [key, info] of Object.entries(knownServices)) {
    if (id.toLowerCase().includes(key)) {
      return info;
    }
  }

  // 尝试从 args 中的包名匹配
  if (config.args) {
    for (const arg of config.args) {
      for (const [key, info] of Object.entries(knownServices)) {
        if (arg.toLowerCase().includes(key)) {
          return info;
        }
      }
    }
  }

  // 默认使用 ID 生成名称
  const name = id
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    name: `${name}`,
    description: `MCP service: ${id}`,
  };
}

/**
 * 判断是否为 SSE 服务（基于 URL）
 */
function isSSEService(config: MCPServerConfig): boolean {
  // 检查 args 中是否有 URL-like 的参数
  if (config.args) {
    for (const arg of config.args) {
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        return true;
      }
    }
  }
  
  // 检查是否有 url 字段
  if (config.url) {
    return true;
  }

  return false;
}

/**
 * 提取 SSE URL
 */
function extractSSEUrl(config: MCPServerConfig): string | undefined {
  if (config.url) {
    return config.url;
  }

  if (config.args) {
    for (const arg of config.args) {
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        return arg;
      }
    }
  }

  return undefined;
}

/**
 * 检测字符串中是否包含 VS Code 变量
 */
function hasVSCodeVariables(value: string): boolean {
  return /\$\{[^}]+\}/.test(value);
}

/**
 * 处理 VS Code 变量（目前仅记录警告）
 */
function replaceVSCodeVariables(value: string): string {
  if (hasVSCodeVariables(value)) {
    console.warn('⚠️ 检测到 VS Code 变量，需要手动替换:', value);
  }
  return value;
}

/**
 * 解析 MCP 配置 JSON
 */
export function parseMCPConfig(jsonString: string): ParseResult {
  try {
    const config = JSON.parse(jsonString) as MCPServersConfig;

    // 检测配置格式
    let serversObject: Record<string, MCPServerConfig> | undefined;

    if (config.mcpServers) {
      // Claude Desktop 格式
      serversObject = config.mcpServers;
    } else if (config['mcp.servers']) {
      // VS Code 设置格式（带点号）
      serversObject = config['mcp.servers'];
    } else if (config.servers) {
      // VS Code 格式
      serversObject = config.servers;
    } else if (typeof config === 'object' && !Array.isArray(config)) {
      // 可能是直接的 servers 对象
      serversObject = config as Record<string, MCPServerConfig>;
    } else {
      return {
        success: false,
        error: '无效的配置格式。请提供 Claude Desktop 或 VS Code 的 MCP 配置 JSON。',
      };
    }

    const services = [];

    for (const [id, serverConfig] of Object.entries(serversObject)) {
      const { name, description } = inferServiceInfo(id, serverConfig);

      if (isSSEService(serverConfig)) {
        // SSE 服务
        const url = extractSSEUrl(serverConfig);
        if (!url) {
          continue; // 跳过无效的 SSE 配置
        }

        services.push({
          id,
          type: 'sse' as const,
          name,
          description,
          enabled: false,
          url,
        });
      } else {
        // Stdio 服务
        if (!serverConfig.command) {
          continue; // 跳过无命令的配置
        }

        // 检测 args 中的 VS Code 变量
        const args = serverConfig.args || [];
        const hasVariables = args.some(arg => hasVSCodeVariables(arg));
        
        if (hasVariables) {
          console.warn(`⚠️ 服务 "${id}" 的参数包含 VS Code 变量，导入后需要手动编辑配置文件替换为实际路径`);
        }

        services.push({
          id,
          type: 'stdio' as const,
          name,
          description,
          enabled: false,
          command: serverConfig.command,
          args: args.map(replaceVSCodeVariables),
          env: serverConfig.env || undefined,
        });
      }
    }

    if (services.length === 0) {
      return {
        success: false,
        error: '配置中没有找到有效的服务定义。',
      };
    }

    return {
      success: true,
      services,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? `JSON 解析错误: ${error.message}` : '无法解析 JSON 配置',
    };
  }
}

/**
 * 批量导入服务（调用 API）
 */
export async function importMCPServices(
  jsonString: string,
  addServiceFn: (service: any) => Promise<void>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const parseResult = parseMCPConfig(jsonString);

  if (!parseResult.success || !parseResult.services) {
    throw new Error(parseResult.error);
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const service of parseResult.services) {
    try {
      await addServiceFn(service);
      success++;
    } catch (error) {
      failed++;
      errors.push(`${service.id}: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  return { success, failed, errors };
}
