# 番茄钟功能说明

## 功能概览

番茄钟页面现已实现以下高级功能：

### 1. 后台播放功能

#### Media Session API
- **媒体控制通知**：在手机锁屏界面和通知栏显示番茄钟控制器
- **系统媒体控制**：支持通过耳机、蓝牙设备等硬件按钮控制
- **显示信息**：显示当前模式（专注/休息）和关联的任务名称

#### Wake Lock API
- **防止休眠**：计时器运行时自动保持屏幕唤醒
- **自动恢复**：页面重新可见时自动重新获取 Wake Lock
- **智能释放**：暂停或重置时自动释放 Wake Lock

#### 后台计时
- **持续计时**：切换到其他 APP 或锁屏后继续计时
- **标题更新**：浏览器标签标题实时显示剩余时间
- **跨页面同步**：使用 localStorage 实现多标签页同步（可选）

### 2. 提醒功能

#### 震动提醒
- **完成提醒**：番茄钟完成时震动 3 次（200ms-100ms-200ms）
- **通知提醒**：开始计时时短震动提示
- **自动降级**：不支持震动的设备自动跳过

#### 浏览器通知
- **权限请求**：首次访问自动请求通知权限
- **完成通知**：番茄钟完成时显示通知，包含图标和操作按钮
- **持久通知**：使用 `requireInteraction` 确保用户看到通知
- **自定义内容**：根据模式（工作/休息）显示不同的通知内容

#### 音效提醒
- **成功音效**：番茄钟完成时播放成功音效
- **开始音效**：开始计时时播放提示音
- **音量控制**：预设合适的音量级别

### 3. 统计记录功能

#### 数据记录
- **会话记录**：记录每个番茄钟的完整信息
  - 开始时间 (`started_at`)
  - 结束时间 (`ended_at`)
  - 中断时间 (`interrupted_at`)
  - 完成状态 (`completed`)
  - 时长 (`duration`)
  - 模式 (`mode`: work/shortBreak/longBreak)
  
- **关联信息**：
  - 关联任务 (`task_id`)
  - 关联项目 (`project_id`)
  - 备注信息 (`notes`)

#### 统计展示
- **今日完成**：今天完成的番茄钟数量
- **本周完成**：最近 7 天完成的番茄钟数量
- **总专注时长**：累计专注时间（小时/分钟）
- **完成率**：完成的番茄钟占总开始数的百分比

#### 历史记录
- **最近会话**：显示最近 10 个番茄钟会话
- **状态标识**：
  - ✅ 已完成
  - ⏸️ 已中断
  - ⏱️ 进行中
- **详细信息**：显示时间、时长、关联任务等

## 使用方法

### 基本操作

1. **选择任务**：点击"选择关联任务"按钮，从今日待办任务中选择
2. **设置时长**：点击倒计时数字可修改工作和休息时长
3. **开始计时**：点击"开始"按钮或按空格键
4. **暂停/继续**：点击"暂停"按钮或按空格键
5. **重置**：点击"重置"按钮清除当前进度
6. **全屏模式**：点击全屏按钮或按 F 键进入专注模式

### 快捷键

- **空格键**：开始/暂停计时
- **F 键**：切换全屏模式
- **ESC 键**：退出全屏模式

### 权限设置

#### 通知权限
首次使用时会自动请求通知权限。如果拒绝，可以在浏览器设置中手动开启：

**Chrome/Edge**:
1. 点击地址栏左侧的锁图标
2. 找到"通知"选项
3. 选择"允许"

**Firefox**:
1. 点击地址栏左侧的信息图标
2. 找到"权限"部分
3. 将"通知"设置为"允许"

**Safari**:
1. Safari 菜单 → 偏好设置 → 网站
2. 找到"通知"
3. 为网站选择"允许"

#### Wake Lock 支持
Wake Lock API 在以下浏览器中支持：
- Chrome/Edge 84+
- Safari 16.4+
- Firefox（需要在 about:config 中启用）

不支持的浏览器会自动降级，不影响基本功能。

### 移动端使用

#### iOS Safari
1. 将网站添加到主屏幕以获得最佳体验
2. 锁屏后会显示媒体控制器
3. 支持通知和震动提醒

#### Android Chrome
1. 支持后台计时和通知
2. 锁屏后显示媒体控制通知
3. 可通过通知栏控制播放/暂停

## 数据库迁移

如果是首次部署或更新，需要运行以下迁移：

```bash
# 创建番茄钟会话表
psql -f supabase/migrations/create_pomodoro_sessions.sql

# 添加中断时间字段
psql -f supabase/migrations/add_interrupted_at_to_pomodoro_sessions.sql
```

或在 Supabase Dashboard 中执行 SQL：

```sql
-- 创建表（如果不存在）
-- 见 supabase/migrations/create_pomodoro_sessions.sql

-- 添加新字段
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS interrupted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS notes TEXT;
```

## API 使用

### PomodoroService

```typescript
import { pomodoroService } from '@/lib/services/pomodoroService';

// 创建会话
const session = await pomodoroService.createSession({
  user_id: userId,
  task_id: taskId,
  project_id: projectId,
  mode: 'work',
  duration: 1500, // 25分钟 = 1500秒
  completed: false,
  started_at: new Date().toISOString(),
});

// 完成会话
await pomodoroService.completeSession(sessionId, new Date().toISOString());

// 中断会话
await pomodoroService.interruptSession(sessionId, new Date().toISOString());

// 获取统计数据
const stats = await pomodoroService.getUserStats(userId);

// 获取最近会话
const sessions = await pomodoroService.getRecentSessions(userId, 10);
```

### 自定义 Hooks

```typescript
// 番茄钟计时器
import { usePomodoroTimer } from '@/lib/hooks/usePomodoroTimer';

const timer = usePomodoroTimer({
  workDuration: 25,
  breakDuration: 5,
  onComplete: (mode) => console.log('完成:', mode),
  onTick: (timeLeft) => console.log('剩余:', timeLeft),
});

// Media Session
import { useMediaSession } from '@/lib/hooks/useMediaSession';

useMediaSession({
  title: '专注工作中',
  artist: '任务名称',
  onPlay: () => timer.start(),
  onPause: () => timer.pause(),
});

// Wake Lock
import { useWakeLock } from '@/lib/hooks/useWakeLock';

const { requestWakeLock, releaseWakeLock } = useWakeLock();

// 通知
import { useNotification } from '@/lib/hooks/useNotification';

const { showNotification } = useNotification();
showNotification('标题', { body: '内容' });
```

## 故障排除

### 通知不显示
1. 检查浏览器通知权限
2. 确认系统通知设置已开启
3. 检查浏览器控制台是否有错误

### Wake Lock 不工作
1. 确认浏览器支持 Wake Lock API
2. 检查是否在 HTTPS 环境下运行
3. 某些浏览器需要用户交互后才能获取 Wake Lock

### 后台计时不准确
1. 某些移动浏览器会限制后台 JavaScript 执行
2. 建议将网站添加到主屏幕
3. iOS Safari 需要保持标签页活跃

### 媒体控制不显示
1. 确认浏览器支持 Media Session API
2. 检查是否正确设置了 metadata
3. iOS 需要实际播放音频才能显示控制器（可以播放静音音频）

## 技术栈

- **Next.js 16**: React 框架
- **TypeScript**: 类型安全
- **Supabase**: 数据库和认证
- **Tailwind CSS**: 样式
- **Web APIs**:
  - Media Session API
  - Wake Lock API
  - Notifications API
  - Vibration API

## 浏览器兼容性

| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| 基本计时 | ✅ | ✅ | ✅ | ✅ |
| 通知 | ✅ | ✅ | ✅ | ✅ |
| 震动 | ✅ | ✅ | ✅ | ✅ |
| Media Session | ✅ | ✅ | ✅ (16.4+) | ✅ |
| Wake Lock | ✅ (84+) | ⚠️ | ✅ (16.4+) | ✅ (84+) |

✅ 完全支持 | ⚠️ 部分支持 | ❌ 不支持

## 未来计划

- [ ] 长休息模式（4个番茄钟后）
- [ ] 自定义音效
- [ ] 数据导出功能
- [ ] 周/月统计图表
- [ ] 番茄钟目标设置
- [ ] 专注模式（屏蔽干扰网站）
- [ ] 团队协作功能
