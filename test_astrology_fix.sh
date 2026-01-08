#!/bin/bash

# 紫微斗数 API 重新测试脚本（修复 profiles 记录后）
# 测试时间：2025-01-30

BASE_URL="http://localhost:3000"
TEST_EMAIL="astrology-test-$(date +%s)@example.com"
TEST_PASSWORD="Test123456"
TEST_USERNAME="astrologytest"

echo "=========================================="
echo "🔮 紫微斗数 API 重新测试（修复后）"
echo "=========================================="
echo "测试邮箱: $TEST_EMAIL"
echo "测试时间: $(date)"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 步骤 1: 注册新用户（使用修复后的 register 函数）
echo -e "${BLUE}📝 步骤 1: 注册新用户（验证修复后的 register 函数）${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"username\": \"$TEST_USERNAME\"}")

echo "注册响应: $REGISTER_RESPONSE"
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -oP '"userId"\s*:\s*"[^"]+"' | head -1 | cut -d'"' -f4)
echo "用户ID: $USER_ID"
echo ""

if [[ -z "$USER_ID" ]]; then
    echo -e "${RED}❌ 注册失败，无法继续测试${NC}"
    exit 1
fi

# 步骤 2: 登录获取 Token
echo -e "${BLUE}📝 步骤 2: 登录获取 Token${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token"\s*:\s*"[^"]+"' | head -1 | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."
echo ""

if [[ -z "$TOKEN" ]]; then
    echo -e "${RED}❌ 登录失败，无法继续测试${NC}"
    exit 1
fi

# 步骤 3: 验证 profiles 记录是否存在（关键验证）
echo -e "${BLUE}📝 步骤 3: 验证 profiles 记录是否存在（关键验证）${NC}"
PROFILE_RESPONSE=$(curl -s -X GET $BASE_URL/api/user/profile \
    -H "Authorization: Bearer $TOKEN")

PROFILE_STATUS=$(echo "$PROFILE_RESPONSE" | grep -oP '"success"\s*:\s*(true|false)' | head -1 | cut -d':' -f2 | tr -d ' ')

if [[ "$PROFILE_STATUS" == "true" ]]; then
    echo -e "${GREEN}✅ profiles 记录存在，修复成功！${NC}"
    echo "用户资料: $PROFILE_RESPONSE"
    echo ""
else
    echo -e "${RED}❌ profiles 记录不存在，修复可能失败${NC}"
    echo "响应: $PROFILE_RESPONSE"
    echo ""
fi

# 步骤 4: 查询余额（确保有足够的天机币）
echo -e "${BLUE}📝 步骤 4: 查询余额${NC}"
BALANCE_RESPONSE=$(curl -s -X GET $BASE_URL/api/coins/balance \
    -H "Authorization: Bearer $TOKEN")
echo "余额: $BALANCE_RESPONSE"
echo ""

# 开始测试紫微斗数 API
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 开始测试紫微斗数 API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 1: 保存命盘结构（关键测试 - 之前失败）
echo -e "${YELLOW}🔥 关键测试 1: 保存命盘结构（之前返回404'用户不存在'）${NC}"
CHART_STRUCTURE='{"birth_date":"1990-01-01","birth_time":"12:00:00","gender":"male","stars":{"ziwei":"ziwei","tianji":"tianji"},"palaces":{"ming":"ming","fu":"fu"}}'
BRIEF_ANALYSIS='{"summary":"测试命盘分析摘要","key_points":["要点1","要点2"]}'

SAVE_CHART_RESPONSE=$(curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/astrology/star-chart \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"chart_structure\": $CHART_STRUCTURE, \"brief_analysis_cache\": $BRIEF_ANALYSIS}")

SAVE_CHART_STATUS=$(echo "$SAVE_CHART_RESPONSE" | grep -oP '(?<=< HTTP/1.[01] )\d+' || echo "000")
SAVE_CHART_BODY=$(echo "$SAVE_CHART_RESPONSE" | sed -n '/^{/,$p')

echo "响应状态码: $SAVE_CHART_STATUS"
echo "响应内容: $SAVE_CHART_BODY"
echo ""

if [[ "$SAVE_CHART_STATUS" == "200" ]]; then
    echo -e "${GREEN}✅ 通过 - 保存命盘成功！修复生效！${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 失败 - 保存命盘失败，状态码: $SAVE_CHART_STATUS${NC}"
    ((FAILED++))
fi

echo ""

# 测试 2: 查询命盘结构
echo "📝 测试 2: 查询命盘结构"
test_case "查询命盘结构" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/astrology/star-chart \
    -H 'Authorization: Bearer $TOKEN'"

# 测试 3: 更新简要分析缓存
echo "📝 测试 3: 更新简要分析缓存"
UPDATE_ANALYSIS='{"summary":"更新后的命盘分析摘要","key_points":["更新要点1","更新要点2"]}'
test_case "更新简要分析缓存" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X PUT $BASE_URL/api/astrology/star-chart/brief-analysis \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d \"{\\\"brief_analysis_cache\\\": $UPDATE_ANALYSIS}\""

# 测试 4: 解锁时空资产（需要扣费）
echo "📝 测试 4: 解锁时空资产（需要扣费）"
test_case "解锁时空资产" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/astrology/time-assets/unlock \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{\"dimension\":\"year\",\"period_start\":\"2025-01-01\",\"period_end\":\"2025-12-31\",\"period_type\":\"year\",\"expires_at\":\"2026-01-01T00:00:00Z\",\"cost_coins\":10}'"

# 测试 5: 查询已解锁的时空资产
echo "📝 测试 5: 查询已解锁的时空资产"
test_case "查询已解锁的时空资产" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET '$BASE_URL/api/astrology/time-assets?limit=50&offset=0' \
    -H 'Authorization: Bearer $TOKEN'"

# 测试 6: 检查时间段是否已解锁
echo "📝 测试 6: 检查时间段是否已解锁"
test_case "检查时间段是否已解锁" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET '$BASE_URL/api/astrology/time-assets/check?dimension=year&period_start=2025-01-01&period_end=2025-12-31' \
    -H 'Authorization: Bearer $TOKEN'"

# 测试 7: 保存/更新缓存数据
echo "📝 测试 7: 保存/更新缓存数据"
CACHE_DATA='{"analysis":"2025年运势分析","key_events":["事件1","事件2"],"recommendations":["建议1","建议2"]}'
test_case "保存/更新缓存数据" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/astrology/cache \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d \"{\\\"dimension\\\":\\\"year\\\",\\\"cache_key\\\":\\\"yearly_analysis_2025\\\",\\\"cache_data\\\": $CACHE_DATA,\\\"period_start\\\":\\\"2025-01-01\\\",\\\"period_end\\\":\\\"2025-12-31\\\",\\\"expires_at\\\":\\\"2026-01-01T00:00:00Z\\\"}\""

# 测试 8: 查询缓存数据
echo "📝 测试 8: 查询缓存数据"
test_case "查询缓存数据" "200" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET '$BASE_URL/api/astrology/cache?dimension=year&cache_key=yearly_analysis_2025&period_start=2025-01-01&period_end=2025-12-31' \
    -H 'Authorization: Bearer $TOKEN'"

# 测试 9: 参数验证错误
echo "📝 测试 9: 参数验证错误（缺少必需参数）"
test_case "参数验证错误" "400" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X POST $BASE_URL/api/astrology/star-chart \
    -H 'Authorization: Bearer $TOKEN' \
    -H 'Content-Type: application/json' \
    -d '{\"brief_analysis_cache\":{}}'"

# 测试 10: 未认证请求
echo "📝 测试 10: 未认证请求"
test_case "未认证请求" "401" \
    "curl -s -w '\n< HTTP/1.1 %{http_code}\n' -X GET $BASE_URL/api/astrology/star-chart"

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
    echo ""
    echo -e "${GREEN}✅ 关键验证：${NC}"
    echo "1. ✅ profiles 记录已创建"
    echo "2. ✅ 保存命盘结构成功（之前失败的问题已修复）"
    echo "3. ✅ 所有紫微斗数 API 功能正常"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED 个测试失败，请检查${NC}"
    exit 1
fi
