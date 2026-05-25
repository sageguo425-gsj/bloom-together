# 伴侣邀请功能文档

## 功能概述

为伴侣空间添加了完整的邀请管理系统，包括：
- 邀请列表显示（发送的和收到的）
- 接受/拒绝邀请按钮
- 连接状态显示
- 解除伴侣关系功能

## 新增文件

### 1. InvitationManager.tsx
**路径**: `app/dashboard/partner/components/InvitationManager.tsx`

**功能**:
- 显示收到的邀请列表，带有发送者信息
- 显示发送的邀请列表，带有状态标识
- 提供接受/拒绝邀请的按钮
- 提供取消已发送邀请的功能
- 实时状态更新（pending、accepted、rejected、cancelled）

**主要特性**:
- 待处理邀请数量徽章
- 邀请状态彩色标签
- 加载状态和错误处理
- 空状态提示

### 2. ConnectionStatus.tsx
**路径**: `app/dashboard/partner/components/ConnectionStatus.tsx`

**功能**:
- 显示当前伴侣连接状态
- 展示伴侣的基本信息（头像、用户名、邮箱）
- 显示伴侣的等级和经验值
- 实时连接状态指示器（绿色脉冲点）
- 提供解除伴侣关系的功能

**主要特性**:
- 美观的渐变卡片设计
- 在线状态指示
- 刷新状态按钮
- 安全的解除关系确认

## 更新的文件

### 1. partnerService.ts
**路径**: `lib/services/partnerService.ts`

**新增接口**:
```typescript
export interface PartnerInvitation {
  id: number
  sender_id: string
  receiver_email: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  created_at: string
  sender?: {
    username: string
    email: string
    avatar?: string
  }
}
```

**新增函数**:
- `getSentInvitations()` - 获取发送的邀请列表
- `getReceivedInvitations()` - 获取收到的邀请列表（包含发送者信息）
- `rejectPartnerInvitation(invitationId)` - 拒绝邀请
- `cancelPartnerInvitation(invitationId)` - 取消已发送的邀请

### 2. PartnerInvitation.tsx
**路径**: `app/dashboard/partner/components/PartnerInvitation.tsx`

**更新内容**:
- 集成了 InvitationManager 组件
- 集成了 ConnectionStatus 组件
- 采用响应式两列布局（邀请管理 2/3 + 连接状态 1/3）
- 发送邀请成功后自动刷新页面

### 3. page.tsx
**路径**: `app/dashboard/partner/page.tsx`

**更新内容**:
- 在已连接伴侣的页面中添加 ConnectionStatus 组件
- 调整布局，将连接状态放在右侧栏顶部

## 用户界面

### 未连接状态页面布局
```
┌─────────────────────────────────────────────┐
│         发送邀请卡片（居中）                  │
│  - 邮箱输入框                                │
│  - 发送按钮                                  │
│  - 功能介绍                                  │
└─────────────────────────────────────────────┘

┌──────────────────────────┬─────────────────┐
│   邀请管理 (2/3)          │  连接状态 (1/3) │
│  - 收到的邀请             │  - 未连接提示   │
│  - 发送的邀请             │                 │
└──────────────────────────┴─────────────────┘
```

### 已连接状态页面布局
```
┌─────────────────────────────────────────────┐
│            伴侣信息头部                       │
└─────────────────────────────────────────────┘

┌──────────────────────────┬─────────────────┐
│   伴侣规划 (2/3)          │  互动区 (1/3)   │
│  - 今日任务               │  - 连接状态     │
│  - 习惯打卡               │  - 留言板       │
│  - 项目进度               │  - 共同目标     │
└──────────────────────────┴─────────────────┘
```

## 功能流程

### 发送邀请流程
1. 用户在邀请页面输入伴侣邮箱
2. 点击"发送邀请"按钮
3. 系统创建邀请记录（状态：pending）
4. 显示成功提示
5. 页面自动刷新，邀请出现在"发送的邀请"列表中

### 接受邀请流程
1. 用户在"收到的邀请"列表中看到待处理邀请
2. 点击"接受"按钮
3. 系统更新双方的 partner_id
4. 更新邀请状态为 accepted
5. 页面刷新，显示伴侣空间内容

### 拒绝邀请流程
1. 用户在"收到的邀请"列表中点击"拒绝"
2. 系统更新邀请状态为 rejected
3. 邀请列表自动刷新

### 取消邀请流程
1. 用户在"发送的邀请"列表中点击"取消"
2. 系统更新邀请状态为 cancelled
3. 邀请列表自动刷新

### 解除关系流程
1. 用户在连接状态卡片中点击"解除伴侣关系"
2. 系统弹出确认对话框
3. 确认后清除双方的 partner_id
4. 页面刷新，返回邀请页面

## 数据库依赖

使用现有的 `partner_invitations` 表：
- `id` - 邀请ID
- `sender_id` - 发送者用户ID
- `receiver_email` - 接收者邮箱
- `status` - 邀请状态（pending/accepted/rejected/cancelled）
- `created_at` - 创建时间

## 样式特点

- 使用 Tailwind CSS 实现响应式设计
- 渐变色彩方案（粉色到紫色）
- 状态徽章颜色编码：
  - 黄色：等待中
  - 绿色：已接受
  - 红色：已拒绝
  - 灰色：已取消
- 悬停效果和过渡动画
- 加载状态指示器

## 安全性

- 所有操作都需要用户认证
- 使用 Supabase RLS 策略保护数据
- 解除关系需要二次确认
- 只能操作自己相关的邀请

## 未来改进建议

1. 添加邮件通知功能
2. 添加推送通知
3. 支持批量操作邀请
4. 添加邀请过期机制
5. 添加黑名单功能
6. 支持邀请备注信息
