#!/bin/bash

# 支付API验证脚本
# 用于验证4个支付相关API端点是否正常工作

BASE_URL="${1:-http://localhost:3000}"
TOKEN="${2:-}"

echo "=========================================="
echo "支付API端点验证脚本"
echo "=========================================="
echo "基础URL: $BASE_URL"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local need_auth=$4
    local description=$5
    
    echo "----------------------------------------"
    echo "测试: $description"
    echo "端点: $method $endpoint"
    
    local cmd="curl -s -w '\nHTTP_CODE:%{http_code}' -X $method"
    
    if [ "$need_auth" = "true" ] && [ -n "$TOKEN" ]; then
        cmd="$cmd -H 'Authorization: Bearer $TOKEN'"
    fi
    
    if [ -n "$data" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    cmd="$cmd '$BASE_URL$endpoint'"
    
    local response=$(eval $cmd)
    local http_code=$(echo "$response" | grep -oP 'HTTP_CODE:\K\d+')
    local body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
        echo "响应: $body" | head -c 200
        echo ""
    elif [ "$http_code" = "401" ]; then
        echo -e "${YELLOW}⚠️  需要认证 (HTTP $http_code)${NC}"
        echo "提示: 请提供有效的Token"
    elif [ "$http_code" = "404" ]; then
        echo -e "${RED}❌ 端点不存在 (HTTP $http_code)${NC}"
    else
        echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}"
        echo "响应: $body" | head -c 200
        echo ""
    fi
    echo ""
}

# 1. 测试健康检查
echo "1. 测试服务器健康检查"
test_endpoint "GET" "/health" "" false "健康检查"

# 2. 测试支付路由基础路径（应该404）
echo "2. 测试支付路由基础路径"
test_endpoint "GET" "/api/payment" "" false "支付路由基础路径（预期404）"

# 3. 测试首充状态检查（需要认证）
echo "3. 测试首充状态检查"
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  跳过（需要Token）${NC}"
else
    test_endpoint "GET" "/api/payment/first-purchase" "" true "检查首充状态"
fi

# 4. 测试配额日志查询（需要认证）
echo "4. 测试配额日志查询"
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  跳过（需要Token）${NC}"
else
    test_endpoint "GET" "/api/payment/quota-logs?limit=10" "" true "查询配额日志"
fi

# 5. 测试支付回调处理（不需要认证，但需要数据）
echo "5. 测试支付回调处理"
test_endpoint "POST" "/api/payment/callback/handle" '{"orderId":"test","status":"completed"}' false "处理支付回调"

# 6. 测试创建退款日志（需要认证和数据）
echo "6. 测试创建退款日志"
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  跳过（需要Token）${NC}"
else
    test_endpoint "POST" "/api/payment/refund-logs" '{"orderId":"test","refundAmount":100,"refundCoins":1000}' true "创建退款日志"
fi

echo "=========================================="
echo "验证完成"
echo "=========================================="
echo ""
echo "使用方法:"
echo "  ./验证支付API.sh [BASE_URL] [TOKEN]"
echo ""
echo "示例:"
echo "  ./验证支付API.sh http://localhost:3000"
echo "  ./验证支付API.sh http://localhost:3000 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
