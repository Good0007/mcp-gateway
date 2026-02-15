# 组件库设计

## 通用组件

### Button 按钮
```tsx
<Button variant="primary" size="md">
  安装
</Button>

// Variants: primary, secondary, danger, ghost
// Sizes: sm, md, lg
```

### Card 卡片
```tsx
<Card>
  <CardHeader>
    <CardTitle>Calculator</CardTitle>
    <Badge status="success">运行中</Badge>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
  <CardFooter>
    {/* 操作按钮 */}
  </CardFooter>
</Card>
```

### Badge 标签
```tsx
<Badge variant="success">官方</Badge>
<Badge variant="info">Beta</Badge>
<Badge variant="warning">实验性</Badge>
<Badge variant="error">已弃用</Badge>
```

### Input 输入框
```tsx
<Input
  label="服务名称"
  placeholder="请输入服务名称"
  error="名称不能为空"
/>
```

### Select 下拉选择
```tsx
<Select
  label="连接类型"
  options={[
    { value: 'stdio', label: 'Stdio (NPX)' },
    { value: 'sse', label: 'SSE' },
  ]}
/>
```

### Switch 开关
```tsx
<Switch
  label="自动启动"
  checked={autoStart}
  onChange={setAutoStart}
/>
```

### Modal 弹窗
```tsx
<Modal open={open} onClose={onClose}>
  <ModalHeader>
    <ModalTitle>插件详情</ModalTitle>
  </ModalHeader>
  <ModalBody>
    {/* 内容 */}
  </ModalBody>
  <ModalFooter>
    <Button onClick={onClose}>取消</Button>
    <Button variant="primary">确认</Button>
  </ModalFooter>
</Modal>
```

### Toast 提示
```tsx
toast.success('服务启动成功');
toast.error('连接失败');
toast.warning('配置未保存');
toast.info('正在加载...');
```

### Loading 加载
```tsx
<Loading />
<Loading text="加载中..." />
<Spinner size="sm" />
```

## 业务组件

### PluginCard 插件卡片
```tsx
<PluginCard
  plugin={plugin}
  onInstall={handleInstall}
  onUninstall={handleUninstall}
  onShowDetails={handleShowDetails}
/>
```

### ServiceCard 服务卡片
```tsx
<ServiceCard
  service={service}
  onStart={handleStart}
  onStop={handleStop}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### StatusIndicator 状态指示器
```tsx
<StatusIndicator
  status="running"
  text="运行中"
  pulse={true}
/>
```

### LogViewer 日志查看器
```tsx
<LogViewer
  logs={logs}
  filters={filters}
  onFilterChange={handleFilterChange}
  autoScroll={true}
/>
```

### ConfigForm 配置表单
```tsx
<ConfigForm
  type="stdio"
  initialValues={config}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### ConnectionStatus 连接状态
```tsx
<ConnectionStatus
  connected={connected}
  uptime={uptime}
  endpoint={endpoint}
  onReconnect={handleReconnect}
/>
```

### ToolList 工具列表
```tsx
<ToolList
  tools={tools}
  groupBy="service"
  onToolClick={handleToolClick}
/>
```

### MetricsChart 指标图表
```tsx
<MetricsChart
  data={metricsData}
  type="line"
  timeRange="1h"
/>
```

## 布局组件

### Layout 主布局
```tsx
<Layout>
  <Sidebar />
  <MainContent>
    <Header />
    <PageContent />
  </MainContent>
</Layout>
```

### Sidebar 侧边栏
```tsx
<Sidebar>
  <SidebarItem icon="🏠" href="/">概览</SidebarItem>
  <SidebarItem icon="🛒" href="/market">市场</SidebarItem>
  <SidebarItem icon="⚙️" href="/services">服务</SidebarItem>
  <SidebarItem icon="📊" href="/monitor">监控</SidebarItem>
  <SidebarItem icon="📝" href="/logs">日志</SidebarItem>
</Sidebar>
```

### Header 顶部栏
```tsx
<Header>
  <HeaderLeft>
    <Logo />
    <Breadcrumb />
  </HeaderLeft>
  <HeaderRight>
    <ConnectionStatus />
    <NotificationBell />
    <UserMenu />
  </HeaderRight>
</Header>
```

### PageHeader 页面头部
```tsx
<PageHeader
  title="插件市场"
  description="浏览和安装 MCP 插件"
  actions={
    <Button onClick={handleRefresh}>刷新</Button>
  }
/>
```

### EmptyState 空状态
```tsx
<EmptyState
  icon="📦"
  title="暂无服务"
  description="开始添加第一个 MCP 服务"
  action={
    <Button onClick={handleAdd}>添加服务</Button>
  }
/>
```

## 组件目录结构

```
src/components/
├── ui/                     # 通用 UI 组件
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Switch.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── Loading.tsx
├── business/              # 业务组件
│   ├── PluginCard.tsx
│   ├── ServiceCard.tsx
│   ├── StatusIndicator.tsx
│   ├── LogViewer.tsx
│   ├── ConfigForm.tsx
│   ├── ConnectionStatus.tsx
│   ├── ToolList.tsx
│   └── MetricsChart.tsx
├── layout/                # 布局组件
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── PageHeader.tsx
│   └── EmptyState.tsx
└── index.ts               # 统一导出
```

## 样式规范

### 颜色系统
```css
/* 主色 */
--primary: #3b82f6;
--primary-hover: #2563eb;

/* 状态色 */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #06b6d4;

/* 中性色 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-500: #6b7280;
--gray-900: #111827;
```

### 间距系统
```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

### 圆角
```css
--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem;   /* 8px */
--radius-xl: 0.75rem;  /* 12px */
```

### 阴影
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
```
