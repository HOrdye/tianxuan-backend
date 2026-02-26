#!/bin/bash

BASE_URL="${BASE_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-your_token_here}"

# 检查是否有jq，如果没有则使用python作为替代
if command -v jq &> /dev/null; then
    JSON_FORMAT="jq '.'"
else
    JSON_FORMAT="python3 -m json.tool 2>/dev/null || cat"
fi

echo "=== 测试天机策问API ==="
echo "Base URL: $BASE_URL"
echo ""

echo "1. 测试免费版（isPaid=false）"
echo "请求: POST /api/astrology/inquiry (免费版)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/astrology/inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category": "career",
    "selectedTag": "目前工作太内耗，我适合辞职单干吗？",
    "customContext": "我在一家互联网公司工作3年，目前工作压力很大，经常加班，收入一般。最近有朋友邀请我一起创业，但我担心风险太大。",
    "isPaid": false
  }')
echo "$RESPONSE" | eval $JSON_FORMAT
echo ""

echo "2. 测试付费版（isPaid=true）"
echo "请求: POST /api/astrology/inquiry (付费版)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/astrology/inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category": "career",
    "selectedTag": "目前工作太内耗，我适合辞职单干吗？",
    "customContext": "我在一家互联网公司工作3年，目前工作压力很大，经常加班，收入一般。最近有朋友邀请我一起创业，但我担心风险太大。",
    "isPaid": true
  }')
echo "$RESPONSE" | eval $JSON_FORMAT
echo ""

echo "3. 测试参数验证（缺少category）"
echo "请求: POST /api/astrology/inquiry (缺少category)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/astrology/inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customContext": "测试内容",
    "isPaid": false
  }')
echo "$RESPONSE" | eval $JSON_FORMAT
echo ""

echo "4. 测试参数验证（customContext为空）"
echo "请求: POST /api/astrology/inquiry (customContext为空)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/astrology/inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category": "career",
    "customContext": "",
    "isPaid": false
  }')
echo "$RESPONSE" | eval $JSON_FORMAT
echo ""

echo "5. 测试参数验证（category无效）"
echo "请求: POST /api/astrology/inquiry (category无效)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/astrology/inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category": "invalid_category",
    "customContext": "测试内容",
    "isPaid": false
  }')
echo "$RESPONSE" | eval $JSON_FORMAT
echo ""

echo "6. 测试snake_case参数兼容"
echo "请求: POST /api/astrology/inquiry (snake_case)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/astrology/inquiry" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "category": "love",
    "selected_tag": "这段感情让我很累，是正缘还是孽缘？",
    "custom_context": "我们在一起2年了，最近经常吵架，感觉越来越累。",
    "is_paid": false
  }')
echo "$RESPONSE" | eval $JSON_FORMAT
echo ""

echo "=== 测试完成 ==="
