#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# 时空导航 AI 指导接口测试脚本
# 用法:
#   1. 启动后端服务: npm run dev
#   2. 获取一个有效的 JWT token
#   3. 运行: TOKEN=<your_token> bash scripts/test-ai-guidance.sh
# ──────────────────────────────────────────────────────────────

BASE_URL="${BASE_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ 请设置 TOKEN 环境变量，例如:"
  echo "   TOKEN=eyJhbGciOi... bash scripts/test-ai-guidance.sh"
  exit 1
fi

ENDPOINT="${BASE_URL}/api/timespace/ai-guidance"

# 最小化的 context，仅用于触发 API（实际字段由前端传入）
CONTEXT='{"year":2026,"month":2,"day":25,"stars":["紫微","天府"],"palaces":["命宫","财帛宫"]}'

echo "========================================"
echo " 时空导航 AI 指导接口测试"
echo " Endpoint: ${ENDPOINT}"
echo "========================================"

for DIM in yearly monthly daily; do
  echo ""
  echo "── 测试维度: ${DIM} ──────────────────"
  BODY=$(cat <<EOF
{
  "dimension": "${DIM}",
  "date": "2026-02-25",
  "profileId": "test-profile-id",
  "context": ${CONTEXT}
}
EOF
)

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "${BODY}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY_RESP=$(echo "$RESPONSE" | sed '$d')

  echo "HTTP Status: ${HTTP_CODE}"

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 请求成功"
    # 检查关键字段
    case $DIM in
      yearly)
        for FIELD in headline overview coreEnergy sihuaAnalysis coreLessons domains ancientWisdom do dont keywords; do
          if echo "$BODY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); assert '${FIELD}' in d" 2>/dev/null; then
            echo "  ✅ 包含字段: ${FIELD}"
          else
            echo "  ❌ 缺少字段: ${FIELD}"
          fi
        done
        ;;
      monthly)
        for FIELD in headline overview battle sihuaAnalysis rhythm domains warning ancientWisdom do dont keywords; do
          if echo "$BODY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); assert '${FIELD}' in d" 2>/dev/null; then
            echo "  ✅ 包含字段: ${FIELD}"
          else
            echo "  ❌ 缺少字段: ${FIELD}"
          fi
        done
        # 检查 rhythm 是对象
        if echo "$BODY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['rhythm']; assert isinstance(d, dict) and 'early' in d" 2>/dev/null; then
          echo "  ✅ rhythm 是对象格式 {early, mid, late}"
        else
          echo "  ❌ rhythm 不是对象格式"
        fi
        ;;
      daily)
        for FIELD in energy action warning do dont keywords; do
          if echo "$BODY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); assert '${FIELD}' in d" 2>/dev/null; then
            echo "  ✅ 包含字段: ${FIELD}"
          else
            echo "  ❌ 缺少字段: ${FIELD}"
          fi
        done
        ;;
    esac

    # 通用检查：do/dont 是字符串数组
    DO_CHECK=$(echo "$BODY_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
do_list = d.get('do', [])
if all(isinstance(x, str) for x in do_list):
    print('ok')
else:
    print('fail')
" 2>/dev/null)
    if [ "$DO_CHECK" = "ok" ]; then
      echo "  ✅ do 是字符串数组"
    else
      echo "  ❌ do 不是字符串数组"
    fi

    DONT_CHECK=$(echo "$BODY_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
dont_list = d.get('dont', [])
if all(isinstance(x, str) for x in dont_list):
    print('ok')
else:
    print('fail')
" 2>/dev/null)
    if [ "$DONT_CHECK" = "ok" ]; then
      echo "  ✅ dont 是字符串数组"
    else
      echo "  ❌ dont 不是字符串数组"
    fi

    # 检查不包含 sections/structured 嵌套
    NESTED_CHECK=$(echo "$BODY_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
if 'sections' not in d and 'structured' not in d:
    print('ok')
else:
    print('fail')
" 2>/dev/null)
    if [ "$NESTED_CHECK" = "ok" ]; then
      echo "  ✅ 无 sections/structured 嵌套"
    else
      echo "  ❌ 仍包含 sections/structured 嵌套"
    fi

    echo ""
    echo "  响应摘要 (前300字符):"
    echo "$BODY_RESP" | python3 -c "import sys; print(sys.stdin.read()[:300])" 2>/dev/null
  else
    echo "❌ 请求失败"
    echo "$BODY_RESP" | python3 -m json.tool 2>/dev/null || echo "$BODY_RESP"
  fi
done

echo ""
echo "── 测试无效 dimension ──────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"dimension":"invalid","date":"2026-02-25","profileId":"test","context":{}}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ 无效 dimension 正确返回 400"
else
  echo "❌ 无效 dimension 应返回 400，实际返回 ${HTTP_CODE}"
fi

echo ""
echo "========================================"
echo " 测试完成"
echo "========================================"
