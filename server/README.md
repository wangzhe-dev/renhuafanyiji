# shaobuqi-server

Express + MySQL 后端服务（对应烧不起前端 MVP）。

## 1. 启动

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

阿里云环境建议：

```bash
cd server
cp .env.aliyun.example .env
# 然后把 .env 里的 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME 改成你的阿里云 RDS 信息
npm install
npm run dev
```

## 2. 环境变量

`.env` 关键字段：

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_PUBLIC_BASE_URL`

## 3. 开发账号

```bash
mysql -u<user> -p <db_name> < server/sql/seed_dev.sql
```

如果你使用 phpMyAdmin（阿里云常见方式）：

1. 先在 phpMyAdmin 选择你的数据库（例如 `shaobuqi`）。
2. 导入 `server/sql/schema.sql`。
3. 再导入 `server/sql/seed_dev.sql`。
4. 确认 `users`、`skills`、`skill_contents` 等表已创建，并且有开发账号数据。

老库增量升级（不重建库）：

```bash
mysql -u<user> -p <db_name> < server/sql/migrate_20260321_ai_models.sql
```

phpMyAdmin 可直接导入 `server/sql/migrate_20260321_ai_models.sql`，会按真实表名 `skill_usage_records` 自动补齐模型相关结构与数据。

默认账号：

- mobile: `13800000000`
- password: `12345678`

## 4. API 基础路径

- `/h5api`
- `/api`

统一响应：

```json
{ "code": 200, "msg": "ok", "data": {} }
```

## 5. 核心接口（已实现）

### Auth

- `POST /h5api/auth/login/password`

### Skill

- `GET /h5api/skills`
- `GET /h5api/skills/:id`
- `POST /h5api/skills`
- `PUT /h5api/skills/:id`
- `POST /h5api/skills/:id/favorite`
- `DELETE /h5api/skills/:id/favorite`
- `POST /h5api/skills/:id/copies`
- `POST /h5api/skills/:id/feedbacks`
- `GET /h5api/skills/:id/feedbacks`
- `GET /h5api/skills/meta/categories`
- `GET /h5api/skills/meta/tags`

### Me

- `GET /h5api/me/profile`
- `PUT /h5api/me/avatar`
- `GET /h5api/me/skills`
- `GET /h5api/me/favorites`
- `GET /h5api/me/copies`

### Draft

- `GET /h5api/drafts`
- `GET /h5api/drafts/:id`
- `POST /h5api/drafts/save`
- `DELETE /h5api/drafts/:id`

### Stats

- `GET /h5api/stats/trends`

### Feed

- `GET /h5api/feed`
- `POST /h5api/feed`
- `PUT /h5api/feed/:id/images`
- `GET /h5api/feed/:id`
- `POST /h5api/feed/:id/like`
- `DELETE /h5api/feed/:id/like`
- `POST /h5api/feed/:id/meoo`
- `DELETE /h5api/feed/:id/meoo`
- `PUT /h5api/feed/:id/reaction`
- `GET /h5api/feed/:id/comments`
- `POST /h5api/feed/:id/comments`
- `POST /h5api/feed/comments/:id/like`
- `DELETE /h5api/feed/comments/:id/like`

### Models

- `GET /h5api/models`
- `GET /h5api/models/recent`

### Upload

- `POST /h5api/uploads/image` (multipart/form-data, `file` + `usage`)

## 6. 健康检查

- `GET /healthz`

## 7. 生产部署（阿里云 ECS 推荐）

结论先说：

- 后端 `server` 需要单独打包（TypeScript -> `dist/*.js`）。
- 后端部署在可运行 Node.js 的云服务器（建议阿里云 ECS / 轻量应用服务器）。
- 前端 H5 是静态资源，部署在 Nginx（同一台 ECS 即可），再由 Nginx 反代 `/h5api` 到后端。

### 7.1 服务器准备

建议拓扑：

- ECS：运行 `shaobuqi-server`（Node + PM2）和 Nginx
- RDS：MySQL
- MinIO：对象存储（可同机，也可独立）

ECS 上安装：

- Node.js 18+
- npm
- nginx
- pm2（可选，全局安装：`npm i -g pm2`）

### 7.2 后端部署命令（在 ECS 执行）

```bash
cd /your/path/shaobuqi/server
cp .env.aliyun.example .env
# 修改 .env：DB、JWT、MINIO、CORS_ORIGIN
npm run deploy:prod
```

`deploy:prod` 会执行：

1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
4. `npm prune --omit=dev`
5. PM2 `startOrReload`

### 7.3 前端 H5 构建与发布

在项目根目录构建 H5：

```bash
cd /your/path/shaobuqi
npm run build:h5
```

把 `dist/build/h5` 上传到 ECS，例如 `/var/www/shaobuqi-h5`。

### 7.4 Nginx 配置

模板文件：`server/deploy/nginx.shaobuqi.conf`

要点：

- `root` 指向前端目录（`/var/www/shaobuqi-h5`）
- `/h5api`、`/api`、`/healthz` 反代到 `127.0.0.1:3000`

配置后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7.5 进程管理与排查

```bash
pm2 status
pm2 logs shaobuqi-server
curl http://127.0.0.1:3000/healthz
```
