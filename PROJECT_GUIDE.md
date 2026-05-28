# Bloom Together - 双人规划应用

## 📋 项目概述

**项目名称**：Bloom Together  
**项目类型**：全栈 Web 应用（Next.js + Supabase）  
**部署地址**：https://www.guo-fu.top/  
**GitHub 仓库**：https://github.com/sageguo425-gsj/bloom-together.git  
**本地路径**：`G:\工作文件\软件\project\planning-app`

**项目定位**：一个治愈系的双人时间管理与习惯养成应用，支持个人使用和伴侣协作。

---

## 🛠️ 技术栈

### 前端
- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **UI组件**：自定义组件 + Lucide Icons
- **图表**：Recharts

### 后端
- **数据库**：Supabase (PostgreSQL)
- **认证**：Supabase Auth
- **实时功能**：Supabase Realtime

### 部署
- **平台**：Vercel
- **自动部署**：推送到 main 分支自动触发部署

---

## 📁 项目结构

```
planning-app/
├── app/                          # Next.js App Router
│   ├── dashboard/               # 主应用页面
│   │   ├── page.tsx            # 首页（仪表盘）
│   │   ├── tasks/              # 任务管理
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── TaskCard.tsx
│   │   │       └── TaskForm.tsx
│   │   ├── projects/           # 项目管理
│   │   ├── habits/             # 习惯养成
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── HabitCard.tsx
│   │   │       ├── HabitForm.tsx
│   │   │       └── HabitCalendar.tsx
│   │   ├── pomodoro/           # 番茄钟
│   │   ├── partner/            # 伴侣空间
│   │   │   └── components/
│   │   │       └── DashboardNav.tsx  # 全局导航栏
│   │   └── layout.tsx          # Dashboard 布局
│   ├── login/                   # 登录页
│   ├── register/                # 注册页
│   ├── globals.css             # 全局样式
│   └── layout.tsx              # 根布局
├── lib/
│   ├── supabase/               # Supabase 客户端
│   │   └── client.ts
│   ├── types/                  # TypeScript 类型定义
│   │   ├── task.ts
│   │   ├── habit.ts
│   │   ├── project.ts
│   │   └── database.ts
│   ├── services/               # 业务逻辑服务
│   │   ├── userService.ts
│   │   ├── partnerService.ts
│   │   └── expService.ts       # 经验系统服务
│   └── utils/                  # 工具函数
│       └── levelSystem.ts      # 等级计算工具
├── components/                  # 共享组件
│   └── UserSettingsModal.tsx
├── database/
│   └── schema.sql              # 数据库表结构
├── supabase/
│   └── migrations/             # 数据库迁移文件
└── public/                     # 静态资源
```

---

## 🗄️ 数据库结构

### 核心表

#### 1. users（用户表）
```sql
- id: UUID (主键，关联 auth.users)
- email: TEXT
- username: TEXT
- avatar: TEXT
- partner_id: UUID (关联其他用户)
- level: INTEGER (等级，默认1)
- exp: INTEGER (经验值，默认0)
- created_at: TIMESTAMP
```

#### 2. tasks（任务表）
```sql
- id: SERIAL (主键)
- user_id: UUID (外键 -> users)
- project_id: INTEGER (外键 -> projects，可选)
- habit_id: UUID (外键 -> habits，可选，注意是UUID类型)
- title: TEXT
- description: TEXT
- date: DATE
- start_time: TIME
- end_time: TIME
- estimated_duration: INTEGER (分钟)
- priority: TEXT (high/medium/low)
- status: TEXT (pending/in_progress/completed)
- tags: TEXT[]
- is_shared: BOOLEAN
- created_at: TIMESTAMP
- completed_at: TIMESTAMP
```

#### 3. habits（习惯表）
```sql
- id: UUID (主键，注意是UUID不是SERIAL)
- user_id: UUID (外键 -> users)
- name: TEXT
- description: TEXT
- icon: TEXT (emoji)
- color: TEXT
- frequency: JSONB
- goal: JSONB
- current_streak: INTEGER
- longest_streak: INTEGER
- total_checkins: INTEGER
- last_checkin_date: DATE
- related_task_ids: TEXT[]
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 4. habit_checkins（习惯打卡表）
```sql
- id: UUID (主键)
- habit_id: UUID (外键 -> habits)
- user_id: UUID (外键 -> users)
- checkin_date: DATE
- checkin_time: TIME
- note: TEXT
- auto_checkin: BOOLEAN
- created_at: TIMESTAMP
```

#### 5. projects（项目表）
```sql
- id: SERIAL (主键)
- user_id: UUID (外键 -> users)
- title: TEXT
- description: TEXT
- start_date: DATE
- end_date: DATE
- status: TEXT (active/completed/archived)
- priority: TEXT (high/medium/low)
- is_shared: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 6. pomodoro_sessions（番茄钟会话表）
```sql
- id: UUID (主键)
- user_id: UUID (外键 -> users)
- task_id: SERIAL (外键 -> tasks，可选)
- started_at: TIMESTAMP
- duration: INTEGER (秒)
- completed: BOOLEAN
- interrupted_at: TIMESTAMP
- created_at: TIMESTAMP
```

#### 7. user_tags（用户标签表）
```sql
- id: SERIAL (主键)
- user_id: UUID (外键 -> users)
- name: TEXT
- color: TEXT
- created_at: TIMESTAMP
```

---

## 🎯 核心功能模块

### 1. 首页（Dashboard）
**文件**：`app/dashboard/page.tsx`

**功能**：
- 欢迎卡片：显示用户名和问候语
- 伴侣空间入口：显示伴侣连接状态
- 统计卡片（4个）：
  - 今日任务完成情况
  - 今日专注时长
  - 习惯打卡进度
  - 活跃项目数量
- 今日任务列表：
  - 显示选定日期的任务
  - 支持日期切换（前一天/后一天）
  - 显示任务详情：时间、预计时长、项目/习惯、优先级、标签
  - 点击复选框完成任务（自动增加10经验）
  - 固定高度656px，任务多时可滚动
- 每日日程时间轴：
  - 7:00-23:00 时间段显示
  - 任务块合并显示，居中显示任务名称
  - 绿色系渐变、磨砂玻璃效果
  - 根据任务状态显示不同颜色
  - 固定高度656px，可滚动
- 专注时长统计：
  - 本周专注时长（折线图）
  - 本月专注时长（条形图）
  - 项目专注时长（横向条形图）
    - 默认显示未完成项目
    - 可选择显示已完成项目

**关键函数**：
- `loadTodayTasks()` - 加载指定日期的任务
- `handleDateChange()` - 切换日期
- `handleToggleTaskStatus()` - 切换任务完成状态（会增加经验）
- `loadPomodoroStats()` - 加载番茄钟统计
- `loadProjectFocusData()` - 加载项目专注时长

### 2. 任务管理（Tasks）
**文件**：`app/dashboard/tasks/page.tsx`

**功能**：
- 任务列表展示（卡片式）
- 创建/编辑/删除任务
- 任务筛选（按状态、优先级）
- 任务排序（按日期、优先级、创建时间）
- 批量操作
- 启动番茄钟

**任务卡片**（TaskCard.tsx）：
- 显示任务标题、描述
- 显示时间、预计时长
- 显示优先级（红/橙/蓝色标签）
- 显示所属项目（蓝色标签，文件夹图标）
- 显示所属习惯（绿色标签，打勾图标）
- 显示标签分类
- 完成状态复选框

**任务表单**（TaskForm.tsx）：
- 标题、描述
- 日期、时间范围
- 预计时长（自动计算或手动输入）
- 优先级选择
- 状态选择
- 项目/习惯关联（二选一）
- 标签管理

### 3. 项目管理（Projects）
**文件**：`app/dashboard/projects/page.tsx`

**功能**：
- 项目列表展示
- 创建/编辑/删除项目
- 项目状态管理（进行中/已完成/已归档）
- 项目日记功能
- 项目任务关联

### 4. 习惯养成（Habits）
**文件**：`app/dashboard/habits/page.tsx`

**功能**：
- 习惯列表展示
- 创建/编辑/删除习惯
- 习惯打卡（点击打卡按钮，自动增加10经验）
- 连续打卡统计
- 习惯日历视图
- 打卡历史记录

**关键函数**：
- `handleCheckin()` - 习惯打卡（会增加经验）

### 5. 番茄钟（Pomodoro）
**文件**：`app/dashboard/pomodoro/page.tsx`

**功能**：
- 番茄钟计时器（25分钟工作，5分钟休息）
- 关联任务
- 白噪音播放
- 专注统计

### 6. 伴侣空间（Partner）
**文件**：`app/dashboard/partner/page.tsx`

**功能**：
- 伴侣连接/解除
- 共享任务和项目
- 伴侣动态查看

### 7. 经验与等级系统
**文件**：
- `lib/utils/levelSystem.ts` - 等级计算工具
- `lib/services/expService.ts` - 经验服务

**机制**：
- **经验获取**：
  - 完成一个任务：+10 EXP
  - 习惯打卡一次：+10 EXP
- **等级曲线**：`100 × (level - 1) + 50 × (level - 1)²`
- **等级称号**：
  - Lv.1-5：🌱 萌芽期
  - Lv.6-10：🌿 成长期
  - Lv.11-20：🌳 茁壮期
  - Lv.21-30：🌲 繁茂期
  - Lv.31-50：🌟 绽放期
  - Lv.51+：👑 大师期
- **显示位置**：
  - 导航栏：显示等级
  - 下拉菜单：显示称号、等级、经验条、进度

**关键函数**：
- `getExpForLevel(level)` - 计算指定等级所需经验
- `getLevelFromExp(exp)` - 根据经验计算等级
- `getLevelProgress(totalExp)` - 获取等级进度
- `getLevelTitle(level)` - 获取等级称号
- `addUserExp(userId, expAmount)` - 增加用户经验
- `addExpForTaskCompletion(userId)` - 任务完成增加经验
- `addExpForHabitCheckin(userId)` - 习惯打卡增加经验

---

## 🎨 设计风格

### 配色方案（治愈系绿色主题）
- **主色**：Emerald (#10b981)
- **辅助色**：Teal (#14b8a6)
- **强调色**：Green (#22c55e)
- **背景**：渐变 + 毛玻璃效果

### UI特点
- 圆角设计（rounded-2xl, rounded-3xl）
- 渐变背景
- 磨砂玻璃效果（backdrop-blur）
- 柔和阴影
- 平滑过渡动画
- 自定义滚动条（绿色系）

---

## 🔧 开发指南

### 本地开发
```bash
cd "G:\工作文件\软件\project\planning-app"
npm install
npm run dev
```

### 数据库迁移
```bash
# 链接到 Supabase 项目
supabase link --project-ref mqpaaughmckiujrfhnlh

# 推送迁移
supabase db push
```

### Git 工作流
```bash
# 查看状态
git status

# 添加更改
git add -A

# 提交
git commit -m "描述信息"

# 推送（自动触发 Vercel 部署）
git push
```

---

## ⚠️ 重要注意事项

### 1. 类型不匹配问题
- **习惯ID**：`habits.id` 是 `UUID` 类型（字符串）
- **任务关联**：`tasks.habit_id` 也是 `UUID` 类型（字符串）
- **项目ID**：`projects.id` 是 `SERIAL` 类型（数字）
- **任务关联**：`tasks.project_id` 是 `INTEGER` 类型（数字）

### 2. 数据加载
- 首页任务列表需要同时加载项目名称和习惯名称
- 使用 `Promise.all` 并行加载关联数据

### 3. 日期同步
- 首页的"今日任务"和"每日日程"共享同一个 `selectedDate` 状态
- 切换日期时会触发 `useEffect` 重新加载任务

### 4. 经验系统
- 任务完成时调用 `addExpForTaskCompletion()`
- 习惯打卡时调用 `addExpForHabitCheckin()`
- 升级时显示提示弹窗

---

## 🐛 已知问题与解决方案

### 问题1：任务关联习惯无法保存
**原因**：类型不匹配，habit_id 是 UUID 但代码中使用了 Number() 转换  
**解决**：直接使用字符串值，不进行类型转换

### 问题2：日期切换时任务不更新
**原因**：useEffect 依赖数组配置不当  
**解决**：添加独立的 useEffect 监听 selectedDate 变化

### 问题3：任务卡片高度不一致
**原因**：使用了 h-full 导致高度不固定  
**解决**：设置固定高度 656px，内容区域可滚动

---

## 📝 常见修改场景

### 添加新的经验获取方式
1. 在 `lib/services/expService.ts` 中添加新函数
2. 在对应的操作完成后调用该函数
3. 检查是否升级并显示提示

### 修改等级曲线
1. 编辑 `lib/utils/levelSystem.ts` 中的 `getExpForLevel()` 函数
2. 调整公式参数

### 添加新的任务字段
1. 更新 `lib/types/task.ts` 中的类型定义
2. 修改 `TaskForm.tsx` 添加表单字段
3. 修改 `TaskCard.tsx` 显示新字段
4. 更新数据库表结构（创建迁移文件）

### 修改UI样式
1. 全局样式：编辑 `app/globals.css`
2. 组件样式：直接修改组件中的 Tailwind 类名
3. 主题色：修改 `globals.css` 中的 CSS 变量

---

## 📞 联系信息

**开发者**：Sage  
**邮箱**：2675564076@qq.com  
**项目地址**：https://www.guo-fu.top/

---

## 📄 许可证

本项目为个人项目，未指定开源许可证。

---

**最后更新**：2026年5月28日
