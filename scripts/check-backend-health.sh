#!/bin/bash

API_URL="${API_URL:-http://localhost:3000/api}"
TOKEN="${TOKEN:-}"

echo "=========================================="
echo "后端服务健康检查"
echo "=========================================="
echo "API URL: ${API_URL}"
echo ""

# 1. 检查服务是否响应
echo "1. 检查服务是否响应..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${API_URL}/health" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo "✅ 服务正在运行 (HTTP $HTTP_CODE)"
else
    echo "❌ 服务无响应 (HTTP $HTTP_CODE)"
    echo "   提示：检查后端服务是否正常运行"
    exit 1
fi

# 2. 检查用户认证接口
if [ -n "$TOKEN" ]; then
    echo ""
    echo "2. 检查用户认证接口..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time 5 \
        -H "Authorization: Bearer ${TOKEN}" \
        "${API_URL}/user/profile" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ 认证接口正常 (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "401" ]; then
        echo "⚠️  认证失败 (HTTP $HTTP_CODE) - Token可能无效"
    else
        echo "❌ 认证接口异常 (HTTP $HTTP_CODE)"
    fi
fi

# 3. 检查进程状态
echo ""
echo "3. 检查后端进程..."
NODE_PID=$(ps aux | grep "ts-node src/server.ts" | grep -v grep | awk '{print $2}' | head -1)

if [ -n "$NODE_PID" ]; then
    echo "✅ 后端进程运行中 (PID: $NODE_PID)"
    
    # 检查进程运行时间
    RUNTIME=$(ps -o etime= -p "$NODE_PID" 2>/dev/null | tr -d ' ')
    if [ -n "$RUNTIME" ]; then
        echo "   运行时间: $RUNTIME"
    fi
    
    # 检查内存使用
    MEM=$(ps -o rss= -p "$NODE_PID" 2>/dev/null | awk '{printf "%.1f", $1/1024}')
    if [ -n "$MEM" ]; then
        echo "   内存使用: ${MEM} MB"
    fi
else
    echo "❌ 未找到后端进程"
fi

# 4. 检查端口监听
echo ""
echo "4. 检查端口监听..."
if command -v ss >/dev/null 2>&1; then
    PORT_STATUS=$(ss -tlnp | grep ":3000 " || echo "")
elif command -v netstat >/dev/null 2>&1; then
    PORT_STATUS=$(netstat -tlnp | grep ":3000 " || echo "")
else
    PORT_STATUS=""
fi

if [ -n "$PORT_STATUS" ]; then
    echo "✅ 端口 3000 正在监听"
    echo "   $PORT_STATUS"
else
    echo "❌ 端口 3000 未监听"
fi

echo ""
echo "=========================================="
echo "健康检查完成"
echo "=========================================="
