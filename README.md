# OperaDesk

Sistema de chamados em Next.js (App Router) com frontend e API na mesma aplicação. PostgreSQL via Docker, autenticação JWT em cookie `httpOnly` e controle de papéis (admin, técnico, usuário comum).

## Stack

- Next.js 16 (App Router, Route Handlers, `proxy.js` no boundary de rede)
- React 19, React Query 5, Joi 17, bcrypt 6
- PostgreSQL 16 (via Docker), `node-pg-migrate` para migrações
- Vitest + Supertest para testes
- ESLint flat config, Prettier, Husky + lint-staged

## Estrutura

```
app/                    Rotas Next (UI + API)
  api/                  Route handlers (REST)
src/
  components/           UI compartilhada
  contextos/            React contexts (auth, chamados, theme, toast, confirm)
  hooks/                React Query hooks, focus trap, animated number
  services/             HTTP client baseado em fetch + clients de API
  views/                Telas (Inicio, Chamados, Usuarios, Login...)
  server/               Camada de servidor reutilizada pelas rotas
    config/             env, database
    http/               response, auth, cookies, request (módulos coesos)
    auth/policies.js    Regras de autorização centralizadas
    services/           Regras de negócio
    repositories/       Acesso a dados (pg)
    utils/              logger, AppError, rateLimit
    validators/         Schemas Joi
db/
  migrations/           node-pg-migrate (fonte da verdade)
  schema.sql            Snapshot de referência humana
tests/                  Vitest
```

## Setup local

1. Copie `.env.example` para `.env` e preencha `JWT_SECRET` (use `openssl rand -base64 48`).
2. Instale dependências.
3. Suba o Postgres e o servidor de desenvolvimento.

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run dev
```

Ou em um único passo (sobe Postgres e Next):

```bash
npm run dev:full
```

Aplicação em `http://localhost:3000`. Usuário admin de desenvolvimento (criado via migration):



A migration de seed só roda fora de produção (`NODE_ENV !== 'production'`).

## Scripts importantes

- `npm run dev` / `npm run dev:full`
- `npm run build` / `npm run start`
- `npm test` / `npm run test:watch` / `npm run test:coverage`
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:check`
- `npm run typecheck`
- `npm run db:migrate` / `db:migrate:down` / `db:migrate:create <nome>`
- `npm run db:reset` (apaga volume e recria, **dev only**)

## Variáveis de ambiente

| Var                  | Descrição                                                     |
| -------------------- | ------------------------------------------------------------- |
| `JWT_SECRET`         | ≥32 chars; em produção valores fracos abortam o boot          |
| `JWT_EXPIRES_IN`     | Ex.: `8h`, `24h`                                              |
| `BCRYPT_ROUNDS`      | Custo do bcrypt; mínimo 12 em prod                            |
| `AUTH_COOKIE_NAME`   | Nome do cookie; em prod recebe prefixo `__Host-` automático   |
| `AUTH_COOKIE_MAX_AGE`| Tempo de vida em segundos                                     |
| `LOG_LEVEL`          | `debug` \| `info` \| `warn` \| `error`                        |
| `DB_*`               | Conexão Postgres                                              |
| `DATABASE_URL`       | Usada pelo `node-pg-migrate`                                  |

## Segurança

- Cookie de sessão `httpOnly`, `SameSite=Lax`, `Secure` em prod, prefixo `__Host-` em prod
- Login com mensagem genérica e tempo constante mesmo em e‑mails inexistentes
- Rate limit por IP e por e‑mail no `/api/auth/login`
- Headers de segurança (CSP, HSTS, X-Frame-Options, COOP, CORP, Permissions-Policy)
- Senhas com bcrypt cost ≥ 12 em produção
- Logs com redact de chaves sensíveis (`senha`, `token`, `authorization`, etc.)

## Banco de dados

A criação de tabelas é feita exclusivamente via `node-pg-migrate`. O `docker-compose` apenas sobe um Postgres limpo. O `db/schema.sql` serve de referência humana, **não é executado** automaticamente.

Migrações:

- `1700000000000_initial_schema.js` — tabelas, índices, triggers
- `1700000000100_seed_admin.js` — admin de desenvolvimento (`NODE_ENV !== 'production'`)
- `1700000000200_add_constraints_and_search.js` — `ON DELETE SET NULL`, `CHECK` constraints, `pg_trgm` para busca

## Endpoints principais

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/chamados`, `POST /api/chamados`
- `GET /api/chamados/metrics` — agregados para dashboard
- `GET /api/chamados/:id`, `PUT /api/chamados/:id`, `DELETE /api/chamados/:id`
- `GET /api/chamados/:id/interacoes`, `POST /api/chamados/:id/interacoes`
- `GET /api/users`, `POST /api/users`, `GET /api/users/me`, `GET /api/users/tecnicos`
- `GET /api/users/:id`, `PUT /api/users/:id`, `DELETE /api/users/:id`
- `GET /api/health`, `GET /api/health/live`
- `GET /api/docs`, `GET /api/docs/openapi`

## CI

Workflow `.github/workflows/ci.yml` executa em PRs e push em `main`:

1. `npm ci`
2. `npm run lint`
3. `npm run format:check`
4. `npm run typecheck`
5. `npm run db:migrate`
6. `npm test`

## Convenções

- Commits/branches em inglês.
- Código novo em camelCase / PascalCase. Nomes legados em PT permanecem para reduzir blast radius.
- Edits triviais: priorize `npm run lint:fix && npm run format`.
