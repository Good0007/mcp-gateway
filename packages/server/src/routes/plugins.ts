/**
 * Plugins API Routes
 * Plugin marketplace endpoints
 */

import { Hono } from 'hono';
import type { PluginListResponse, PluginMetadata } from '@mcp-agent/shared';

const app = new Hono();

// Mock plugin data (in real app, this would come from a registry/database)
const mockPlugins: PluginMetadata[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: '文件系统操作工具集，支持读写文件、列出目录等',
    version: '2.1.0',
    author: 'ModelContext Protocol',
    type: 'stdio',
    official: true,
    downloads: 3500,
    rating: 4.9,
    tags: ['filesystem', 'files', 'official'],
    repository: 'https://github.com/modelcontextprotocol/servers',
    installCommand: 'npx @modelcontextprotocol/server-filesystem',
    config: {
      type: 'stdio' as any,
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
    },
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: '集成 Brave 搜索引擎，提供网页搜索能力',
    version: '1.5.2',
    author: 'ModelContext Protocol',
    type: 'stdio',
    official: true,
    downloads: 890,
    rating: 4.6,
    tags: ['search', 'web', 'brave', 'official'],
    repository: 'https://github.com/modelcontextprotocol/servers',
    installCommand: 'npx @modelcontextprotocol/server-brave-search',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub 仓库操作工具，支持创建 issue、PR、搜索代码等',
    version: '3.0.1',
    author: 'ModelContext Protocol',
    type: 'stdio',
    official: true,
    downloads: 2100,
    rating: 4.8,
    tags: ['github', 'git', 'vcs', 'official'],
    repository: 'https://github.com/modelcontextprotocol/servers',
    installCommand: 'npx @modelcontextprotocol/server-github',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'PostgreSQL 数据库工具，支持查询和管理数据库',
    version: '1.2.0',
    author: 'ModelContext Protocol',
    type: 'stdio',
    official: true,
    downloads: 1560,
    rating: 4.7,
    tags: ['database', 'postgres', 'sql', 'official'],
    repository: 'https://github.com/modelcontextprotocol/servers',
    installCommand: 'npx @modelcontextprotocol/server-postgres',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Slack 集成工具，支持发送消息、创建频道等',
    version: '2.3.0',
    author: 'ModelContext Protocol',
    type: 'stdio',
    official: true,
    downloads: 980,
    rating: 4.5,
    tags: ['slack', 'messaging', 'communication', 'official'],
    repository: 'https://github.com/modelcontextprotocol/servers',
    installCommand: 'npx @modelcontextprotocol/server-slack',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Google Drive 文件管理工具',
    version: '1.1.0',
    author: 'ModelContext Protocol',
    type: 'stdio',
    official: true,
    downloads: 1200,
    rating: 4.4,
    tags: ['google', 'drive', 'cloud', 'storage', 'official'],
    repository: 'https://github.com/modelcontextprotocol/servers',
    installCommand: 'npx @modelcontextprotocol/server-google-drive',
  },
];

// GET /api/plugins - List available plugins
app.get('/', async (c) => {
  try {
    // In real app: fetch from external registry or database
    // Support query params: ?search=xxx&tag=xxx&official=true
    const searchQuery = c.req.query('search')?.toLowerCase();
    const tagFilter = c.req.query('tag');
    const officialOnly = c.req.query('official') === 'true';

    let filtered = mockPlugins;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.description.toLowerCase().includes(searchQuery) ||
        p.tags.some(t => t.includes(searchQuery))
      );
    }

    if (tagFilter) {
      filtered = filtered.filter(p => p.tags.includes(tagFilter));
    }

    if (officialOnly) {
      filtered = filtered.filter(p => p.official);
    }

    const response: PluginListResponse = {
      plugins: filtered,
      total: filtered.length,
    };

    return c.json(response);
  } catch (error) {
    console.error('Plugins list error:', error);
    return c.json({ error: 'Failed to list plugins' }, 500);
  }
});

// GET /api/plugins/:id - Get plugin detail
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const plugin = mockPlugins.find(p => p.id === id);

    if (!plugin) {
      return c.json({ error: 'Plugin not found' }, 404);
    }

    return c.json(plugin);
  } catch (error) {
    console.error('Plugin detail error:', error);
    return c.json({ error: 'Failed to get plugin detail' }, 500);
  }
});

export default app;
