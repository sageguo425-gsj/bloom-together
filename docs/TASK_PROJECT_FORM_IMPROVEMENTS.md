# 任务和项目表单改进文档

## 改进概述

对任务编辑界面和项目编辑界面进行了重大改进，增强了功能性和用户体验。

## 任务表单改进

### 1. ✅ 新增"选择归属"功能

**功能描述**：
- 任务可以关联到项目或习惯
- 提供下拉选择框，显示所有活跃的项目和习惯
- 项目和习惯互斥，只能选择其中一个

**实现细节**：
```typescript
// 加载用户的项目和习惯
const loadProjectsAndHabits = async () => {
  // 加载活跃项目
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('title');

  // 加载所有习惯
  const { data: habitsData } = await supabase
    .from('habits')
    .select('id, title, icon')
    .eq('user_id', user.id)
    .order('title');
}
```

**UI布局**：
- 两列网格布局
- 左侧：关联项目下拉框
- 右侧：关联习惯下拉框
- 提示文字：任务只能关联项目或习惯中的一个

**选择逻辑**：
- 选择项目时，自动清除习惯选择
- 选择习惯时，自动清除项目选择
- 可以选择"无关联"

### 2. ✅ 自定义标签功能

**功能描述**：
- 用户可以添加自定义标签
- 可以删除任何标签
- 标签以胶囊形式显示

**添加标签**：
- 点击"添加标签"按钮
- 弹出输入框
- 输入标签名称后按回车或失去焦点自动添加
- 不允许重复标签

**删除标签**：
- 每个标签右侧有 × 按钮
- 点击即可删除
- 支持删除预设标签和自定义标签

**UI设计**：
```tsx
// 标签显示
<div className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full">
  <span>{tag}</span>
  <button onClick={() => removeTag(tag)}>
    <X className="w-3 h-3" />
  </button>
</div>

// 添加按钮
<button onClick={() => setShowTagInput(true)}>
  <Plus className="w-3 h-3" />
  添加标签
</button>
```

### 3. ✅ 删除"共享给伴侣"选项

**原因**：
- 简化表单，减少用户决策负担
- 共享功能可以在其他地方统一管理
- 避免每次创建任务都需要考虑是否共享

**改动**：
- 移除 `is_shared` 复选框
- 移除相关的粉色渐变背景区域
- 表单数据中不再包含 `is_shared` 字段

## 项目表单改进

### 1. ✅ 删除"共享给伴侣"选项

**改动内容**：
- 移除 `isShared` 状态变量
- 移除共享复选框UI
- 创建项目时 `is_shared` 默认设置为 `false`

**代码变更**：
```typescript
// 之前
const [isShared, setIsShared] = useState(false);
is_shared: isShared,

// 之后
is_shared: false,
```

## 新增依赖

### Lucide React 图标
```typescript
import { X, Plus } from 'lucide-react';
```

- `X`：用于删除标签按钮
- `Plus`：用于添加标签按钮

## 数据库字段

### 任务表 (tasks)
```sql
project_id INTEGER  -- 关联的项目ID
habit_id INTEGER    -- 关联的习惯ID
tags TEXT[]         -- 标签数组（支持自定义标签）
```

### 约束
- `project_id` 和 `habit_id` 不能同时有值
- 在应用层面通过UI逻辑保证互斥

## 用户体验改进

### 1. 归属选择
- ✅ 清晰的分类：项目 vs 习惯
- ✅ 自动互斥选择，避免冲突
- ✅ 显示图标和名称，易于识别
- ✅ 支持"无关联"选项

### 2. 标签管理
- ✅ 可视化标签展示
- ✅ 一键删除，操作便捷
- ✅ 动态添加，灵活自定义
- ✅ 实时反馈，即时生效

### 3. 表单简化
- ✅ 移除不必要的共享选项
- ✅ 减少用户决策点
- ✅ 更专注于核心任务信息

## 界面截图说明

### 任务表单 - 选择归属
```
┌─────────────────────────────────────┐
│ 选择归属                             │
├──────────────────┬──────────────────┤
│ 关联项目          │ 关联习惯          │
│ [下拉选择框]      │ [下拉选择框]      │
│ - 无关联项目      │ - 无关联习惯      │
│ - 毕业论文        │ 📚 阅读          │
│ - 学习计划        │ 🏃 跑步          │
└──────────────────┴──────────────────┘
提示：任务只能关联项目或习惯中的一个
```

### 任务表单 - 标签管理
```
┌─────────────────────────────────────┐
│ 标签                                 │
├─────────────────────────────────────┤
│ [学习 ×] [工作 ×] [重要 ×]          │
│ [+ 添加标签]                         │
└─────────────────────────────────────┘
提示：点击标签上的 × 可以删除
```

## 测试建议

### 测试场景 1：归属选择
1. 创建新任务
2. 选择一个项目
3. 验证习惯选择被清空
4. 选择一个习惯
5. 验证项目选择被清空
6. 保存任务，检查数据库

### 测试场景 2：自定义标签
1. 创建新任务
2. 点击"添加标签"
3. 输入自定义标签名称
4. 按回车或点击外部
5. 验证标签已添加
6. 点击标签的 × 按钮
7. 验证标签已删除

### 测试场景 3：表单简化
1. 打开任务表单
2. 验证没有"共享给伴侣"选项
3. 打开项目表单
4. 验证没有"共享给伴侣"选项

## 技术实现

### 状态管理
```typescript
// 项目和习惯列表
const [projects, setProjects] = useState<Project[]>([]);
const [habits, setHabits] = useState<Habit[]>([]);

// 标签输入
const [newTag, setNewTag] = useState('');
const [showTagInput, setShowTagInput] = useState(false);
```

### 标签操作
```typescript
// 添加标签
const addTag = () => {
  const trimmedTag = newTag.trim();
  if (trimmedTag && !formData.tags.includes(trimmedTag)) {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, trimmedTag],
    }));
    setNewTag('');
    setShowTagInput(false);
  }
};

// 删除标签
const removeTag = (tagToRemove: string) => {
  setFormData(prev => ({
    ...prev,
    tags: prev.tags.filter(tag => tag !== tagToRemove),
  }));
};
```

### 归属选择逻辑
```typescript
// 选择项目时清除习惯
onChange={(e) => setFormData({
  ...formData,
  project_id: e.target.value ? Number(e.target.value) : undefined,
  habit_id: undefined
})}

// 选择习惯时清除项目
onChange={(e) => setFormData({
  ...formData,
  habit_id: e.target.value ? Number(e.target.value) : undefined,
  project_id: undefined
})}
```

## 未来改进方向

1. **标签颜色**：为自定义标签添加颜色选择器
2. **标签建议**：根据历史标签提供自动补全
3. **批量操作**：支持批量添加/删除标签
4. **标签统计**：显示每个标签的使用次数
5. **归属快捷创建**：在选择归属时支持快速创建新项目/习惯
6. **标签分类**：支持标签分组和层级结构

## 兼容性说明

- ✅ 向后兼容：现有任务数据不受影响
- ✅ 数据库兼容：使用现有字段，无需迁移
- ✅ 类型安全：完整的 TypeScript 类型定义
