# Ztrace

Durable RCA agent: Jira webhook intake, BullMQ/Redis queue, worker orchestration, reports persisted to PostgreSQL.

## Layout

- `apps/api` — Fastify HTTP API
- `apps/worker` — BullMQ worker
- `src/` — shared core (config, integrations, investigation)
- `tests/` — vitest tests

## Develop

```bash
npm install
npm run dev:api
npm run dev:worker
```

## Verify

```bash
npm run lint   # tsc --noEmit
npm test
```
