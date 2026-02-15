# 文档中心

## 快速开始

- **[README](../README.md)** - 项目概览、特性和基本使用
- **[QUICKSTART](../QUICKSTART.md)** - 快速启动指南（3 步启动服务）

## 技术文档

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 系统架构设计
- **[TECHNICAL_SPEC.md](TECHNICAL_SPEC.md)** - 技术规范和接口定义

## 集成指南

- **[MULTI_SERVICES.md](MULTI_SERVICES.md)** - 多服务集成指南
- **[IMPORT_CONFIG_GUIDE.md](IMPORT_CONFIG_GUIDE.md)** - 配置导入说明
- **[GUI_ARCHITECTURE.md](GUI_ARCHITECTURE.md)** - Web 界面架构

## 参考

- **[ARCHIVED.md](ARCHIVED.md)** - 已归档的历史文档


| 文档 | 行数 | 主要内容 | 目标读者 |
|-----|------|---------|---------|
| README | ~200 | 项目概览 | 所有人 |
| QUICK_START | ~450 | 使用教程 | 用户/运维 |
| ARCHITECTURE | ~650 | 架构设计 | 开发者/架构师 |
| TECHNICAL_SPEC | ~700 | 技术细节 | 开发者 |
| IMPLEMENTATION_PLAN | ~550 | 开发计划 | 项目经理/开发者 |
| DESIGN_REVIEW | ~600 | 质量审查 | 技术负责人 |

## 🎯 按角色推荐阅读顺序

### 👤 普通用户
1. README - 了解项目
2. QUICK_START - 学习使用
3. (完成，可开始使用)

### 👨‍💻 开发者
1. README - 项目概览
2. ARCHITECTURE - 理解架构
3. TECHNICAL_SPEC - 掌握技术细节
4. IMPLEMENTATION_PLAN - 了解开发计划
5. DESIGN_REVIEW - 学习最佳实践

### 🏗️ 架构师/技术负责人
1. ARCHITECTURE - 整体架构
2. DESIGN_REVIEW - 质量评估
3. TECHNICAL_SPEC - 技术方案
4. IMPLEMENTATION_PLAN - 项目规划

### 📋 项目经理
1. README - 项目背景
2. IMPLEMENTATION_PLAN - 进度计划
3. DESIGN_REVIEW - 风险评估

## 🔄 文档维护

### 更新频率
- **README**: 每个版本
- **QUICK_START**: 功能变更时
- **ARCHITECTURE**: 架构重大变更时
- **TECHNICAL_SPEC**: 接口或规范变更时
- **IMPLEMENTATION_PLAN**: 每周更新进度
- **DESIGN_REVIEW**: 每个Phase结束后

### 版本控制
所有文档顶部都包含版本号和更新日期：
```markdown
> 版本：v0.1.0  
> 日期：2026-02-14  
> 状态：设计阶段
```

### 文档审核流程
1. 开发者起草或更新文档
2. 技术负责人审核
3. 标记审核状态（待审核/已审核）
4. 合并到主分支

## 📝 文档规范

### Markdown规范
- 使用统一的标题层级
- 代码块指定语言
- 表格对齐
- 使用Emoji增强可读性（适度）

### 代码示例规范
```typescript
// ✅ 好的示例：完整、可运行
class GoodExample {
  private value: string;
  
  constructor(value: string) {
    this.value = value;
  }
  
  getValue(): string {
    return this.value;
  }
}
```

```typescript
// ❌ 避免：简化但省略关键部分导致无法理解
class BadExample {
  // ... 实现
}
```

### 图表规范
- ASCII艺术图用于简单关系
- 复杂架构考虑使用Mermaid
- 保持图表简洁清晰

## 🔗 外部资源

### MCP官方
- [MCP官方网站](https://modelcontextprotocol.io/)
- [MCP规范](https://spec.modelcontextprotocol.io/)
- [MCP SDK文档](https://github.com/modelcontextprotocol/sdk)

### 小智AI
- [小智MCP接入规范](https://my.feishu.cn/wiki/HiPEwZ37XiitnwktX13cEM5KnSb)
- [官方示例：mcp-calculator](https://github.com/78/mcp-calculator)

### 参考项目
- [mcp_server_exe](https://github.com/shadowcz007/mcp_server_exe)

### 技术文档
- [TypeScript官方文档](https://www.typescriptlang.org/docs/)
- [Node.js文档](https://nodejs.org/docs/)
- [Zod文档](https://zod.dev/)
- [Winston日志](https://github.com/winstonjs/winston)

## ❓ 常见问题

### 文档相关
- **Q: 文档太长，如何快速找到需要的信息？**
  - A: 使用本文档的"按角色推荐阅读顺序"，或使用编辑器的搜索功能

- **Q: 发现文档有错误或过时？**
  - A: 提交Issue或直接PR修正

- **Q: 想贡献文档？**
  - A: 欢迎！遵循文档规范，提交PR即可

### 技术相关
请查看 [QUICK_START.md](QUICK_START.md) 的"故障排查"章节

## 📮 反馈

如有任何问题或建议：
- 提交 [GitHub Issue](https://github.com/your-repo/issues)
- 发送邮件到项目维护者
- 加入开发者社区讨论

---

**文档版本**: v0.1.0  
**最后更新**: 2026-02-14  
**维护者**: MCP Agent开发团队
