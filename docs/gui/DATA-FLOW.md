# 数据流与状态管理

## 状态管理架构

```
┌─────────────────────────────────────┐
│         Zustand Stores              │
├─────────────────────────────────────┤
│  pluginStore   │  serviceStore      │
│  configStore   │  logStore          │
│  uiStore       │  authStore         │
└─────────────────────────────────────┘
         │              │
         ▼              ▼
┌─────────────────────────────────────┐
│       React Query Cache             │
│  Server State + Auto Refetch        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         API Layer                   │
│  HTTP + WebSocket                   │
└─────────────────────────────────────┘
```

## Store 设计

### pluginStore
```typescript
interface PluginStore {
  // 状态
  plugins: Plugin[];
  selectedPlugin: Plugin | null;
  filters: PluginFilters;
  loading: boolean;
  
  // 操作
  fetchPlugins: () => Promise<void>;
  installPlugin: (id: string, config: any) => Promise<void>;
  uninstallPlugin: (id: string) => Promise<void>;
  setFilters: (filters: PluginFilters) => void;
  selectPlugin: (plugin: Plugin | null) => void;
}
```

### serviceStore
```typescript
interface ServiceStore {
  // 状态
  services: Service[];
  selectedService: Service | null;
  loading: boolean;
  
  // 操作
  fetchServices: () => Promise<void>;
  addService: (config: ServiceConfig) => Promise<void>;
  updateService: (id: string, config: ServiceConfig) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  startService: (id: string) => Promise<void>;
  stopService: (id: string) => Promise<void>;
  testConnection: (config: ServiceConfig) => Promise<boolean>;
}
```

### logStore
```typescript
interface LogStore {
  // 状态
  logs: LogEntry[];
  filters: LogFilters;
  paused: boolean;
  maxLogs: number;
  
  // 操作
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setFilters: (filters: LogFilters) => void;
  togglePause: () => void;
  exportLogs: () => Promise<void>;
}
```

### uiStore
```typescript
interface UIStore {
  // 状态
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  
  // 操作
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}
```

## React Query Hooks

### usePlugins
```typescript
const usePlugins = () => {
  return useQuery({
    queryKey: ['plugins'],
    queryFn: fetchPlugins,
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchOnWindowFocus: false,
  });
};
```

### useServices
```typescript
const useServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    staleTime: 1 * 60 * 1000, // 1分钟
    refetchInterval: 30 * 1000, // 30秒轮询
  });
};
```

### useServiceStatus
```typescript
const useServiceStatus = (serviceId: string) => {
  return useQuery({
    queryKey: ['service-status', serviceId],
    queryFn: () => fetchServiceStatus(serviceId),
    refetchInterval: 10 * 1000, // 10秒轮询
    enabled: !!serviceId,
  });
};
```

### useInstallPlugin
```typescript
const useInstallPlugin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: any }) =>
      installPlugin(id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('插件安装成功');
    },
    onError: (error) => {
      toast.error(`安装失败: ${error.message}`);
    },
  });
};
```

## WebSocket 集成

```typescript
// useWebSocket.ts
const useWebSocket = () => {
  const logStore = useLogStore();
  const serviceStore = useServiceStore();
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/api/ws');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'log':
          logStore.addLog(data.payload);
          break;
        case 'service:status':
          serviceStore.updateServiceStatus(data.payload);
          break;
        case 'connection:status':
          // 更新连接状态
          break;
      }
    };
    
    return () => ws.close();
  }, []);
};
```

## 数据流示例

### 安装插件流程
```
User Click
    ↓
useInstallPlugin()
    ↓
POST /api/plugins/:id/install
    ↓
Backend: Install Plugin
    ↓
WebSocket: Broadcast Update
    ↓
React Query: Invalidate Cache
    ↓
UI: Refetch & Update
```

### 实时日志流
```
Backend: New Log
    ↓
WebSocket: Emit 'log' Event
    ↓
useWebSocket: Handle Message
    ↓
logStore.addLog()
    ↓
LogViewer: Re-render
```

### 服务状态更新
```
Service Status Changed
    ↓
WebSocket: Emit 'service:status'
    ↓
serviceStore.updateServiceStatus()
    ↓
ServiceCard: Re-render with New Status
```

## API Client

```typescript
// api/client.ts
class APIClient {
  private baseURL = '/api';
  
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
  
  async post<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
  
  async put<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
  
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
}

export const apiClient = new APIClient();
```

## 错误处理

```typescript
// utils/errorHandler.ts
export const handleAPIError = (error: unknown) => {
  if (error instanceof Response) {
    toast.error(`请求失败: ${error.statusText}`);
  } else if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error('未知错误');
  }
  
  // 上报错误
  reportError(error);
};

// React Query 全局配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: handleAPIError,
    },
    mutations: {
      onError: handleAPIError,
    },
  },
});
```

## 性能优化

### 1. 数据分页
```typescript
const usePlugins = (page: number, pageSize: number) => {
  return useInfiniteQuery({
    queryKey: ['plugins', page],
    queryFn: ({ pageParam = 1 }) =>
      fetchPlugins({ page: pageParam, pageSize }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};
```

### 2. 虚拟滚动
```typescript
// LogViewer 使用 react-window
<FixedSizeList
  height={600}
  itemCount={logs.length}
  itemSize={50}
>
  {({ index, style }) => (
    <LogEntry log={logs[index]} style={style} />
  )}
</FixedSizeList>
```

### 3. 防抖搜索
```typescript
const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    setFilters({ ...filters, search: value });
  },
  300
);
```

### 4. 乐观更新
```typescript
const useStartService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: startService,
    onMutate: async (serviceId) => {
      // 乐观更新
      queryClient.setQueryData(
        ['services'],
        (old: Service[]) =>
          old.map((s) =>
            s.id === serviceId ? { ...s, status: 'starting' } : s
          )
      );
    },
    onError: (err, serviceId, context) => {
      // 回滚
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};
```
