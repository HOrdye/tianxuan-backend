#!/bin/bash

# 认证系统重新测试脚本（修复后）
# 测试时间：2025-01-30

# 不使用 set -e，让所有测试都能执行

BASE_URL="http://localhost:3000"
TEST_EMAIL="test-fix-$(date +%s)@example.com"
TEST_PASSWORD="Test123456"
TEST_USERNAME="testfix"

echo "=========================================="
echo "🔐 认证系统重新测试（修复后）"
echo "=========================================="
echo "测试邮箱: $TEST_EMAIL"
echo "测试时间: $(date)"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASSED=0
FAILED=0

# 测试函数
test_case() {
    local name=$1
    local expected_status=$2
    local command=$3
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧪 测试: $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    response=$(eval "$command" 2>&1)
    status_code=$(echo "$response" | grep -oP '(?<=< HTTP/1.[01] )\d+' || echo "000")
    body=$(echo "$response" | sed -n '/^{/,$p')
    
    echo "响应状态码: $status_code"
    echo "响应内容: $body"
    echo ""
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ 通过${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ 失败 - 期望状态码: $expected_status, 实际: $status_code${NC}"
        ((FAILED++))
        return 1
    fi
}

# 测试 1: 用户注册
echo "📝 测试 1: 用户注册（验证修复后的 register 函数）"
test_case "用户注册" "201" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/auth/register \
    -H 'Content-Type: application/json' \
    -d '{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"username\": \"$TEST_USERNAME\"}'"

# 提取用户ID和Token（如果注册成功）
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"username\": \"$TEST_USERNAME\"}" 2>&1)

USER_ID=$(echo "$REGISTER_RESPONSE" | grep -oP '"userId":\s*"[^"]+"' | cut -d'"' -f4 || echo "")
echo "注册的用户ID: $USER_ID"
echo ""

# 测试 2: 重复注册（应该失败）
echo "📝 测试 2: 重复注册（应该返回 409）"
test_case "重复注册" "409" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/auth/register \
    -H 'Content-Type: application/json' \
    -d '{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}'"

# 测试 3: 用户登录
echo "📝 测试 3: 用户登录"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":\s*"[^"]+"' | cut -d'"' -f4 || echo "")

test_case "用户登录" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}'"

echo "登录 Token: ${TOKEN:0:50}..."
echo ""

# 测试 4: 错误密码登录（应该失败）
echo "📝 测试 4: 错误密码登录（应该返回 401）"
test_case "错误密码登录" "401" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{\"email\": \"$TEST_EMAIL\", \"password\": \"WrongPassword123\"}'"

# 测试 5: 获取当前用户信息（需要认证）
echo "📝 测试 5: 获取当前用户信息（需要认证）"
if [[ -n "$TOKEN" ]]; then
    test_case "获取当前用户信息" "200" \
        "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/auth/me \
        -H 'Authorization: Bearer $TOKEN'"
else
    echo -e "${RED}❌ 跳过 - 没有有效的 Token${NC}"
    ((FAILED++))
fi

# 测试 6: 无 Token 访问受保护接口（应该失败）
echo "📝 测试 6: 无 Token 访问受保护接口（应该返回 401）"
test_case "无 Token 访问" "401" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/auth/me"

# 测试 7: 无效 Token（应该失败）
echo "📝 测试 7: 无效 Token（应该返回 403）"
test_case "无效 Token" "403" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/auth/me \
    -H 'Authorization: Bearer invalid-token-here'"

# 测试 8: 密码强度验证（太短）
echo "📝 测试 8a: 密码强度验证（太短，应该返回 400）"
test_case "密码太短" "400" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/auth/register \
    -H 'Content-Type: application/json' \
    -d '{\"email\": \"test-short-$(date +%s)@example.com\", \"password\": \"12345\"}'"

# 测试 9: 密码强度验证（无字母）
echo "📝 测试 8b: 密码强度验证（无字母，应该返回 400）"
test_case "密码无字母" "400" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/auth/register \
    -H 'Content-Type: application/json' \
    -d '{\"email\": \"test-noletter-$(date +%s)@example.com\", \"password\": \"12345678\"}'"

# 🔥 关键测试：验证修复是否生效
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 关键测试：验证修复后的 register 函数"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 10: 注册后立即使用业务功能（验证 profiles 记录是否创建成功）
if [[ -n "$TOKEN" && -n "$USER_ID" ]]; then
    echo "📝 测试 10: 注册后立即查询用户资料（验证 profiles 记录是否存在）"
    PROFILE_RESPONSE=$(curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/user/profile \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    
    PROFILE_STATUS=$(echo "$PROFILE_RESPONSE" | grep -oP '(?<=< HTTP/1.[01] )\d+' || echo "000")
    PROFILE_BODY=$(echo "$PROFILE_RESPONSE" | sed -n '/^{/,$p')
    
    echo "响应状态码: $PROFILE_STATUS"
    echo "响应内容: $PROFILE_BODY"
    echo ""
    
    if [[ "$PROFILE_STATUS" == "200" ]]; then
        echo -e "${GREEN}✅ 通过 - 用户资料查询成功，说明 profiles 记录已创建${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ 失败 - 用户资料查询失败，说明 profiles 记录可能未创建${NC}"
        ((FAILED++))
    fi
    
    echo ""
    
    # 测试 11: 注册后立即查询余额（验证 profiles 记录是否完整）
    echo "📝 测试 11: 注册后立即查询天机币余额（验证 profiles 记录是否完整）"
    BALANCE_RESPONSE=$(curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/coins/balance \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    
    BALANCE_STATUS=$(echo "$BALANCE_RESPONSE" | grep -oP '(?<=< HTTP/1.[01] )\d+' || echo "000")
    BALANCE_BODY=$(echo "$BALANCE_RESPONSE" | sed -n '/^{/,$p')
    
    echo "响应状态码: $BALANCE_STATUS"
    echo "响应内容: $BALANCE_BODY"
    echo ""
    
    if [[ "$BALANCE_STATUS" == "200" ]]; then
        echo -e "${GREEN}✅ 通过 - 余额查询成功，说明 profiles 记录完整${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ 失败 - 余额查询失败，说明 profiles 记录可能不完整${NC}"
        ((FAILED++))
    fi
    
    echo ""
else
    echo -e "${YELLOW}⚠️  跳过业务功能测试 - 没有有效的 Token 或 UserID${NC}"
    ((FAILED++))
fi

# 测试结果汇总
echo ""
echo "=========================================="
echo "📊 测试结果汇总"
echo "=========================================="
echo "✅ 通过: $PASSED"
echo "❌ 失败: $FAILED"
echo "总计: $((PASSED + FAILED))"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 所有测试通过！修复成功！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED 个测试失败，请检查${NC}"
    exit 1
fi
