# Deskora
Deskora é um sistema de chamados para pequenas e médias empresas, com backend Node.js/Express e frontend React.

**Recursos principais**
- Autenticação com JWT e controle de permissões (admin, técnico, usuário)
- Cadastro e gestão de chamados com solicitante, técnico e histórico visual
- Atribuição/assunção de chamados pelos técnicos via painel dedicado
- Cadastro de usuários (rota protegida por admin)
- Dashboard com métricas básicas

**Estrutura do projeto**
- `backend/` API REST, autenticação, validações, banco de dados
- `frontend/` SPA React
- `backend/sql/schema.sql` schema base para PostgreSQL

## Como rodar localmente

**Backend**
1. Copie `backend/.env.example` para `backend/.env` e ajuste valores.
2. Suba o banco PostgreSQL.
3. Execute o schema em `backend/sql/schema.sql` e, se o banco já existe, rode `psql -f backend/sql/migrations/002_add_tecnico_id.sql`.
   - O schema agora adiciona o campo `tecnico_id` e relacionamentos para permitir atribuição de técnicos.
4. Instale dependências e rode:
   - `npm install`
   - `npm run dev`
   - `npm run lint` (opcional)

**Frontend**
1. Copie `frontend/.env.example` para `frontend/.env` e ajuste valores.
2. Instale dependências e rode:
   - `npm install`
   - `npm start`

## Variáveis de ambiente

**Backend (`backend/.env`)**
- `PORT` porta da API
- `JWT_SECRET` segredo do JWT
- `JWT_EXPIRES_IN` tempo de expiração do JWT (ex: `8h`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` conexão PostgreSQL
- `CORS_ORIGIN` lista de origens separadas por vírgula

**Frontend (`frontend/.env`)**
- `REACT_APP_API_URL` URL base da API

## Documentação da API (sugestão)
Para produção, recomenda-se adicionar Swagger/OpenAPI.
Opções simples:
- `swagger-ui-express` + `swagger-jsdoc`
- `@fastify/swagger` (se migrar para Fastify futuramente)

### Endpoints úteis adicionais
- `GET /users/tecnicos`: lista os usuários do tipo `ti` (acesso restrito a técnicos e administradores) para alimentar seletores de atribuição.

## Paginação e filtros
O endpoint `GET /chamados` aceita:
- `page` (default 1)
- `limit` (default 20, máx 100)
- `status` (`aberto`, `em_andamento`, `fechado`)
- `prioridade` (`baixa`, `media`, `alta`)
- `usuarioId` (apenas para admin/TI)

## Observações de segurança
- Tokens JWT são armazenados em `sessionStorage`
- Senhas são armazenadas com hash bcrypt
- Logs não incluem dados sensíveis
