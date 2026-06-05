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
- **框架**：Next.js 16.2.6 (App Router)
- **运行时**：React 19.2.4
- **语言**：TypeScript
- **样式**：Tailwind CSS 4
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
│   │   │       ├── DashboardNav.tsx  # 全局导航栏
│   │   │       ├── PartnerPet.tsx    # 伴侣空间宠物面板
│   │   │       ├── DesktopPet.tsx    # 全站桌面宠物
│   │   │       └── AnimatedGermanShepherd.tsx # 德牧宠物形象与互动
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
│   │   ├── petService.ts       # 伴侣宠物服务
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
    └── pets/                   # 宠物图片资源
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
- exp_spent: INTEGER (宠物喂食已消耗经验，默认0)
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
- status: TEXT (pending/in_progress/completed)
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

#### 8. couple_pets（伴侣宠物表）
```sql
- id: UUID (主键)
- couple_key: TEXT (伴侣双方稳定键，唯一)
- user1_id: UUID (外键 -> users)
- user2_id: UUID (外键 -> users)
- name: TEXT (默认“阿凛”)
- species: TEXT (默认 german_shepherd)
- growth: INTEGER (成长值)
- hunger: INTEGER (数据库字段名，前端显示为“饱腹感”，默认0，范围0-100)
- happiness: INTEGER (快乐值，范围0-100)
- cleanliness: INTEGER (清洁度，范围0-100)
- last_fed_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 9. pet_feed_logs（宠物喂食记录表）
```sql
- id: UUID (主键)
- pet_id: UUID (外键 -> couple_pets)
- user_id: UUID (外键 -> users)
- food_type: TEXT (bone/beef/cake)
- exp_cost: INTEGER
- growth_gain: INTEGER
- hunger_gain: INTEGER (前端语义为饱腹感增加值)
- happiness_gain: INTEGER
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
  - 图表顶部预留标签空间，避免数值被卡片边框遮挡
  - 时间格式统一：不足1小时显示“X分钟”，达到1小时显示“X小时Y分钟”

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
  - “全部”只显示未完成任务，即 `pending` + `in_progress`
  - “已完成”作为独立筛选入口查看历史完成任务
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
- 项目筛选：
  - “全部”只显示未完成项目，即 `pending` + `in_progress`
  - “已完成”作为独立筛选入口查看历史完成项目
- 项目状态管理（未开始/进行中/已完成）
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
- 伴侣宠物：
  - 德牧宠物“阿凛”，兼具可爱和帅气的卡通风格
  - 伴侣双方共享同一只宠物，数据通过 `couple_key` 绑定
  - 宠物成长值、饱腹感、快乐值实时同步
  - 喂食会消耗用户可用经验（`exp - exp_spent`），并增加成长值、饱腹感和快乐值
  - 食物配置：
    - 骨头：消耗1 EXP，成长+1，饱腹感+8，快乐+1
    - 牛肉：消耗5 EXP，成长+8，饱腹感+30，快乐+5，每对伴侣每天最多3次
    - 小蛋糕：消耗10 EXP，成长+20，饱腹感+15，快乐+20，每对伴侣每天最多2次
  - 右下角桌面宠物在 Dashboard 各页面独立显示；无背景卡片，只显示宠物本体
  - 鼠标悬停宠物时显示“喂食”“抚摸”按钮和饱腹感进度条
  - 直接拖动宠物本体即可移动位置，位置保存到 `localStorage`

**关键文件/函数**：
- `DesktopPet.tsx` - 全站桌面宠物容器、位置保存、喂食菜单
- `AnimatedGermanShepherd.tsx` - 宠物形象、悬停按钮、饱腹感显示、互动动画
- `petService.ts` - 食物配置、成长阶段、喂食 RPC 封装
- `feed_couple_pet()` - Supabase RPC，负责经验消耗、宠物数值更新和喂食次数限制

### 7. 经验与等级系统
**文件**：
- `lib/utils/levelSystem.ts` - 等级计算工具
- `lib/services/expService.ts` - 经验服务

**机制**：
- **经验获取**：
  - 完成一个任务：+10 EXP
  - 习惯打卡一次：+10 EXP
- **经验消耗**：
  - 宠物喂食会增加 `users.exp_spent`
  - 可用经验 = `exp - exp_spent`
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
- 宠物喂食不直接扣减 `exp`，而是累加 `exp_spent`；展示可用经验时使用 `exp - exp_spent`

### 5. 任务/项目筛选语义
- 任务管理页的“全部”不是数据库意义上的全部，而是当前待办视图：`status !== 'completed'`
- 项目管理页的“全部”同样只显示未完成项目：`status !== 'completed'`
- 已完成任务和已完成项目必须通过“已完成”筛选单独查看

### 6. 宠物字段命名
- 数据库沿用字段名 `hunger`，但前端统一显示为“饱腹感”
- 新建宠物的 `hunger` 默认值是 `0`
- 旧数据中从未喂食过的宠物通过迁移校正为 `0`
- 不要在 UI 文案中再使用“饥饿值”

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

### 问题4：专注时长图表顶部数值被边框遮挡
**原因**：Recharts 顶部 `LabelList` 没有足够上边距
**解决**：周/月图表设置 `margin.top`，并统一使用 `formatChartFocusMinutes()` 格式化标签

### 问题5：桌面宠物交互按钮遮挡宠物
**原因**：按钮放在宠物图层上方，悬停时与宠物主体重叠
**解决**：按钮固定在宠物上方独立区域，宠物本体负责拖动，饱腹感条只在悬停时显示

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

### 修改宠物喂食逻辑
1. 前端食物配置：编辑 `lib/services/petService.ts` 中的 `PET_FOODS`
2. 数据库喂食逻辑：新增 Supabase migration，更新 `feed_couple_pet()` RPC
3. 若新增食物类型，同步更新 `pet_feed_logs.food_type` 的 CHECK 约束
4. 保持前端显示语义为“饱腹感”，数据库字段仍使用 `hunger`

### 修改桌面宠物外观/交互
1. 宠物形象资源放在 `public/pets/`
2. 修改 `app/dashboard/partner/components/AnimatedGermanShepherd.tsx` 调整形象、按钮、进度条和动画
3. 修改 `app/dashboard/partner/components/DesktopPet.tsx` 调整全站悬浮位置、拖动和喂食菜单
4. 桌宠入口在 `app/dashboard/layout.tsx`，不要只挂在伴侣空间页面内

---

## 📞 联系信息

**开发者**：Sage  
**邮箱**：2675564076@qq.com  
**项目地址**：https://www.guo-fu.top/

---

## 📄 许可证

本项目为个人项目，未指定开源许可证。

---

**最后更新**：2026年6月5日
