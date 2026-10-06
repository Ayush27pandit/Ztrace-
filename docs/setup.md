# Setup

## Prerequisites

- Node.js 22 (see `engines.node` in `package.json`)
- Docker (with Docker Compose) for local Postgres and Redis

## Local services

```bash
docker compose up -d
```

Starts `postgres:16` on `localhost:5432` and `redis:7` on `localhost:6379` (see `docker-compose.yml`).

## Install

```bash
npm install
```

## Environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `REDIS_URL`. For local development point them at the Docker services:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ztrace
REDIS_URL=redis://localhost:6379
```

Tests do not use `.env` directly — `tests/setup.ts` forces local Postgres/Redis.

## Database

```bash
npx prisma migrate dev
```

## Run

```bash
npm run dev:api
npm run dev:worker
```

## Test

```bash
npm test
npx tsc --noEmit
```
