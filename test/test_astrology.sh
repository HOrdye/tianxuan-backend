#!/bin/bash

# 紫微斗数 API 测试脚本
# 使用方法: bash test_astrology.sh

BASE_URL="http://localhost:3000"
TEST_EMAIL="astrology_test_$(date +%s)@example.com"
TEST_PASSWORD="test123456"
TEST_USERNAME="astrology_test_user"

echo "=========================================="
echo "紫微斗数 API 测试开始"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
PASSED=0
FAILED=0
TOTAL=0

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    TOTAL=$((TOTAL + 1))
    echo -n "测试 $TOTAL: $test_name ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (期望 HTTP $expected_status, 实际 HTTP $http_code)"
        FAILED=$((FAILED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 1
    fi
}

# 步骤 1: 注册新用户
echo "步骤 1: 注册新用户"
echo "----------------------------------------"
register_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"username\":\"$TEST_USERNAME\"}"
register_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$register_data" \
    "$BASE_URL/api/auth/register")

TOKEN=$(echo "$register_response" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${YELLOW}注册失败，尝试登录...${NC}"
    login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
    login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$login_data" \
        "$BASE_URL/api/auth/login")
    TOKEN=$(echo "$login_response" | jq -r '.data.token // empty')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}无法获取 Token，测试终止${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token 获取成功${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 步骤 2: 查询余额（确保有足够的天机币）
echo "步骤 2: 查询天机币余额"
echo "----------------------------------------"
balance_response=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/api/coins/balance")

balance=$(echo "$balance_response" | jq -r '.data.tianji_coins_balance // 0')
echo "当前余额: $balance 天机币"
echo ""

# 如果余额不足，尝试签到获取天机币
if [ "$balance" -lt 20 ]; then
    echo -e "${YELLOW}余额不足，尝试签到获取天机币...${NC}"
    checkin_response=$(curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE_URL/api/checkin")
    echo "$checkin_response" | jq '.' 2>/dev/null || echo "$checkin_response"
    echo ""
fi

echo "=========================================="
echo "开始测试紫微斗数 API"
echo "=========================================="
echo ""

# 测试 1: 保存命盘结构
test_api "保存命盘结构" "POST" "/api/astrology/star-chart" \
    '{
        "chart_structure": {
            "birth_date": "1990-01-01",
            "birth_time": "12:00:00",
            "gender": "male",
            "stars": {
                "ziwei": "ziwei",
                "tianji": "tianji",
                "taiyang": "taiyang"
            },
            "palaces": {
                "ming": "ming",
                "fu": "fu",
                "cai": "cai"
            }
        },
        "brief_analysis_cache": {
            "summary": "命盘分析摘要",
            "key_points": ["要点1", "要点2"]
        }
    }' 200

# 测试 2: 查询命盘结构
test_api "查询命盘结构" "GET" "/api/astrology/star-chart" "" 200

# 测试 3: 更新简要分析缓存
test_api "更新简要分析缓存" "PUT" "/api/astrology/star-chart/brief-analysis" \
    '{
        "brief_analysis_cache": {
            "summary": "更新后的命盘分析摘要",
            "key_points": ["更新要点1", "更新要点2", "更新要点3"],
            "updated_at": "2025-01-30T13:00:00Z"
        }
    }' 200

# 测试 4: 解锁时空资产（需要扣费）
test_api "解锁时空资产" "POST" "/api/astrology/time-assets/unlock" \
    '{
        "dimension": "year",
        "period_start": "2025-01-01",
        "period_end": "2025-12-31",
        "period_type": "year",
        "expires_at": "2026-01-01T00:00:00Z",
        "cost_coins": 10
    }' 200

# 保存资产ID（如果成功）
if [ $? -eq 0 ]; then
    ASSET_ID=$(echo "$body" | jq -r '.data.asset_id // empty' 2>/dev/null)
fi

# 测试 5: 查询已解锁的时空资产
test_api "查询已解锁的时空资产" "GET" "/api/astrology/time-assets?limit=50&offset=0" "" 200

# 测试 6: 检查时间段是否已解锁
test_api "检查时间段是否已解锁" "GET" "/api/astrology/time-assets/check?dimension=year&period_start=2025-01-01&period_end=2025-12-31" "" 200

# 测试 7: 保存/更新缓存数据
test_api "保存/更新缓存数据" "POST" "/api/astrology/cache" \
    '{
        "dimension": "year",
        "cache_key": "yearly_analysis_2025",
        "cache_data": {
            "analysis": "2025年运势分析",
            "key_events": ["事件1", "事件2"],
            "recommendations": ["建议1", "建议2"]
        },
        "period_start": "2025-01-01",
        "period_end": "2025-12-31",
        "expires_at": "2026-01-01T00:00:00Z"
    }' 200

# 测试 8: 查询缓存数据
test_api "查询缓存数据" "GET" "/api/astrology/cache?dimension=year&cache_key=yearly_analysis_2025&period_start=2025-01-01&period_end=2025-12-31" "" 200

# 测试 9: 参数验证错误（缺少必需参数）
test_api "参数验证错误（缺少必需参数）" "POST" "/api/astrology/star-chart" \
    '{
        "brief_analysis_cache": {}
    }' 400

# 测试 10: 未认证请求
test_api "未认证请求" "GET" "/api/astrology/star-chart" "" 401

# 测试 11: 日期格式验证（错误的日期格式）
test_api "日期格式验证（错误的日期格式）" "POST" "/api/astrology/time-assets/unlock" \
    '{
        "dimension": "year",
        "period_start": "2025/01/01",
        "period_end": "2025-12-31",
        "period_type": "year",
        "expires_at": "2026-01-01T00:00:00Z",
        "cost_coins": 10
    }' 400

# 测试 12: 重复解锁（应该失败）
test_api "重复解锁（应该失败）" "POST" "/api/astrology/time-assets/unlock" \
    '{
        "dimension": "year",
        "period_start": "2025-01-01",
        "period_end": "2025-12-31",
        "period_type": "year",
        "expires_at": "2026-01-01T00:00:00Z",
        "cost_coins": 10
    }' 400

# 测试总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总测试数: $TOTAL"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
