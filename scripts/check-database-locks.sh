#!/bin/bash

echo "=========================================="
echo "检查数据库锁和事务状态"
echo "=========================================="
echo ""

# 检查是否有长时间运行的事务
echo "1. 检查长时间运行的事务..."
echo "SELECT pid, now() - xact_start AS duration, state, query FROM pg_stat_activity WHERE state = 'idle in transaction' AND now() - xact_start > interval '1 minute';" | psql -U postgres -d tianxuan 2>/dev/null || echo "无法连接到数据库"

echo ""
echo "2. 检查锁等待..."
echo "SELECT blocked_locks.pid AS blocked_pid, blocked_activity.usename AS blocked_user, blocking_locks.pid AS blocking_pid, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype AND blocking_locks.pid != blocked_locks.pid JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;" | psql -U postgres -d tianxuan 2>/dev/null || echo "无法连接到数据库"

echo ""
echo "3. 检查 profiles 表的锁..."
echo "SELECT locktype, relation::regclass, mode, granted, pid FROM pg_locks WHERE relation = 'profiles'::regclass;" | psql -U postgres -d tianxuan 2>/dev/null || echo "无法连接到数据库"

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
