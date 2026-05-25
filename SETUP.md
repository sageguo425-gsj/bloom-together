# 项目设置指南

## ✅ 已完成

### 1. 项目基础架构搭建

项目已成功创建并配置完成！以下是已完成的工作：

#### 技术栈
- ✅ Next.js 15 + TypeScript
- ✅ Tailwind CSS
- ✅ Supabase 客户端配置
- ✅ 核心依赖安装完成

#### 项目结构
```
planning-app/
├── app/                      # Next.js 应用
│   ├── globals.css          # 全局样式（已自定义）
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 欢迎页面
├── lib/                     # 工具库
│   ├── supabase/            # Supabase 客户端
│   │   ├── client.ts        # 浏览器端客户端
│   │   └── server.ts        # 服务端客户端
│   ├── audio/               # 音频管理
│   │   ├── media-session.ts # 后台音频播放
│   │   └── wake-lock.ts     # 防止休眠
│   ├── constants/           # 常量定义
│   │   └── white-noise.ts   # 白噪音配置
│   ├── types/               # TypeScript 类型
│   │   └── database.ts      # 数据库类型定义
│   └── utils.ts             # 工具函数
├── database/                # 数据库脚本
│   └── schema.sql           # 完整的数据库表结构
├── .env.local               # 环境变量（需要配置）
└── README.md                # 项目文档
```

#### 核心功能模块
- ✅ 音频管理器（支持后台播放）
- ✅ Wake Lock（防止设备休眠）
- ✅ 白噪音配置
- ✅ 数据库类型定义
- ✅ 工具函数库

---

## 🚀 开发服务器

开发服务器已启动并运行在：
- **本地地址**: http://localhost:3000
- **网络地址**: http://172.25.186.142:3000

你现在可以在浏览器中打开 http://localhost:3000 查看欢迎页面！

---

## 📋 下一步：配置 Supabase

### 步骤 1：创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 创建新组织（如果还没有）
4. 创建新项目：
   - 项目名称：planning-app（或你喜欢的名字）
   - 数据库密码：设置一个强密码（保存好！）
   - 区域：选择离你最近的区域（建议选择 Singapore 或 Tokyo）
5. 等待项目创建完成（约 2 分钟）

### 步骤 2：获取项目配置

项目创建完成后：

1. 进入项目设置（Settings）
2. 点击 "API" 选项卡
3. 复制以下信息：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 步骤 3：更新环境变量

编辑 `.env.local` 文件，填入你的配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 步骤 4：运行数据库迁移

1. 在 Supabase 项目中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query"
3. 打开项目中的 `database/schema.sql` 文件
4. 复制所有内容
5. 粘贴到 Supabase SQL Editor
6. 点击 "Run" 执行

执行成功后，你会看到所有表都已创建！

### 步骤 5：验证数据库

1. 点击左侧菜单的 "Table Editor"
2. 你应该能看到以下表：
   - users
   - projects
   - tasks
   - pomodoros
   - habits
   - habit_checkins
   - white_noise_presets
   - daily_stats
   - 等等...

---

## 🎯 开发路线图

### 第一阶段：用户认证（第 2 周）
- [ ] 注册页面
- [ ] 登录页面
- [ ] 个人资料页面
- [ ] 伴侣关联功能

### 第二阶段：任务管理（第 3-4 周）
- [ ] 任务 CRUD
- [ ] 任务列表视图
- [ ] 时间块视图
- [ ] 拖拽功能

### 第三阶段：项目管理（第 5 周）
- [ ] 项目 CRUD
- [ ] 项目日记
- [ ] 项目进度展示

### 第四阶段：番茄钟（第 6-7 周）
- [ ] 计时器功能
- [ ] 全屏模式
- [ ] 白噪音集成
- [ ] 后台播放

### 第五阶段：习惯养成（第 8 周）
- [ ] 习惯 CRUD
- [ ] 打卡功能
- [ ] 日历视图

### 第六阶段：数据统计（第 9 周）
- [ ] 统计图表
- [ ] 双人对比
- [ ] 数据导出

### 第七阶段：伴侣空间（第 10 周）
- [ ] 查看伴侣规划
- [ ] 互动功能
- [ ] 留言板

---

## 💡 开发提示

### 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 类型检查
npx tsc --noEmit
```

### 推荐的开发工具

- **VS Code 扩展**：
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin (Volar)

### 调试技巧

1. **查看 Supabase 日志**：
   - 在 Supabase 项目中，点击 "Logs" 查看实时日志

2. **调试 API 请求**：
   - 使用浏览器开发者工具的 Network 选项卡

3. **数据库查询**：
   - 在 Supabase SQL Editor 中测试查询

---

## 📚 学习资源

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs)

---

## 🐛 常见问题

### Q: 开发服务器启动失败？
A: 检查端口 3000 是否被占用，或者使用 `npm run dev -- -p 3001` 指定其他端口。

### Q: Supabase 连接失败？
A: 检查 `.env.local` 文件是否正确配置，确保 URL 和 Key 没有多余的空格。

### Q: 数据库迁移失败？
A: 确保按顺序执行 SQL 语句，如果有错误，先删除已创建的表再重新执行。

### Q: 白噪音无法播放？
A: 确保 `public/sounds/` 目录下有对应的音频文件（需要自行准备）。

---

## 🎉 恭喜！

项目基础架构已经搭建完成！你现在可以：

1. ✅ 访问 http://localhost:3000 查看欢迎页面
2. 📝 配置 Supabase 数据库
3. 🚀 开始开发核心功能

祝你开发顺利！💪
