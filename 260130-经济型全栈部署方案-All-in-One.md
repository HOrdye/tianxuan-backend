# 经济型全栈部署方案 (All-in-One)

**创建时间**: 2025年1月30日  
**方案类型**: 轻量服务器单机全栈部署  
**服务器配置**: 2核2G 轻量应用服务器  
**最后更新**: 2025年1月8日（凌晨）

---

## 📊 部署进度

### ✅ 已完成阶段

- ✅ **第一阶段：服务器环境准备**（已完成）
  - ✅ 系统要求检查
  - ✅ 安装基础软件（Docker、Node.js、Nginx）
  - ✅ 创建项目目录结构

- ✅ **第二阶段：PostgreSQL 数据库部署**（已完成）
  - ✅ Docker Compose 配置
  - ✅ 环境变量配置
  - ✅ PostgreSQL 容器启动
  - ✅ 数据库初始化（所有 SQL 脚本已导入）
    - ✅ migration-00-prerequisites.sql（前置依赖）
    - ✅ migration-tables-with-data-complete.sql（有数据的表）
    - ✅ migration-empty-tables-complete.sql（空表）
    - ✅ migration-all-functions-complete.sql（数据库函数）
    - ✅ migration-all-triggers.sql（触发器）
    - ✅ migration-refactor-auth-uid-to-explicit-params.sql（可选优化）

### 🚧 进行中阶段

- 🚧 **第三阶段：Node.js 后端服务搭建**（进行中）
  - ✅ 项目初始化（已完成）
  - ✅ 基础配置（已完成）
    - ✅ 数据库连接配置（心跳正常，延迟 41ms）
    - ✅ Express 应用启动（运行在端口 3000）
  - ✅ 认证系统开发（已完成）
    - ✅ 密码工具模块（`src/utils/password.ts`）
    - ✅ 认证服务模块（`src/services/auth.service.ts`）
    - ✅ 认证中间件（`src/middleware/auth.middleware.ts`）
    - ✅ 认证路由和控制器（`src/routes/auth.routes.ts`, `src/controllers/auth.controller.ts`）
    - ✅ 测试验证（9/9 测试用例通过，100%）
    - ✅ 测试结果报告（`TEST_AUTH.md`）
  - ✅ 用户资料 API 开发（已完成）
    - ✅ 用户资料服务模块（`src/services/user.service.ts`）
    - ✅ 用户资料路由和控制器（`src/routes/user.routes.ts`, `src/controllers/user.controller.ts`）
    - ✅ 测试验证（6/6 测试用例通过，100%）
    - ✅ 测试结果报告（`TEST_USER_API.md`）
  - ✅ 天机币系统 API 开发（已完成）
    - ✅ 天机币服务模块（`src/services/coins.service.ts`）
    - ✅ 天机币路由和控制器（`src/routes/coins.routes.ts`, `src/controllers/coins.controller.ts`）
    - ✅ 管理员权限检查中间件（`src/middleware/admin.middleware.ts`）
    - ✅ 路由注册（已在 `src/app.ts` 中注册）
    - ✅ 测试文档（`TEST_COINS.md`）
    - ✅ 测试验证（7/7 测试用例通过，100%）
    - ✅ 测试结果报告（`TEST_COINS_RESULT.md`）
  - ✅ 签到系统 API 开发（已完成）
    - ✅ 签到服务模块（`src/services/checkin.service.ts`）
    - ✅ 签到路由和控制器（`src/routes/checkin.routes.ts`, `src/controllers/checkin.controller.ts`）
    - ✅ 路由注册（已在 `src/app.ts` 中注册）
    - ✅ 测试验证（7/7 测试用例通过，100%）
    - ✅ 测试结果报告（`TEST_CHECKIN_RESULT.md`）
  - ✅ 支付系统 API 开发（已完成）
    - ✅ 支付服务模块（`src/services/payment.service.ts`）
    - ✅ 支付路由和控制器（`src/routes/payment.routes.ts`, `src/controllers/payment.controller.ts`）
    - ✅ Mock 支付路由（`POST /api/payment/mock/success`，仅开发环境）
    - ✅ 路由注册（已在 `src/app.ts` 中注册）
    - ✅ 测试验证（8/8 测试用例通过，100%）
    - ✅ 测试结果报告（`TEST_PAYMENT_RESULT.md`）
    - ✅ **修复问题**: 数据库约束错误（item_type 字段），已修复为使用 'coin_pack'
  - ✅ 紫微斗数 API 开发（已完成）
    - ✅ 紫微斗数服务模块（`src/services/astrology.service.ts`）
    - ✅ 紫微斗数路由和控制器（`src/routes/astrology.routes.ts`, `src/controllers/astrology.controller.ts`）
    - ✅ 路由注册（已在 `src/app.ts` 中注册）
    - ✅ 测试文档（`TEST_ASTROLOGY.md`）
    - ✅ 功能实现：
      - ✅ 命盘存档（保存/更新命盘结构）
      - ✅ 查询命盘结构
      - ✅ 更新简要分析缓存
      - ✅ 解锁时空资产（需要扣费）
      - ✅ 查询已解锁的时空资产
      - ✅ 检查时间段是否已解锁
      - ✅ 保存/更新缓存数据
      - ✅ 查询缓存数据

### ⏳ 待开始阶段

- ⏳ **第四阶段：前端构建和部署**
- ⏳ **第五阶段：从 Supabase 迁移到自建后端**

---

## 📋 方案概述

### 架构设计

```
┌─────────────────────────────────────────────────┐
│           轻量应用服务器 (2核2G)                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Nginx (端口 80/443)                     │  │
│  │  - 静态文件服务 (Vue dist)               │  │
│  │  - 反向代理 (API → Node.js)              │  │
│  └──────────────────────────────────────────┘  │
│                    ↕                            │
│  ┌──────────────────────────────────────────┐  │
│  │  Node.js 后端服务 (端口 3000)             │  │
│  │  - RESTful API                            │  │
│  │  - 业务逻辑处理                           │  │
│  │  - 认证授权                               │  │
│  └──────────────────────────────────────────┘  │
│                    ↕ (localhost:5432)         │
│  ┌──────────────────────────────────────────┐  │
│  │  PostgreSQL 17 (Docker 容器)              │  │
│  │  - 数据存储                               │  │
│  │  - 用户认证数据                           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 核心优势

1. **💰 成本极低**: 单台服务器运行所有服务，无需额外 RDS 费用
2. **⚡ 性能优秀**: 后端通过 localhost 连接数据库，延迟 < 1ms
3. **🔧 配置简单**: 无需配置云防火墙、VPC 内网互通等复杂网络
4. **📦 资源集中**: 所有服务在同一台机器，便于监控和维护

### 资源分配建议（2核2G）

| 服务 | CPU | 内存 | 说明 |
|------|-----|------|------|
| PostgreSQL | 0.5核 | 512MB | 数据库基础运行 |
| Node.js 后端 | 1核 | 1024MB | 业务逻辑处理 |
| Nginx | 0.3核 | 256MB | 静态文件和反向代理 |
| 系统预留 | 0.2核 | 256MB | 操作系统和监控 |

---

## 🚀 部署步骤

### 第一阶段：服务器环境准备

#### 1.1 系统要求检查

```bash
# 检查系统版本
cat /etc/os-release

# 检查内存和CPU
free -h
nproc

# 检查磁盘空间（至少需要 20GB）
df -h
```

**推荐系统**: Ubuntu 22.04 LTS 或 CentOS 8+

#### 1.2 安装基础软件

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# 或
sudo yum update -y  # CentOS/RHEL

# 安装必要工具
sudo apt install -y curl wget git vim htop  # Ubuntu/Debian
sudo yum install -y curl wget git vim htop   # CentOS/RHEL

# 安装 Docker（如果未安装）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 安装 Node.js 18+ (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs  # Ubuntu/Debian
# 或
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # CentOS/RHEL

# 安装 Nginx
sudo apt install -y nginx   # Ubuntu/Debian
sudo yum install -y nginx    # CentOS/RHEL
sudo systemctl enable nginx
```

#### 1.3 创建项目目录结构

```bash
# 创建项目根目录
sudo mkdir -p /opt/tianxuan
sudo chown $USER:$USER /opt/tianxuan
cd /opt/tianxuan

# 创建目录结构
mkdir -p {backend,frontend,nginx,postgres,docker,logs,backups}
```

---

### 第二阶段：PostgreSQL 数据库部署

#### 2.1 Docker Compose 配置

创建 `/opt/tianxuan/docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    container_name: tianxuan-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: tianxuan
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # 从 .env 文件读取
      POSTGRES_DB: tianxuan
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - ../postgres/data:/var/lib/postgresql/data
      - ../postgres/init:/docker-entrypoint-init.d
    ports:
      - "127.0.0.1:5432:5432"  # 仅监听本地，不对外暴露
    networks:
      - tianxuan-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tianxuan"]
      interval: 10s
      timeout: 5s
      retries: 5
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=128MB"
      - "-c"
      - "max_connections=50"
      - "-c"
      - "effective_cache_size=256MB"
      - "-c"
      - "maintenance_work_mem=32MB"
      - "-c"
      - "checkpoint_completion_target=0.9"
      - "-c"
      - "wal_buffers=16MB"
      - "-c"
      - "default_statistics_target=100"
      - "-c"
      - "random_page_cost=1.1"
      - "-c"
      - "effective_io_concurrency=200"
      - "-c"
      - "work_mem=4MB"
      - "-c"
      - "min_wal_size=1GB"
      - "-c"
      - "max_wal_size=4GB"

networks:
  tianxuan-network:
    driver: bridge
```

#### 2.2 环境变量配置

创建 `/opt/tianxuan/docker/.env`:

```env
# PostgreSQL 配置
POSTGRES_PASSWORD=你的强密码（至少16位，包含大小写字母、数字、特殊字符）

# 示例生成密码（在本地执行）:
# openssl rand -base64 24
```

**⚠️ 安全提示**: 
- 密码必须足够强（至少16位）
- `.env` 文件不要提交到 Git
- 定期备份数据库

#### 2.3 启动 PostgreSQL

```bash
cd /opt/tianxuan/docker

# 创建 .env 文件并设置密码
echo "POSTGRES_PASSWORD=你的强密码" > .env

# 启动 PostgreSQL
docker-compose up -d

# 检查状态
docker-compose ps
docker-compose logs postgres

# 测试连接
docker exec -it tianxuan-postgres psql -U tianxuan -d tianxuan
```

#### 2.4 数据库初始化

**⚠️ 重要：导入前准备**

1. **确认数据库连接**:
   - 使用 DBeaver 通过 SSH 隧道连接
   - 主机: `localhost` (通过 SSH 隧道)
   - 端口: `5432`
   - 数据库: `tianxuan`
   - 用户名: `tianxuan`
   - 密码: 你在 `.env` 中设置的密码

2. **确认数据库为空**（或已备份）:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_type = 'BASE TABLE';
   ```

**导入步骤（按顺序执行，⚠️ 顺序很重要！）**:

**第零步：创建前置依赖（必须先执行！）**
```sql
-- 文件: scripts/migration-00-prerequisites.sql
-- ⚠️ 必须最先执行！
-- 包含：
--   - 启用 uuid-ossp 扩展（提供 gen_random_uuid()）
--   - 创建 auth schema
--   - 创建 auth.users 表（profiles 表依赖此表）
--   - 创建 auth.uid() 函数（函数中会用到）
```

**第一步：导入有数据的表结构**
```sql
-- 文件: scripts/migration-tables-with-data-complete.sql
-- 包含：profiles, profiles_archives, transactions 等核心表
-- 这些表之间有外键关系，必须先创建
-- ⚠️ 注意：profiles 表引用了 auth.users，所以必须先执行第零步
```

**第二步：导入空表结构**
```sql
-- 文件: scripts/migration-empty-tables-complete.sql
-- 包含：unlocked_time_assets, timespace_cache 等
-- 这些表可能引用前面创建的表
```

**第三步：导入数据库函数**
```sql
-- 文件: scripts/migration-all-functions-complete.sql
-- 包含：管理员系统函数、用户注册函数、天机币系统函数等
-- ⚠️ 注意：handle_new_user() 函数保留但不会自动触发（见第四步说明）
```

**第四步：导入触发器**
```sql
-- 文件: scripts/migration-all-triggers.sql
-- 包含：更新时间触发器、订阅同步触发器
-- ⚠️ 注意：用户注册触发器已禁用，使用 Node.js 后端控制注册流程
```

**第五步（可选但强烈推荐）：重构 auth.uid() 函数**
```sql
-- 文件: scripts/migration-refactor-auth-uid-to-explicit-params.sql
-- 用途：将使用 auth.uid() 的函数改为显式参数传递
-- 优势：函数变成纯粹的数学函数，不依赖会话状态，测试和调试简单 10 倍
-- 重构的函数：
--   - is_admin(p_user_id UUID) - 检查用户是否为管理员
--   - set_user_role(p_operator_id UUID, target_user_id UUID, new_role TEXT) - 设置用户角色
--   - admin_adjust_coins(p_operator_id UUID, target_user_id UUID, ...) - 管理员调整天机币
-- 
-- ⚠️ 为什么需要这个单独的 SQL 文件？
-- 1. 这是一个可选的优化步骤，不是必须的，但强烈推荐
-- 2. 如果跳过此步骤，Node.js 后端仍可通过设置会话变量使用 auth.uid()
-- 3. 但使用显式参数的方式更清晰、更易测试、更易维护
-- 4. 这是一个数据库结构变更，需要单独执行，便于版本控制和回滚
```

**⚠️ 重要说明**:
- 所有导入 SQL 文件中的 `ENABLE ROW LEVEL SECURITY` 语句**已被注释**，不会执行
- 每个导入 SQL 文件末尾都包含 `DISABLE ROW LEVEL SECURITY` 语句，确保 RLS 被禁用
- 因为使用 Node.js 后端控制权限，不需要数据库层面的 RLS

**验证导入结果**:

```sql
-- 1. 检查表是否创建成功（应该看到19个表）
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. 检查函数是否创建成功（应该看到约20个函数）
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 3. 检查触发器是否创建成功（应该看到9个启用的触发器：8个更新时间 + 1个订阅同步）
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 4. 检查 RLS 是否已禁用（所有表的 rls_enabled 应该都是 false）
SELECT 
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND relkind = 'r'
ORDER BY relname;
```

**常见问题**:

1. **外键约束错误**: `ERROR: relation "auth.users" does not exist`
   - 解决：需要先创建 `auth.users` 表（见下方）

2. **auth.uid() 函数不存在**: `ERROR: function auth.uid() does not exist`
   - 解决：创建 `auth.uid()` 函数（见下方）

3. **gen_random_uuid() 函数不存在**
   - 解决：执行 `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

**⚠️ 重要修正：前置依赖问题**

在导入表结构之前，必须先创建以下前置依赖：

1. **uuid-ossp 扩展**：提供 `gen_random_uuid()` 函数
2. **auth.users 表**：`profiles` 表有外键引用此表
3. **auth.uid() 函数**：数据库函数中会用到

**解决方案**：已创建 `scripts/migration-00-prerequisites.sql` 文件，包含所有前置依赖。

**⚠️ 执行顺序**：
```
0. migration-00-prerequisites.sql  (必须先执行！)
   ↓
1. migration-tables-with-data-complete.sql
   ↓
2. migration-empty-tables-complete.sql
   ↓
3. migration-all-functions-complete.sql
   ↓
4. migration-all-triggers.sql
```

**关于用户注册触发器**：

- `handle_new_user()` 触发器已禁用（在 `migration-all-triggers.sql` 中注释）
- 原因：使用 Node.js 后端控制注册流程更可靠
- 建议：在 Node.js 后端中，在一个事务中同时创建 `auth.users` 和 `profiles`
- 函数定义保留：`handle_new_user()` 函数仍然保留，以防需要手动调用

#### 2.5 数据库优化配置（2G内存限制）

PostgreSQL 配置已在上面的 `docker-compose.yml` 中优化，关键参数：

- `shared_buffers=128MB`: 共享内存缓冲区（约为总内存的 25%）
- `max_connections=50`: 最大连接数（2G内存限制）
- `effective_cache_size=256MB`: 有效缓存大小
- `work_mem=4MB`: 每个查询操作的内存（50连接 × 4MB = 200MB）

---

### 第三阶段：Node.js 后端服务搭建

#### 3.1 项目结构规划

```
/opt/tianxuan/backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.ts  # 数据库连接配置
│   │   └── env.ts       # 环境变量
│   ├── controllers/     # 控制器
│   ├── services/        # 业务逻辑
│   ├── models/          # 数据模型
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由
│   ├── utils/           # 工具函数
│   └── app.ts           # 应用入口
├── package.json
├── tsconfig.json
└── .env
```

#### 3.2 初始化后端项目

```bash
cd /opt/tianxuan/backend

# 初始化 Node.js 项目
npm init -y

# 安装核心依赖
npm install express
npm install pg                    # PostgreSQL 客户端
npm install dotenv               # 环境变量
npm install cors                 # CORS 支持
npm install helmet               # 安全头
npm install compression          # 响应压缩
npm install express-rate-limit   # 限流
npm install jsonwebtoken        # JWT 认证
npm install bcryptjs             # 密码加密
npm install zod                  # 数据验证

# 安装开发依赖
npm install -D typescript @types/node @types/express @types/pg @types/cors @types/jsonwebtoken @types/bcryptjs
npm install -D ts-node nodemon tsx
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint
```

#### 3.3 创建基础配置文件

**`/opt/tianxuan/backend/package.json`**:

```json
{
  "name": "tianxuan-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "start:prod": "NODE_ENV=production node dist/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4"
  }
}
```

**`/opt/tianxuan/backend/tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`/opt/tianxuan/backend/.env`**:

```env
# 服务器配置
NODE_ENV=production
PORT=3000

# 数据库配置（重要：使用 DATABASE_URL 或单独配置）
# 方式1：使用 DATABASE_URL（推荐）
DATABASE_URL=postgresql://tianxuan:你的强密码@localhost:5432/tianxuan

# 方式2：单独配置（如果 DATABASE_URL 未设置，会使用这些）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tianxuan
DB_USER=tianxuan
DB_PASSWORD=你的数据库密码

# 注意：
# - 如果 Node.js 和 PostgreSQL 都在 Docker 网络里，host 可能是 postgres
# - 如果是本机跑 Node.js 连 Docker 数据库，host 是 localhost
# - 如果 Node.js 在服务器上，PostgreSQL 在 Docker 容器中，host 是 localhost（通过端口映射）

# JWT 配置
JWT_SECRET=你的JWT密钥（至少32位随机字符串）
JWT_EXPIRES_IN=7d

# CORS 配置
CORS_ORIGIN=https://your-domain.com

# 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 3.4 创建数据库连接模块

**`/opt/tianxuan/backend/src/config/database.ts`**:

```typescript
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 优先使用 DATABASE_URL，如果没有则使用单独配置
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      // 连接池配置
      max: 20,  // 最大连接数（不超过 PostgreSQL 的 max_connections=50）
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'tianxuan',
    user: process.env.DB_USER || 'tianxuan',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

export const pool = new Pool(getDatabaseConfig());

// 测试连接
pool.on('connect', () => {
  console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接错误:', err);
  process.exit(-1);
});

// 健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return false;
  }
}
```

#### 3.5 创建 Express 应用入口

**`/opt/tianxuan/backend/src/app.ts`**:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { checkDatabaseHealth } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet());
app.use(compression());

// CORS 配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流中间件
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: '请求过于频繁，请稍后再试',
});
app.use('/api/', limiter);

// 健康检查
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'error',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API 路由（后续添加）
app.get('/api', (req, res) => {
  res.json({ message: 'TianXuan API v1.0' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`);
});
```

#### 3.6 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
sudo npm install -g pm2

# 创建 PM2 配置文件
cat > /opt/tianxuan/backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'tianxuan-backend',
    script: './dist/app.js',
    instances: 1,  // 单实例（2核限制）
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '../logs/backend-error.log',
    out_file: '../logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',  // 内存超过1G自动重启
    autorestart: true,
    watch: false
  }]
};
EOF

# 启动服务
cd /opt/tianxuan/backend
npm run build
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

---

### 第四阶段：前端构建和部署

#### 4.1 构建前端项目

**在本地开发机器上**:

```bash
# 克隆或复制项目到本地
cd /path/to/tianxuan-web

# 安装依赖（如果未安装）
npm install

# 修改环境变量配置
# 创建 .env.production 文件
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://your-domain.com/api/supabase
VITE_SUPABASE_ANON_KEY=你的Supabase Anon Key
VITE_API_BASE_URL=https://your-domain.com/api
EOF

# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

#### 4.2 上传前端文件到服务器

```bash
# 在本地执行
cd /path/to/tianxuan-web

# 压缩构建产物
tar -czf dist.tar.gz dist/

# 上传到服务器
scp dist.tar.gz user@your-server:/opt/tianxuan/frontend/

# SSH 连接到服务器
ssh user@your-server

# 解压文件
cd /opt/tianxuan/frontend
tar -xzf dist.tar.gz
rm dist.tar.gz
```

#### 4.3 配置 Nginx

**`/etc/nginx/sites-available/tianxuan`**:

```nginx
# 上游后端服务
upstream backend {
    server localhost:3000;
    keepalive 32;
}

# HTTP 服务器（重定向到 HTTPS）
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # 重定向到 HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 日志
    access_log /opt/tianxuan/logs/nginx-access.log;
    error_log /opt/tianxuan/logs/nginx-error.log;
    
    # 静态文件（前端）
    root /opt/tianxuan/frontend/dist;
    index index.html;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
    
    # 前端路由（Vue Router History 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Supabase API 代理（如果需要）
    location /api/supabase/ {
        proxy_pass https://vdxxpsjdiswztipauhwb.supabase.co/;
        proxy_http_version 1.1;
        proxy_set_header Host vdxxpsjdiswztipauhwb.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

#### 4.4 启用 Nginx 配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/tianxuan /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 4.5 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install -y certbot python3-certbot-nginx  # CentOS/RHEL

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo certbot renew --dry-run
```

---

### 第五阶段：从 Supabase 迁移到自建后端

#### 5.1 迁移策略

当前项目使用 Supabase 作为 BaaS，需要逐步迁移到自建后端：

**阶段1：数据库迁移** ✅（已完成）
- ✅ 使用 DBeaver 执行 SQL 脚本创建表结构
- ✅ 数据迁移（如果有现有数据）
- ✅ 所有表、函数、触发器已成功导入

**阶段2：认证系统迁移** ✅（已完成）
- ✅ 实现用户注册/登录 API
- ✅ 实现 JWT Token 生成和验证
- ✅ 实现密码加密和验证（兼容 Supabase bcrypt 格式）
- ✅ 创建认证中间件

**阶段3：业务逻辑迁移** 🚧（进行中）
- ✅ 迁移用户相关 API（profiles、tier等）- 已完成
- ✅ 迁移天机币系统 API（deduct_coins、admin_adjust_coins等）- 已完成
- ✅ 迁移签到系统 API（handle_daily_check_in、grant_checkin_reward等）- 已完成
- ✅ 迁移支付相关 API（创建订单、支付回调、订单查询、Mock 支付等）- 已完成
  - ✅ 创建支付订单 API（`POST /api/payment/orders`）
  - ✅ Mock 支付成功 API（`POST /api/payment/mock/success`，仅开发环境）
  - ✅ 查询订单列表 API（`GET /api/payment/orders`）
  - ✅ 查询订单详情 API（`GET /api/payment/orders/:orderId`）
  - ✅ 支付成功核心逻辑（事务保护、幂等性检查）
  - ✅ 修复数据库约束问题（item_type 字段使用 'coin_pack'）
- ✅ 迁移紫微斗数相关 API（star_charts、unlocked_time_assets等）- 已完成
  - ✅ 命盘存档 API（`POST /api/astrology/star-chart`, `GET /api/astrology/star-chart`）
  - ✅ 更新简要分析缓存 API（`PUT /api/astrology/star-chart/brief-analysis`）
  - ✅ 解锁时空资产 API（`POST /api/astrology/time-assets/unlock`）
  - ✅ 查询已解锁的时空资产 API（`GET /api/astrology/time-assets`）
  - ✅ 检查时间段是否已解锁 API（`GET /api/astrology/time-assets/check`）
  - ✅ 保存/更新缓存 API（`POST /api/astrology/cache`）
  - ✅ 查询缓存 API（`GET /api/astrology/cache`）

**阶段4：前端适配** ⏳（待开始）
- ⏳ 修改前端 API 调用地址
- ⏳ 适配认证流程
- ⏳ 测试所有功能

---

## 🎯 下一步开发计划（优先级排序）

### P0 优先级：认证系统（必须完成）

**目标**：实现完整的用户认证系统，支持用户注册、登录、JWT Token 验证

**任务清单**：

1. **项目初始化**（预计 30 分钟）✅ **已完成**
   - [x] 创建 `/opt/tianxuan/backend` 目录结构
   - [x] 初始化 `package.json` 和 `tsconfig.json`
   - [x] 安装所有依赖包
   - [x] 创建 `.env` 环境变量文件

2. **基础配置**（预计 1 小时）✅ **已完成**
   - [x] 创建 `src/config/database.ts`（数据库连接池）
   - [x] 创建 `src/config/env.ts`（环境变量验证）
   - [x] 创建 `src/app.ts`（Express 应用入口）
   - [x] 测试数据库连接和健康检查接口（✅ 数据库心跳正常，延迟 34ms）

3. **认证系统核心功能**（预计 2-3 小时）✅ **已完成**
   - [x] 创建 `src/utils/password.ts`（密码加密/验证工具）
   - [x] 创建 `src/services/auth.service.ts`（认证服务）
     - [x] 实现 `register()` 方法（用户注册，事务处理）
     - [x] 实现 `login()` 方法（用户登录）
     - [x] 实现 `verifyToken()` 方法（JWT 验证）
   - [x] 创建 `src/middleware/auth.middleware.ts`（认证中间件）
   - [x] 创建 `src/routes/auth.routes.ts`（认证路由）
   - [x] 创建 `src/controllers/auth.controller.ts`（认证控制器）

4. **测试验证**（预计 1 小时）✅ **已完成**
   - [x] 测试用户注册流程（包含事务回滚测试）
   - [x] 测试用户登录流程
   - [x] 测试 JWT Token 生成和验证
   - [x] 测试认证中间件
   - [x] 测试密码加密兼容性（与 Supabase 格式兼容）
   - [x] **测试结果**: 9/9 测试用例通过（100%），所有验收标准满足

**验收标准**：
- ✅ 用户可以通过 API 注册新账号
- ✅ 用户可以通过 API 登录并获取 JWT Token
- ✅ JWT Token 可以正确验证
- ✅ 密码加密格式与 Supabase 兼容（$2a$ 或 $2b$ 开头）
- ✅ 注册时在一个事务中同时创建 `auth.users` 和 `profiles` 记录

**实际完成时间**：4-5 小时 ✅

---

### P1 优先级：用户资料 API（认证系统完成后）✅ **已完成**

**目标**：实现用户资料查询和更新 API

**任务清单**：

1. **用户资料服务**（预计 1-2 小时）✅ **已完成**
   - [x] 创建 `src/services/user.service.ts`
   - [x] 实现 `getProfile(userId)` - 获取用户资料
   - [x] 实现 `updateProfile(userId, data)` - 更新用户资料
   - [x] 实现 `getUserTier(userId)` - 获取用户等级

2. **用户资料路由和控制器**（预计 1 小时）✅ **已完成**
   - [x] 创建 `src/routes/user.routes.ts`
   - [x] 创建 `src/controllers/user.controller.ts`
   - [x] 集成认证中间件

3. **测试验证**（预计 30 分钟）✅ **已完成**
   - [x] 测试获取用户资料
   - [x] 测试更新用户资料
   - [x] 测试权限验证（只能修改自己的资料）
   - [x] 创建测试文档（`TEST_USER_API.md`）
   - [x] **测试结果**: 6/6 测试用例通过（100%），所有验收标准满足

**实际完成时间**：2.5-3.5 小时 ✅

---

### P2 优先级：天机币系统 API ✅ **已完成**

**目标**：实现天机币相关的 API（扣费、充值、查询余额等）

**任务清单**：

1. **天机币服务**（预计 2-3 小时）✅ **已完成**
   - [x] 创建 `src/services/coins.service.ts`
   - [x] 实现 `deductCoins()` - 扣费（调用 `deduct_coins` 函数）
   - [x] 实现 `getBalance()` - 查询余额
   - [x] 实现 `adminAdjustCoins()` - 管理员调整（调用 `admin_adjust_coins` 函数）
   - [x] 实现 `getCoinTransactions()` - 查询天机币流水
   - [x] 实现 `isAdmin()` - 检查管理员权限

2. **天机币路由和控制器**（预计 1 小时）✅ **已完成**
   - [x] 创建 `src/routes/coins.routes.ts`
   - [x] 创建 `src/controllers/coins.controller.ts`
   - [x] 创建 `src/middleware/admin.middleware.ts`（管理员权限检查）
   - [x] 集成认证中间件和权限检查
   - [x] 在 `src/app.ts` 中注册路由

3. **测试验证**（预计 1 小时）✅ **已完成**
   - [x] 测试扣费功能（成功）
   - [x] 测试余额查询（成功）
   - [x] 测试余额不足错误处理（成功）
   - [x] 测试参数验证（成功）
   - [x] 测试查询交易流水（成功，已修复列名问题）
   - [x] 测试未认证请求（成功）
   - [x] 创建测试文档（`TEST_COINS.md`）
   - [x] 创建测试结果报告（`TEST_COINS_RESULT.md`）
   - [x] **测试结果**: 7/7 测试用例通过（100%），所有核心功能正常

**实际完成时间**：4-5 小时 ✅

---

### P3 优先级：其他业务 API（按需开发）

**目标**：根据前端需求逐步迁移其他业务功能

**任务清单**：

1. **支付系统 API**（预计 3-4 小时）✅ **已完成**
   - ✅ 创建支付订单
   - ✅ 支付回调处理（Mock 支付系统）
   - ✅ 订单查询
   - ✅ 支付服务模块（`src/services/payment.service.ts`）
   - ✅ 支付路由和控制器（`src/routes/payment.routes.ts`, `src/controllers/payment.controller.ts`）
   - ✅ Mock 支付路由（`POST /api/payment/mock/success`，仅开发环境）
   - ✅ 路由注册（已在 `src/app.ts` 中注册）
   - ✅ 测试文档（`TEST_PAYMENT.md`）
   - ✅ 测试验证（8/8 测试用例通过，100%）
   - ✅ 测试结果报告（`TEST_PAYMENT_RESULT.md`）
   - ✅ **测试结果**: 8/8 测试用例通过（100%），所有核心功能正常
   - ✅ **修复问题**: 数据库约束错误（item_type 字段），已修复为使用 'coin_pack'

2. **紫微斗数 API**（预计 4-5 小时）✅ **已完成**
   - ✅ 命盘存档（保存/更新命盘结构、查询命盘结构、更新简要分析缓存）
   - ✅ 时空资产解锁（解锁资产、查询已解锁资产、检查是否已解锁）
   - ✅ 缓存查询（保存/更新缓存、查询缓存）
   - ✅ 紫微斗数服务模块（`src/services/astrology.service.ts`）
   - ✅ 紫微斗数路由和控制器（`src/routes/astrology.routes.ts`, `src/controllers/astrology.controller.ts`）
   - ✅ 路由注册（已在 `src/app.ts` 中注册）
   - ✅ 测试文档（`TEST_ASTROLOGY.md`）
   - ✅ 测试验证（12/12 测试用例通过，100%）
   - ✅ 测试结果报告（`TEST_ASTROLOGY_RESULT.md`）
   - ✅ **修复问题**: 外键约束错误（`star_charts` 表外键指向错误），已修复为指向 `profiles` 表
   - ✅ **修复问题**: 缓存过期时间问题（测试脚本过期时间设置），已修复为使用动态未来时间
   - ✅ **测试结果**: 12/12 测试用例通过（100%），所有核心功能正常

3. **其他功能 API**（按需）🚧 **进行中**
   - ✅ 签到系统 API 开发（已完成）
     - ✅ 签到服务模块（`src/services/checkin.service.ts`）
     - ✅ 签到路由和控制器（`src/routes/checkin.routes.ts`, `src/controllers/checkin.controller.ts`）
     - ✅ 路由注册（已在 `src/app.ts` 中注册）
     - ✅ 测试验证（7/7 测试用例通过，100%）
     - ✅ 测试结果报告（`TEST_CHECKIN_RESULT.md`）
     - ✅ **测试结果**: 7/7 测试用例通过（100%），所有核心功能正常
   - [ ] 订阅管理
   - [ ] 管理员后台 API

---

## 📝 开发注意事项

### 1. 数据库函数调用

- ✅ **优先使用显式参数**：如果已执行 `migration-refactor-auth-uid-to-explicit-params.sql`，使用显式参数调用函数
- ⚠️ **会话变量方式**：如果未执行重构脚本，可以使用会话变量方式（不推荐）

### 2. 事务处理

- ✅ **用户注册**：必须在事务中同时创建 `auth.users` 和 `profiles`
- ✅ **支付处理**：必须在事务中处理订单和余额更新
- ✅ **扣费操作**：使用数据库函数 `deduct_coins`，已包含事务和锁机制

### 3. 错误处理

- ✅ 使用 PostgreSQL 错误码进行错误分类
- ✅ 返回友好的错误消息
- ✅ 记录错误日志

### 4. 安全性

- ✅ 所有 API 使用 JWT Token 认证
- ✅ 使用参数化查询防止 SQL 注入
- ✅ 密码使用 bcrypt 加密（兼容 Supabase 格式）
- ✅ 使用 Helmet 设置安全头
- ✅ 使用限流中间件防止暴力攻击

---

#### 5.2 认证系统实现示例

**`/opt/tianxuan/backend/src/services/auth.service.ts`**:

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export class AuthService {
  // 用户注册（在一个事务中创建 auth.users 和 profiles）
  static async register(email: string, password: string, username?: string) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查用户是否已存在
      const existingUser = await client.query(
        'SELECT id FROM auth.users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('用户已存在');
      }
      
      // 加密密码（兼容 Supabase bcrypt 格式：$2a$ 或 $2b$ 开头）
      const passwordHash = await bcrypt.hash(password, 10);
      
      // 生成用户ID
      const userId = uuidv4();
      
      // 创建 auth.users 记录
      await client.query(
        `INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [
          userId,
          email,
          passwordHash,
          JSON.stringify({
            username: username || email.split('@')[0],
          }),
        ]
      );
      
      // 创建 profiles 记录（在一个事务中）
      await client.query(
        `INSERT INTO public.profiles (id, email, role, username, preferences, registration_bonus_granted, last_check_in_date, consecutive_check_in_days)
         VALUES ($1, $2, 'user', $3, $4, FALSE, NULL, 0)
         ON CONFLICT (id) DO NOTHING`,
        [
          userId,
          email,
          username || email.split('@')[0],
          JSON.stringify({
            theme: 'default',
            language: 'zh-CN',
            notifications: true,
          }),
        ]
      );
      
      // 发放注册奖励（如果需要）
      await client.query(
        'SELECT grant_registration_bonus($1, $2)',
        [userId, 20] // 20 个天机币
      );
      
      await client.query('COMMIT');
      
      return { userId, email };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // 用户登录
  static async login(email: string, password: string) {
    // 查询用户
    const result = await pool.query(
      'SELECT id, email, encrypted_password FROM auth.users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    const user = result.rows[0];
    
    // 验证密码（兼容 Supabase bcrypt 格式）
    const isValid = await bcrypt.compare(password, user.encrypted_password);
    if (!isValid) {
      throw new Error('密码错误');
    }
    
    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    return { user: { id: user.id, email: user.email }, token };
  }
  
  // 验证 Token
  static async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      return decoded;
    } catch (error) {
      throw new Error('Token 无效');
    }
  }
}
```

#### 5.3 数据库函数调用示例（auth.uid() 处理）

**⚠️ 重要：关于 auth.uid() 的处理方式**

有两种方式处理 `auth.uid()` 函数：

**方案1：使用显式参数（推荐）⭐**

如果已执行 `migration-refactor-auth-uid-to-explicit-params.sql`，函数已改为显式参数：

```typescript
// src/services/coins.service.ts
import { pool } from '../config/database.js';

// 扣费函数（已使用显式参数，无需设置会话变量）
export async function deductCoins(
  userId: string,
  featureType: string,
  price: number
): Promise<any> {
  const result = await pool.query(
    'SELECT deduct_coins($1, $2, $3) as result',
    [userId, featureType, price]
  );
  
  const data = result.rows[0].result;
  
  if (!data.success) {
    throw new Error(data.error || '扣费失败');
  }
  
  return data;
}

// 管理员调整天机币（使用显式参数）
export async function adminAdjustCoins(
  operatorId: string,
  targetUserId: string,
  adjustmentAmount: number,
  reason: string = '管理员调整',
  coinType: 'tianji_coins_balance' | 'daily_coins_grant' | 'activity_coins_grant' = 'tianji_coins_balance'
): Promise<any> {
  // 先检查操作人是否为管理员
  const isAdminResult = await pool.query(
    'SELECT is_admin($1) as is_admin',
    [operatorId]
  );
  
  if (!isAdminResult.rows[0].is_admin) {
    throw new Error('只有管理员可以执行此操作');
  }
  
  // 执行调整
  const result = await pool.query(
    'SELECT admin_adjust_coins($1, $2, $3, $4, $5) as result',
    [operatorId, targetUserId, adjustmentAmount, reason, coinType]
  );
  
  return result.rows[0].result;
}
```

**方案2：使用会话变量（如果未执行重构脚本）**

如果未执行重构脚本，仍可使用 `auth.uid()`，但需要在调用前设置会话变量：

```typescript
// src/utils/database-session.ts
import { pool } from '../config/database.js';

/**
 * 在事务中设置当前用户ID（用于 auth.uid() 函数）
 * 
 * ⚠️ 注意：此方法仅适用于仍使用 auth.uid() 的函数
 * 推荐使用显式参数传递的方式（方案1）
 */
export async function withUserContext<T>(
  userId: string,
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 设置会话变量（auth.uid() 函数会读取此变量）
    await client.query(
      "SET LOCAL app.current_user_id = $1",
      [userId]
    );
    
    // 执行回调函数
    const result = await callback(client);
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 使用示例（不推荐，仅作参考）
async function deductCoinsWithSession(
  userId: string,
  featureType: string,
  price: number
): Promise<any> {
  return await withUserContext(userId, async (client) => {
    const result = await client.query(
      'SELECT deduct_coins($1, $2, $3) as result',
      [userId, featureType, price]
    );
    return result.rows[0].result;
  });
}
```

**推荐使用方案1**，因为：
- ✅ 函数变成纯粹的数学函数，不依赖会话状态
- ✅ 测试和调试简单 10 倍
- ✅ 函数签名清晰，参数明确
- ✅ 便于单元测试

#### 5.4 创建认证中间件

**`/opt/tianxuan/backend/src/middleware/auth.middleware.ts`**:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  
  try {
    const decoded = await AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: '认证令牌无效' });
  }
}
```

---

## 🔧 资源优化和监控

### 6.1 系统资源监控

**安装监控工具**:

```bash
# 安装 htop（已安装）
# 安装 netdata（轻量级监控）
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# 访问监控面板: http://your-server:19999
```

### 6.2 PostgreSQL 性能优化

**定期维护**:

```bash
# 每天执行 VACUUM（在低峰期）
docker exec tianxuan-postgres psql -U tianxuan -d tianxuan -c "VACUUM ANALYZE;"

# 每周执行 REINDEX（在低峰期）
docker exec tianxuan-postgres psql -U tianxuan -d tianxuan -c "REINDEX DATABASE tianxuan;"
```

**创建维护脚本** `/opt/tianxuan/scripts/maintain-db.sh`:

```bash
#!/bin/bash
# 数据库维护脚本

docker exec tianxuan-postgres psql -U tianxuan -d tianxuan <<EOF
VACUUM ANALYZE;
SELECT pg_size_pretty(pg_database_size('tianxuan')) AS database_size;
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';
EOF
```

```bash
chmod +x /opt/tianxuan/scripts/maintain-db.sh

# 添加到 crontab（每天凌晨3点执行）
crontab -e
# 添加: 0 3 * * * /opt/tianxuan/scripts/maintain-db.sh >> /opt/tianxuan/logs/db-maintain.log 2>&1
```

### 6.3 Node.js 内存优化

**监控内存使用**:

```bash
# PM2 监控
pm2 monit

# 查看内存使用
pm2 list
```

**如果内存不足，考虑**:
- 减少 PostgreSQL 的 `max_connections`
- 减少 Node.js 连接池大小
- 启用 Node.js 的 `--max-old-space-size=1024` 限制

### 6.4 日志管理

**配置日志轮转**:

```bash
# 安装 logrotate
sudo apt install -y logrotate  # Ubuntu/Debian

# 创建日志轮转配置
sudo tee /etc/logrotate.d/tianxuan << 'EOF'
/opt/tianxuan/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF
```

---

## 📦 备份策略

### 7.1 数据库备份

**创建备份脚本** `/opt/tianxuan/scripts/backup-db.sh`:

```bash
#!/bin/bash
# 数据库备份脚本

BACKUP_DIR="/opt/tianxuan/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tianxuan_$DATE.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
docker exec tianxuan-postgres pg_dump -U tianxuan tianxuan > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_FILE.gz"
```

```bash
chmod +x /opt/tianxuan/scripts/backup-db.sh

# 添加到 crontab（每天凌晨2点备份）
crontab -e
# 添加: 0 2 * * * /opt/tianxuan/scripts/backup-db.sh >> /opt/tianxuan/logs/backup.log 2>&1
```

### 7.2 代码备份

```bash
# 使用 Git 版本控制
cd /opt/tianxuan
git init
git remote add origin your-repo-url
git add .
git commit -m "Initial deployment"
git push -u origin main
```

---

## 🚨 故障排查

### 8.1 常见问题

**问题1: PostgreSQL 连接失败**

```bash
# 检查容器状态
docker ps | grep postgres

# 检查日志
docker logs tianxuan-postgres

# 检查端口占用
netstat -tlnp | grep 5432

# 测试连接
docker exec -it tianxuan-postgres psql -U tianxuan -d tianxuan
```

**问题2: Node.js 服务无法启动**

```bash
# 检查日志
pm2 logs tianxuan-backend

# 检查端口占用
netstat -tlnp | grep 3000

# 检查环境变量
cd /opt/tianxuan/backend
cat .env
```

**问题3: Nginx 502 Bad Gateway**

```bash
# 检查后端服务
curl http://localhost:3000/health

# 检查 Nginx 错误日志
sudo tail -f /opt/tianxuan/logs/nginx-error.log

# 检查 Nginx 配置
sudo nginx -t
```

**问题4: 内存不足**

```bash
# 检查内存使用
free -h
htop

# 检查各服务内存占用
docker stats tianxuan-postgres
pm2 monit

# 如果内存不足，考虑：
# 1. 减少 PostgreSQL max_connections
# 2. 减少 Node.js 连接池大小
# 3. 启用 swap（不推荐，影响性能）
```

### 8.2 性能调优检查清单

- [ ] PostgreSQL `shared_buffers` 设置为内存的 25%
- [ ] PostgreSQL `max_connections` 不超过 50
- [ ] Node.js 连接池大小不超过 20
- [ ] 启用 Nginx Gzip 压缩
- [ ] 配置静态资源缓存
- [ ] 启用 PM2 集群模式（如果CPU充足）
- [ ] 定期执行数据库 VACUUM
- [ ] 监控慢查询日志

---

## 📋 部署检查清单

### 部署前检查

- [ ] 服务器系统更新完成
- [ ] Docker 和 Docker Compose 已安装
- [ ] Node.js 18+ 已安装
- [ ] Nginx 已安装
- [ ] 防火墙规则已配置（开放 80、443、22 端口）

### 数据库部署检查

- [ ] PostgreSQL 容器运行正常
- [ ] 数据库连接测试通过
- [ ] SQL 脚本执行成功
- [ ] 表结构创建正确
- [ ] 数据库备份脚本已配置

### 后端服务检查

- [ ] Node.js 项目依赖安装完成
- [ ] 环境变量配置正确
- [ ] 数据库连接测试通过
- [ ] API 健康检查通过 (`/health`)
- [ ] PM2 进程管理配置完成
- [ ] 日志文件正常写入

### 前端部署检查

- [ ] 前端构建成功
- [ ] 静态文件已上传到服务器
- [ ] Nginx 配置正确
- [ ] SSL 证书已配置
- [ ] 前端路由正常（History 模式）
- [ ] API 代理正常

### 安全检查

- [ ] 数据库密码强度足够
- [ ] JWT Secret 已配置
- [ ] `.env` 文件权限正确（600）
- [ ] SSH 密钥认证已配置
- [ ] 防火墙规则已限制
- [ ] SSL 证书有效

---

## 🔄 后续优化方向

### 短期优化（1-3个月）

1. **实现完整的认证系统**
   - 用户注册/登录
   - 密码重置
   - 邮箱验证

2. **迁移核心业务 API**
   - 用户资料管理
   - 支付系统
   - 紫微斗数功能

3. **性能优化**
   - 数据库索引优化
   - API 响应缓存
   - 静态资源 CDN

### 中期优化（3-6个月）

1. **监控和告警**
   - 集成监控系统（Prometheus + Grafana）
   - 设置告警规则
   - 性能指标追踪

2. **高可用性**
   - 数据库主从复制
   - 应用负载均衡（如果升级服务器）
   - 自动故障转移

3. **扩展性**
   - 读写分离
   - 缓存层（Redis）
   - 消息队列（RabbitMQ）

### 长期规划（6个月+）

1. **微服务架构**
   - 服务拆分
   - API 网关
   - 服务发现

2. **容器编排**
   - Kubernetes 集群
   - 自动扩缩容
   - 滚动更新

---

## 📚 参考资源

### 官方文档

- [PostgreSQL 17 文档](https://www.postgresql.org/docs/17/)
- [Node.js 文档](https://nodejs.org/docs/)
- [Express.js 文档](https://expressjs.com/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [PM2 文档](https://pm2.keymetrics.io/docs/)

### 相关文档

- [Supabase 迁移指南](./SUPABASE_MIGRATION_GUIDE.md)（待创建）
- [API 接口文档](./API_DOCUMENTATION.md)（待创建）
- [数据库设计文档](./DATABASE_DESIGN.md)（待创建）

---

## 📝 更新日志

- **2025-01-08（凌晨）**: 
  - ✅ 天机币系统 API 测试完成，7/7 测试用例通过（100%）
  - ✅ 修复查询交易流水功能（数据库列名问题）
  - ✅ 创建测试结果报告（`TEST_COINS_RESULT.md`）
  - ✅ 更新部署进度：P0、P1、P2 优先级任务全部完成
  - ⏳ 下一步：开始开发 P3 优先级业务 API（支付系统、紫微斗数等）

- **2025-01-08（凌晨）**: 
  - ✅ 签到系统 API 开发完成，7/7 测试用例通过（100%）
  - ✅ 修复签到功能（数据库函数参数问题）
  - ✅ 优化重复签到错误提示
  - ✅ 创建测试结果报告（`TEST_CHECKIN_RESULT.md`）
  - ✅ 更新部署进度：签到系统 API 已完成

- **2025-01-08（凌晨）**: 
  - ✅ 支付系统 API 开发完成，8/8 测试用例通过（100%）
  - ✅ 修复数据库约束错误（item_type 字段，使用 'coin_pack'）
  - ✅ 实现 Mock 支付系统（`POST /api/payment/mock/success`，仅开发环境）
  - ✅ 实现支付成功核心逻辑（事务保护、幂等性检查）
  - ✅ 创建测试结果报告（`TEST_PAYMENT_RESULT.md`）
  - ✅ 更新部署进度：支付系统 API 已完成
  - 📊 **总体进度**：已完成 5 个核心 API 模块，共 37 个测试用例，100% 通过率

- **2025-01-30（晚上）**: 
  - ✅ 紫微斗数 API 开发完成
  - ✅ 实现命盘存档功能（保存/更新命盘结构、查询命盘结构、更新简要分析缓存）
  - ✅ 实现时空资产解锁功能（解锁资产、查询已解锁资产、检查是否已解锁）
  - ✅ 实现缓存查询功能（保存/更新缓存、查询缓存）
  - ✅ 创建紫微斗数服务模块（`src/services/astrology.service.ts`）
  - ✅ 创建紫微斗数路由和控制器（`src/routes/astrology.routes.ts`, `src/controllers/astrology.controller.ts`）
  - ✅ 路由注册（已在 `src/app.ts` 中注册）
  - ✅ 创建测试文档（`TEST_ASTROLOGY.md`）
  - ✅ 更新部署进度：紫微斗数 API 已完成
  - 📊 **总体进度**：已完成 6 个核心 API 模块
  - ⏳ **下一步**：测试紫微斗数 API，继续开发其他业务 API

- **2025-01-30（晚上）**: 
  - ✅ 更新部署进度：第三阶段项目初始化和基础配置已完成
  - ✅ Node.js 后端服务已启动，运行在端口 3000
  - ✅ 数据库连接测试通过，心跳延迟 34ms
  - ✅ 下一步：开始开发认证系统核心功能

- **2025-01-30（下午）**: 
  - ✅ 更新部署进度：第一阶段和第二阶段已完成
  - ✅ 添加下一步开发计划（P0-P3 优先级）
  - ✅ 添加认证系统详细任务清单
  - ✅ 添加开发注意事项和最佳实践

- **2025-01-30（上午）**: 
  - ✅ 创建初始版本，包含完整的 All-in-One 部署方案
  - ✅ 添加 Node.js 后端实施指南
  - ✅ 添加 auth.uid() 重构说明

---

**最后更新**: 2025年1月30日（晚上）  
**当前进度**: 
- ✅ **认证系统**：开发完成，所有测试通过（9/9，100%）
- ✅ **用户资料 API**：开发完成，所有测试通过（6/6，100%）
- ✅ **天机币系统 API**：开发完成，所有测试通过（7/7，100%）
- ✅ **签到系统 API**：开发完成，所有测试通过（7/7，100%）
- ✅ **支付系统 API**：开发完成，所有测试通过（8/8，100%）
- ✅ 服务器运行在端口 3000，数据库连接正常
- ✅ 用户注册、登录、JWT Token 验证功能正常
- ✅ 用户资料查询、更新功能正常
- ✅ 天机币扣费、查询余额、查询流水功能正常
- ✅ 每日签到、查询状态、查询记录功能正常
- ✅ 支付订单创建、Mock 支付成功、订单查询功能正常
- ✅ 参数验证、错误处理、认证保护功能正常
- ✅ 命盘存档、查询命盘结构、更新简要分析缓存功能正常
- ✅ 解锁时空资产、查询已解锁资产、检查是否已解锁功能正常
- ✅ 保存/更新缓存、查询缓存功能正常
- ✅ **修复问题**: 外键约束错误（`star_charts` 表外键指向错误），已修复
- ✅ **修复问题**: 缓存过期时间问题（测试脚本），已修复
- 📊 **总体进度**：已完成 6 个核心 API 模块，共 49 个测试用例，100% 通过率
- ⏳ **下一步**：继续开发其他业务 API（订阅管理、管理员后台等）

### 🎯 关键成就

- ✅ **100% 测试通过率**：所有已开发的 API 模块测试通过率均为 100%
- ✅ **完整的支付流程**：从创建订单到 Mock 支付成功的完整流程已实现
- ✅ **数据库约束修复**：成功修复 item_type 字段约束问题，使用 'coin_pack' 作为合法值
- ✅ **Mock 支付系统**：实现了开发环境专用的 Mock 支付功能，支持完整测试流程
- ✅ **幂等性保护**：支付回调支持幂等性检查，防止重复处理
- ✅ **事务保护**：支付成功逻辑使用数据库事务，确保数据一致性

**维护者**: 开发团队
