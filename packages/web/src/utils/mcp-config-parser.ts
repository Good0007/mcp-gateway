/**
 * MCP 配置解析工具
 */

// 重命名为 ImportedMCPServerConfig 以避免与下面的 MCPServerConfig 冲突
export interface ImportedMCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ExtractedMCPConfig {
  serverKey: string;
  config: ImportedMCPServerConfig;
  source: string;
  supported: boolean;
  rawJson?: string;
}

/**
 * 从 Markdown 文本中提取 JSON 代码块
 * 支持多种格式：```json 或 ```，支持不同的换行符
 */
function extractJSONCodeBlocks(markdown: string): string[] {
  // 宽松的正则表达式，匹配 ```json 或 ``` 包裹的代码块
  // 允许代码块前后有或没有空白字符
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const blocks: string[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const content = match[1].trim();
    // 只添加看起来像 JSON 的内容（以 { 或 [ 开头）
    if (content && (content.startsWith('{') || content.startsWith('['))) {
      blocks.push(content);
    }
  }
  
  return blocks;
}

/**
 * 从 JSON 对象中提取 mcpServers 配置
 */
function extractMCPServers(jsonObj: unknown): Record<string, ImportedMCPServerConfig> | null {
  const obj = jsonObj as Record<string, any>;
  // 尝试多种可能的路径
  if (obj.mcpServers) {
    return obj.mcpServers;
  }
  
  if (obj.mcp?.servers) {
    return obj.mcp.servers;
  }
  
  return null;
}

/**
 * 从详情数据中提取 MCP 配置
 * 返回所有找到的配置，包括不支持的（用于显示说明）
 */
export function extractMCPConfigsFromDetail(
  abstract: Array<{ key: string; name: string; value: string }>
): ExtractedMCPConfig[] {
  const configs: ExtractedMCPConfig[] = [];
  const seenConfigs = new Set<string>();
  
  // 查找包含详情的 abstract 项（通常是 detail_zh 或 detail_en）
  const detailItems = abstract.filter(
    item => item.key.includes('detail') || item.key.includes('readme')
  );
  
  for (const item of detailItems) {
    const codeBlocks = extractJSONCodeBlocks(item.value);
    
    for (const block of codeBlocks) {
      try {
        const jsonObj = JSON.parse(block);
        const mcpServers = extractMCPServers(jsonObj);
        
        if (mcpServers) {
          // 提取每个服务配置
          for (const [key, serverConfig] of Object.entries(mcpServers)) {
            // 只要结构有效就提取，不管命令是否支持
            if (hasValidStructure(serverConfig)) {
              const config = serverConfig as ImportedMCPServerConfig;
              
              // 生成去重键：serverKey + command + args + env
              // 这样可以确保完全相同的配置只出现一次，但允许不同的配置变体（如不同的 args 或 command）同时存在供用户选择
              const uniqueKey = JSON.stringify({
                key,
                command: config.command,
                args: config.args,
                env: config.env
              });
              
              if (!seenConfigs.has(uniqueKey)) {
                seenConfigs.add(uniqueKey);
                configs.push({
                  serverKey: key,
                  config,
                  source: item.key,
                  supported: isSupportedCommand(config.command),
                  rawJson: JSON.stringify({
                    mcpServers: {
                      [key]: config
                    }
                  }, null, 2)
                });
              }
            }
          }
        }
      } catch {
        // 忽略无效的 JSON
        continue;
      }
    }
  }
  
  return configs;
}

/**
 * 检查配置结构是否有效（不检查命令类型）
 */
function hasValidStructure(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  const cfg = config as { command?: unknown; args?: unknown };
  return (
    typeof cfg.command === 'string' &&
    Array.isArray(cfg.args)
  );
}

/**
 * 检查命令是否被支持
 */
function isSupportedCommand(command: string): boolean {
  const allowedCommands = ['npx', 'uvx', 'uv'];
  return allowedCommands.includes(command.toLowerCase());
}

/**
 * 将 MCP 配置转换为本地服务配置格式
 */
export function convertToServiceConfig(
  serverName: string,
  mcpConfig: ExtractedMCPConfig,
  metadata: {
    description?: string;
    icon?: string;
    url?: string;
  }
) {
  return {
    id: mcpConfig.serverKey, // 使用提取到的 JSON key 作为 ID（如 "baidu-map"）
    name: serverName,
    description: metadata.description || '',
    type: 'stdio' as const,
    enabled: false,
    command: mcpConfig.config.command,
    args: mcpConfig.config.args,
    env: mcpConfig.config.env,
  };
}

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

export interface ParsedServiceConfig {
  id: string;
  type: 'stdio' | 'sse';
  name: string;
  description: string;
  enabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface ParseResult {
  success: boolean;
  services?: ParsedServiceConfig[];
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
  addServiceFn: (service: ParsedServiceConfig) => Promise<void>
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
