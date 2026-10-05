# Ztrace

Durable RCA agent: Jira webhook intake, BullMQ/Redis queue, worker orchestration, reports persisted to PostgreSQL.

Status: Milestone 0+1 scaffold. Shadow mode and Jira publication disabled by default.

## Layout

- `apps/api` — Fastify HTTP API
- `apps/worker` — BullMQ worker
- `src/` — shared core (config, integrations, investigation, persistence, queues)
- `tests/` — vitest tests
- `prisma/` — schema and migrations
- `docs/` — spec and architecture docs

## Prerequisites

- Node.js >= 22
- Docker (for local Postgres/Redis) or hosted equivalents

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and REDIS_URL
docker compose up -d postgres redis
npx prisma migrate dev
```

## Develop

```bash
npm run dev:api
npm run dev:worker
```

## Verify

```bash
npm run lint   # tsc --noEmit
npm test
```

## Configuration

See `.env.example`. Safe defaults: `RCA_MODE=shadow`, `RCA_PUBLISH_TO_JIRA=false`. Never commit real credentials.
