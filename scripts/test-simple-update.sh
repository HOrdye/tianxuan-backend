#!/bin/bash

API_URL="${API_URL:-http://localhost:3000/api}"
TOKEN="${TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzU1MTBmNy1iNjZkLTRmOWUtOGU0Ny0yMmI5MTE0YTcyODAiLCJlbWFpbCI6Ijc0MDI3OTEzNEBxcS5jb20iLCJpYXQiOjE3NjkwOTQ0NjcsImV4cCI6MTc2OTY5OTI2N30.GU_KKBbDgfuR5SrKdTqCi13L_1A99LOKTT4cDQ1SN8M}"

echo "=========================================="
echo "简单更新测试（调试用）"
echo "=========================================="
echo ""

echo "测试 PUT /api/user/destiny-card（只更新一个字段）"
echo "开始时间: $(date +%H:%M:%S)"

timeout 15 curl -v -X PUT "${API_URL}/user/destiny-card" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"mbti":"INTJ"}' \
  2>&1 | head -50

echo ""
echo "结束时间: $(date +%H:%M:%S)"
echo "=========================================="
