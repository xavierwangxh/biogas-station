@echo off
chcp 65001 > nul
echo 正在启动本地服务器...
echo 访问地址: http://localhost:8080
echo 按 Ctrl+C 停止服务器
echo.

npx http-server -p 8080 -o
