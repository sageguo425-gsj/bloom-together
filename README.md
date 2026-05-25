# 双人规划空间 (Planning Together)

一个温馨的双人共享规划管理系统，专为情侣设计，帮助彼此了解对方的目标和进度，互相鼓励和支持。

## ✨ 核心功能

### 📋 任务管理
- 创建、编辑、删除任务
- 任务列表和时间块视图
- 拖拽调整任务时间
- 任务与项目、习惯关联

### 🎯 项目管理
- 长期目标管理
- 项目日记记录
- 自动计算项目进度
- 任务关联和追踪

### 🍅 番茄钟
- 25分钟专注计时
- 全屏专注模式
- 8种白噪音可混合播放
- 后台持续播放（支持锁屏）
- 自定义混音方案

### ✅ 习惯养成
- 习惯打卡功能
- 连续打卡统计
- 日历视图展示
- 习惯链激励

### 📊 数据统计
- 多维度数据分析
- 专注时长统计
- 任务完成率
- 双人数据对比

### 💕 伴侣空间
- 查看伴侣的规划
- 互相点赞鼓励
- 留言板交流
- 共享项目和任务

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 15 (React 19)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件**: shadcn/ui
- **状态管理**: Zustand
- **图表**: Recharts
- **拖拽**: @dnd-kit
- **表单**: React Hook Form + Zod

### 后端
- **BaaS**: Supabase
  - PostgreSQL 数据库
  - 认证服务
  - 实时订阅
  - 存储服务

### 部署
- **前端**: Vercel
- **数据库**: Supabase

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

然后编辑 `.env.local` 文件，填入你的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 复制项目 URL 和 anon key
4. 更新 `.env.local` 文件

### 4. 运行数据库迁移

在 Supabase 项目的 SQL Editor 中运行 `database/schema.sql` 文件中的 SQL 语句。

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
planning-app/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 认证相关页面
│   ├── (dashboard)/         # 主应用页面
│   ├── api/                 # API 路由
│   ├── globals.css          # 全局样式
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 首页
├── components/              # React 组件
│   ├── ui/                  # UI 基础组件
│   ├── tasks/               # 任务相关组件
│   ├── projects/            # 项目相关组件
│   ├── habits/              # 习惯相关组件
│   └── pomodoro/            # 番茄钟相关组件
├── lib/                     # 工具函数和配置
│   ├── supabase/            # Supabase 客户端
│   ├── audio/               # 音频管理
│   ├── constants/           # 常量定义
│   ├── types/               # TypeScript 类型
│   └── utils.ts             # 工具函数
├── hooks/                   # 自定义 React Hooks
├── public/                  # 静态资源
│   ├── sounds/              # 白噪音音频文件
│   └── icons/               # 图标文件
├── database/                # 数据库脚本
│   └── schema.sql           # 数据库表结构
└── package.json             # 项目依赖
```

## 🗄️ 数据库设计

主要数据表：

- `users` - 用户表
- `projects` - 项目表
- `project_journals` - 项目日记表
- `tasks` - 任务表
- `pomodoros` - 番茄钟记录表
- `habits` - 习惯表
- `habit_checkins` - 习惯打卡记录表
- `white_noise_presets` - 白噪音方案表
- `white_noise_preset_sounds` - 方案详情表
- `daily_stats` - 每日统计表

详细的数据库结构请查看 `database/schema.sql`。

## 🎨 设计理念

- **温馨自然**: 柔和的配色和圆角设计
- **游戏化**: 等级、经验值、成就系统
- **双人互动**: 共享、点赞、鼓励
- **专注体验**: 番茄钟 + 白噪音
- **数据驱动**: 多维度统计分析

## 📝 开发计划

- [x] 项目基础架构搭建
- [ ] 配置 Supabase 数据库
- [ ] 实现用户认证系统
- [ ] 开发任务管理功能
- [ ] 开发项目管理功能
- [ ] 开发番茄钟功能
- [ ] 开发习惯养成功能
- [ ] 开发数据统计功能
- [ ] 开发伴侣空间功能
- [ ] UI/UX 优化和测试

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
