@echo off
echo 正在安装 Supabase CLI...
npm install -g supabase

echo.
echo 安装完成！现在可以执行以下命令：
echo.
echo 1. 链接项目：
echo    cd "G:\工作文件\软件\project\planning-app"
echo    supabase link --project-ref mqpaauqhmckiujrfhnlh
echo.
echo 2. 推送迁移：
echo    supabase db push
echo.
pause
