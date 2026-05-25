# 伴侣空间功能部署清单

## ✅ 已完成的工作

### 1. 数据库设计
- [x] 创建伴侣邀请表 (partner_invitations)
- [x] 创建点赞表 (likes)
- [x] 创建留言板表 (messages)
- [x] 创建共同目标表 (shared_goals)
- [x] 创建共同目标进度表 (shared_goal_progress)
- [x] 创建通知表 (notifications)
- [x] 配置行级安全策略 (RLS)
- [x] 创建触发器和函数

### 2. 后端服务
- [x] 创建 partnerService.ts
- [x] 实现获取伴侣信息
- [x] 实现获取伴侣任务/习惯/项目
- [x] 实现点赞功能
- [x] 实现留言功能
- [x] 实现共同目标功能
- [x] 实现通知功能
- [x] 实现邀请和配对功能

### 3. 前端组件
- [x] PartnerHeader - 伴侣信息头部
- [x] PartnerTasks - 今日任务展示
- [x] PartnerHabits - 习惯打卡展示
- [x] PartnerProjects - 项目进度展示
- [x] MessageBoard - 留言板
- [x] SharedGoals - 共同目标
- [x] PartnerInvitation - 邀请页面

### 4. 页面路由
- [x] /dashboard/partner - 伴侣空间主页
- [x] 导航栏添加伴侣空间入口

### 5. 文档
- [x] 功能使用指南
- [x] 数据库表结构说明
- [x] 部署步骤说明

## 📋 部署步骤

### 步骤 1: 数据库配置

在 Supabase SQL Editor 中运行：

```sql
-- 运行伴侣空间数据库脚本
-- 文件位置: database/partner_space_schema.sql
```

### 步骤 2: 验证环境变量

确保 Vercel 上已配置：
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY

### 步骤 3: 本地测试

```bash
cd planning-app
npm install
npm run build
npm run dev
```

访问 http://localhost:3000/dashboard/partner 测试功能

### 步骤 4: 部署到 Vercel

```bash
vercel --prod
```

## 🧪 测试清单

### 功能测试
- [ ] 发送伴侣邀请
- [ ] 接受伴侣邀请
- [ ] 查看伴侣今日任务
- [ ] 给任务点赞
- [ ] 查看伴侣习惯
- [ ] 查看伴侣项目
- [ ] 发送留言
- [ ] 接收留言通知
- [ ] 创建共同目标
- [ ] 更新共同目标进度
- [ ] 查看通知列表
- [ ] 解除伴侣关系

### 隐私测试
- [ ] 未共享的任务不可见
- [ ] 未共享的习惯不可见
- [ ] 未共享的项目不可见
- [ ] 不能修改伴侣的数据
- [ ] 不能查看其他用户的数据

### 性能测试
- [ ] 页面加载速度
- [ ] 点赞响应速度
- [ ] 留言发送速度
- [ ] 数据刷新速度

## 🔧 需要手动配置的内容

### 1. 在现有任务/习惯/项目表单中添加"共享"选项

需要修改以下文件：
- `app/dashboard/tasks/components/TaskForm.tsx` - 添加 is_shared 复选框
- `app/dashboard/habits/components/HabitForm.tsx` - 添加 is_shared 复选框（如果存在）
- `app/dashboard/projects/[id]/page.tsx` - 添加 is_shared 复选框

示例代码：
```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={formData.is_shared}
    onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
    className="rounded border-gray-300"
  />
  <span className="text-sm text-gray-700">共享给伴侣</span>
</label>
```

### 2. 在其他页面的导航栏中添加伴侣空间链接

需要修改以下文件：
- `app/dashboard/tasks/page.tsx`
- `app/dashboard/pomodoro/page.tsx`
- `app/dashboard/projects/page.tsx`

或者创建一个共享的导航组件。

### 3. 配置邮件通知（可选）

如果需要邮件通知功能，需要：
- 配置 Supabase Auth 邮件模板
- 或集成第三方邮件服务（如 SendGrid）

## 🚀 优化建议

### 短期优化
1. 添加加载状态和骨架屏
2. 添加错误处理和提示
3. 优化移动端显示
4. 添加空状态插图

### 中期优化
1. 实现实时通知（Supabase Realtime）
2. 添加消息已读状态
3. 添加点赞动画效果
4. 优化数据缓存策略

### 长期优化
1. 支持语音留言
2. 支持图片分享
3. 添加数据统计图表
4. 实现成就系统

## 📝 注意事项

1. **数据库迁移：** 确保在生产环境运行 SQL 脚本前先在测试环境验证
2. **RLS 策略：** 仔细检查 RLS 策略，确保数据安全
3. **性能监控：** 部署后监控数据库查询性能
4. **用户反馈：** 收集用户反馈，持续优化功能

## 🐛 已知问题

目前没有已知问题。

## 📞 支持

如有问题，请查看：
- [功能使用指南](./PARTNER_SPACE_GUIDE.md)
- [数据库表结构](../database/partner_space_schema.sql)
