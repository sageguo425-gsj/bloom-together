# 使用Supabase CLI执行Migration

## 安装Supabase CLI

### Windows (使用 npm)
```bash
npm install -g supabase
```

### 或使用 Scoop
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## 执行Migration

1. 链接到你的Supabase项目：
```bash
cd "G:\工作文件\软件\project\planning-app"
supabase link --project-ref mqpaaughmckiujrfhnlh
```

2. 推送migration到数据库：
```bash
supabase db push
```

## 验证
```bash
supabase db diff
```
