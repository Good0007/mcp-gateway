/**
 * Web Configuration Types (Shared)
 * Used by both core and web packages
 */

export interface XiaozhiEndpoint {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface McpProxyConfig {
  enabled: boolean;
  token?: string;
  enabledServices?: string[];
}

export interface WebConfigData {
  version: string;
  lastUpdate: string;
  services: any[];  // Will be ServiceConfig from core
  xiaozhi: {
    endpoints: XiaozhiEndpoint[];
    currentEndpointId?: string;
    enabledServices?: string[];
  };
  mcpProxy: McpProxyConfig;
  preferences: {
    autoStartServices?: boolean;
    [key: string]: any;
  };
}

/**
 * API Response types
 */
export interface WebConfigResponse {
  config: WebConfigData;
}

export interface ExportConfigResponse {
  filename: string;
  content: string;
  timestamp: string;
}
