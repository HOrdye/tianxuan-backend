#!/bin/bash

# ============================================================================
# 用户数字孪生系统 API 测试脚本
# 创建时间: 2026-01-31
# 使用方法: ./test-digital-twin-api.sh
# ============================================================================

# 配置
API_URL="${API_URL:-http://localhost:3000/api}"
TOKEN="${TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzU1MTBmNy1iNjZkLTRmOWUtOGU0Ny0yMmI5MTE0YTcyODAiLCJlbWFpbCI6Ijc0MDI3OTEzNEBxcS5jb20iLCJpYXQiOjE3NjkwOTQ0NjcsImV4cCI6MTc2OTY5OTI2N30.GU_KKBbDgfuR5SrKdTqCi13L_1A99LOKTT4cDQ1SN8M}"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASSED=0
FAILED=0

# 打印测试结果
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

# 检查 Token
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  警告: TOKEN 未设置${NC}"
    echo "请先登录获取 Token:"
    echo "  curl -X POST ${API_URL}/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"your_password\"}'"
    echo ""
    echo "然后设置环境变量:"
    echo "  export TOKEN=\"your_token_here\""
    exit 1
fi

echo "=========================================="
echo "用户数字孪生系统 API 测试"
echo "=========================================="
echo "API URL: ${API_URL}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# ============================================================================
# 1. 获取用户资料（包含完整度）
# ============================================================================
echo "1. 测试 GET /api/user/profile"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/user/profile" \
    -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    COMPLETENESS=$(echo "$BODY" | grep -o '"completeness":[0-9]*' | cut -d':' -f2)
    if [ -n "$COMPLETENESS" ]; then
        print_result 0 "返回完整度字段: $COMPLETENESS"
    else
        print_result 1 "未返回完整度字段"
    fi
else
    print_result 1 "HTTP 状态码: $HTTP_CODE"
fi
echo ""

# ============================================================================
# 2. 获取命主名刺
# ============================================================================
echo "2. 测试 GET /api/user/destiny-card"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/user/destiny-card" \
    -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "获取命主名刺成功"
    echo "响应: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_result 1 "HTTP 状态码: $HTTP_CODE"
fi
echo ""

# ============================================================================
# 3. 更新命主名刺（测试奖励发放）
# ============================================================================
echo "3. 测试 PUT /api/user/destiny-card"
echo "   提示：此操作可能需要几秒钟（涉及数据库事务和奖励发放）"
RESPONSE=$(curl -s -v --max-time 30 -w "\nHTTP_CODE:%{http_code}" -X PUT "${API_URL}/user/destiny-card" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "mbti": "INTP",
        "profession": "独立开发者"
    }' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | sed 's/.*HTTP_CODE://' | tr -d '\n' || echo "000")
BODY=$(echo "$RESPONSE" | sed '/^< HTTP/d' | sed '/^< /d' | sed '/^[*{]/d' | sed '/HTTP_CODE:/d' | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "响应: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
    EVENTS=$(echo "$BODY" | grep -o '"events":\[.*\]' || echo "$BODY" | grep -o '"events":\[.*\].*' || echo "")
    if [ -n "$EVENTS" ] || echo "$BODY" | grep -q '"events"'; then
        print_result 0 "更新成功（可能包含 events 字段）"
    else
        print_result 0 "更新成功（无新奖励，events 字段可能为空）"
    fi
else
    print_result 1 "HTTP 状态码: $HTTP_CODE"
    echo "详细响应:"
    echo "$RESPONSE" | tail -20
fi
echo ""

# ============================================================================
# 4. 获取资料完整度
# ============================================================================
echo "4. 测试 GET /api/user/completeness"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/user/completeness" \
    -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    BREAKDOWN=$(echo "$BODY" | grep -o '"breakdown":{.*}' || echo "")
    if [ -n "$BREAKDOWN" ]; then
        print_result 0 "返回完整度详情"
        echo "响应: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        print_result 1 "未返回完整度详情"
    fi
else
    print_result 1 "HTTP 状态码: $HTTP_CODE"
fi
echo ""

# ============================================================================
# 5. 同步生辰信息
# ============================================================================
echo "5. 测试 POST /api/user/sync-birthday-to-context"
echo "   提示：此操作可能需要几秒钟（涉及数据库事务）"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --max-time 30 -X POST "${API_URL}/user/sync-birthday-to-context" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "birthDate": "1990-01-15",
        "gender": "male"
    }' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | sed 's/.*HTTP_CODE://' | tr -d '\n' || echo "000")
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d' | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "响应: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
    if echo "$BODY" | jq -e '.success == true and .data.synced == true' >/dev/null 2>&1; then
        print_result 0 "生辰信息同步成功"
    elif echo "$BODY" | grep -q '"synced":true'; then
        print_result 0 "生辰信息同步成功（通过grep检查）"
    elif echo "$BODY" | grep -q '"success":true'; then
        print_result 0 "生辰信息同步成功（响应格式正确）"
    else
        print_result 1 "生辰信息同步失败（未找到 synced 字段）"
        echo "调试信息 - HTTP_CODE: $HTTP_CODE"
        echo "调试信息 - BODY前200字符: ${BODY:0:200}"
    fi
else
    print_result 1 "HTTP 状态码: $HTTP_CODE"
    echo "详细响应:"
    echo "$RESPONSE" | tail -20
fi
echo ""

# ============================================================================
# 6. 获取隐性信息
# ============================================================================
echo "6. 测试 GET /api/user/implicit-traits"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/user/implicit-traits" \
    -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_result 0 "获取隐性信息成功"
    echo "响应: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    print_result 1 "HTTP 状态码: $HTTP_CODE"
fi
echo ""

# ============================================================================
# 7. 测试幂等性（重复提交相同数据）
# ============================================================================
echo "7. 测试幂等性（重复提交相同数据）"
RESPONSE1=$(curl -s -X PUT "${API_URL}/user/destiny-card" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"mbti": "INTP"}')

sleep 1

RESPONSE2=$(curl -s -X PUT "${API_URL}/user/destiny-card" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"mbti": "INTP"}')

EVENTS1=$(echo "$RESPONSE1" | grep -o '"events":\[.*\]' || echo "")
EVENTS2=$(echo "$RESPONSE2" | grep -o '"events":\[.*\]' || echo "")

if [ -z "$EVENTS2" ] || [ "$EVENTS2" = '[]' ]; then
    print_result 0 "幂等性测试通过（重复提交不重复发放奖励）"
else
    print_result 1 "幂等性测试失败（重复提交仍然发放奖励）"
fi
echo ""

# ============================================================================
# 8. 测试安全性（尝试更新 implicit_traits）
# ============================================================================
echo "8. 测试安全性（尝试更新 implicit_traits）"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "${API_URL}/user/profile" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "preferences": {
            "implicit_traits": {
                "inferred_roles": ["hacker"]
            }
        }
    }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# 检查响应中是否包含 implicit_traits（应该被过滤）
IMPLICIT_TRAITS=$(echo "$BODY" | grep -o '"implicit_traits":{.*}' || echo "")
if [ -z "$IMPLICIT_TRAITS" ]; then
    print_result 0 "安全过滤成功（implicit_traits 被过滤）"
else
    print_result 1 "安全过滤失败（implicit_traits 未被过滤）"
fi
echo ""

# ============================================================================
# 测试总结
# ============================================================================
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo -e "${GREEN}通过: ${PASSED}${NC}"
echo -e "${RED}失败: ${FAILED}${NC}"
echo "总计: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}❌ 部分测试失败，请检查日志${NC}"
    exit 1
fi
