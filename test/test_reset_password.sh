#!/bin/bash

# 密码重置功能测试脚本
# 测试 POST /api/auth/reset-password 接口

BASE_URL="http://localhost:3000"
TEST_EMAIL="test-reset-$(date +%s)@example.com"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}密码重置功能测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 测试1: 测试密码重置请求（邮箱不存在的情况）
echo -e "${YELLOW}测试1: 请求密码重置（邮箱不存在）${NC}"
RESPONSE=$(curl -s -w "\n< HTTP/1.1 %{http_code}\n" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"nonexistent@example.com\"}")

HTTP_CODE=$(echo "$RESPONSE" | grep "< HTTP/1.1" | awk '{print $2}')
BODY=$(echo "$RESPONSE" | sed '/< HTTP\/1.1/d')

echo "响应状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ 测试1通过：即使邮箱不存在也返回成功（安全考虑）${NC}"
else
  echo -e "${RED}❌ 测试1失败：期望状态码 200，实际 $HTTP_CODE${NC}"
fi
echo ""

# 测试2: 测试密码重置请求（邮箱格式错误）
echo -e "${YELLOW}测试2: 请求密码重置（邮箱格式错误）${NC}"
RESPONSE=$(curl -s -w "\n< HTTP/1.1 %{http_code}\n" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"invalid-email\"}")

HTTP_CODE=$(echo "$RESPONSE" | grep "< HTTP/1.1" | awk '{print $2}')
BODY=$(echo "$RESPONSE" | sed '/< HTTP\/1.1/d')

echo "响应状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ 测试2通过：邮箱格式验证正常${NC}"
else
  echo -e "${RED}❌ 测试2失败：期望状态码 400，实际 $HTTP_CODE${NC}"
fi
echo ""

# 测试3: 测试密码重置请求（缺少邮箱字段）
echo -e "${YELLOW}测试3: 请求密码重置（缺少邮箱字段）${NC}"
RESPONSE=$(curl -s -w "\n< HTTP/1.1 %{http_code}\n" -X POST "$BASE_URL/api/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{}")

HTTP_CODE=$(echo "$RESPONSE" | grep "< HTTP/1.1" | awk '{print $2}')
BODY=$(echo "$RESPONSE" | sed '/< HTTP\/1.1/d')

echo "响应状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ 测试3通过：必填字段验证正常${NC}"
else
  echo -e "${RED}❌ 测试3失败：期望状态码 400，实际 $HTTP_CODE${NC}"
fi
echo ""

# 测试4: 先注册一个用户，然后测试密码重置
echo -e "${YELLOW}测试4: 注册用户后请求密码重置${NC}"

# 先注册用户
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"Test123456\",\"username\":\"testuser\"}")

REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$REGISTER_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ 用户注册成功: $TEST_EMAIL${NC}"
  
  # 等待1秒
  sleep 1
  
  # 请求密码重置
  RESET_RESPONSE=$(curl -s -w "\n< HTTP/1.1 %{http_code}\n" -X POST "$BASE_URL/api/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}")
  
  HTTP_CODE=$(echo "$RESET_RESPONSE" | grep "< HTTP/1.1" | awk '{print $2}')
  BODY=$(echo "$RESET_RESPONSE" | sed '/< HTTP\/1.1/d')
  
  echo "响应状态码: $HTTP_CODE"
  echo "响应内容:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 测试4通过：密码重置请求成功${NC}"
    echo -e "${BLUE}💡 提示：请查看后端日志，确认重置链接和Token已生成${NC}"
  else
    echo -e "${RED}❌ 测试4失败：期望状态码 200，实际 $HTTP_CODE${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  用户可能已存在，跳过注册步骤${NC}"
  
  # 直接测试密码重置
  RESET_RESPONSE=$(curl -s -w "\n< HTTP/1.1 %{http_code}\n" -X POST "$BASE_URL/api/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\"}")
  
  HTTP_CODE=$(echo "$RESET_RESPONSE" | grep "< HTTP/1.1" | awk '{print $2}')
  BODY=$(echo "$RESET_RESPONSE" | sed '/< HTTP\/1.1/d')
  
  echo "响应状态码: $HTTP_CODE"
  echo "响应内容:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}测试完成${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "1. 如果配置了邮件服务，请检查邮箱是否收到重置邮件"
echo "2. 如果未配置邮件服务，请查看后端控制台日志，会输出重置链接和Token"
echo "3. 重置链接格式: http://localhost:5173/reset-password?token=<JWT_TOKEN>"
