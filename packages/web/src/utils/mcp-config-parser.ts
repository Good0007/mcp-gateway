/**
 * MCP 配置解析工具
 */

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ExtractedMCPConfig {
  serverKey: string;
  config: MCPServerConfig;
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
function extractMCPServers(jsonObj: any): Record<string, MCPServerConfig> | null {
  // 尝试多种可能的路径
  if (jsonObj.mcpServers) {
    return jsonObj.mcpServers;
  }
  
  if (jsonObj.mcp?.servers) {
    return jsonObj.mcp.servers;
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
              const config = serverConfig as MCPServerConfig;
              
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
      } catch (e) {
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
function hasValidStructure(config: any): boolean {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.command === 'string' &&
    Array.isArray(config.args)
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
