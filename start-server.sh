#!/bin/bash
# 启动本地服务器脚本
# 使用方法: ./start-server.sh

echo "正在启动本地服务器..."
echo "访问地址: http://localhost:8080"
echo "按 Ctrl+C 停止服务器"
echo ""

# 检查是否安装了 http-server
if ! command -v npx &> /dev/null; then
    echo "错误: 未找到 npx，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 启动服务器
npx http-server -p 8080 -o
