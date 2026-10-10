# Financial Audit Engine

## Rules
- PostgreSQL is the source of truth for money.
- MongoDB stores audit logs.
- Active refresh tokens are never stored. Only revoked refresh-token SHA-256 hashes are stored temporarily.
- Revoked-token records are deleted every hour.
- No CORS is configured.
- Transfers use PostgreSQL ACID transactions and row locks.
- Every successful transfer writes a transactional outbox event in the same PostgreSQL transaction.
- An outbox worker asynchronously writes that event to MongoDB. Therefore audit persistence is reliable and eventually consistent, not part of the PostgreSQL transaction itself.
- SSE uses MongoDB Change Streams and filters events to the authenticated user's userId.

## Start with Docker
```powershell
docker compose up -d --build
```
Run migration inside backend container:
```powershell
docker compose exec backend npm run migrate
```
View logs:
```powershell
docker compose logs -f backend
```
Stop:
```powershell
docker compose down
```
Delete all database volumes:
```powershell
docker compose down -v
```

## Local Node development
Start only databases:
```powershell
docker compose up -d postgres mongo mongo-init
```
Copy `.env.example` to `.env`, then use `POSTGRES_HOST=localhost` and the localhost Mongo URI.
```powershell
npm install
npm run migrate
npm run dev
```

## Endpoints
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- POST `/api/accounts`
- GET `/api/accounts`
- POST `/api/transfer`
- GET `/api/transfer`
- GET `/api/logs/stream`
- GET `/health`

## Transfer
Header:
`Idempotency-Key: a-unique-key`

Body:
```json
{"fromAccountId":"uuid","toAccountId":"uuid","amount":"100.00"}
```

## SSE
SSE headers:
- `Content-Type: text/event-stream` tells the client to parse the body as SSE.
- `Cache-Control: no-cache` prevents intermediary caching; it is not a resource and needs no cleanup.
- `Connection: keep-alive` keeps the HTTP connection open.
- `X-Accel-Buffering: no` helps prevent buffering by compatible reverse proxies.

Per connection, the code owns one MongoDB Change Stream, one heartbeat timer, and its event listeners. `cleanup()` is idempotent and closes only the Change Stream. It never closes the shared MongoDB client.

## 100 connection test
Set an access cookie and run:
```powershell
$env:ACCESS_COOKIE="your_access_token"
.\load-tests\sse-100.ps1
```
Open another terminal:
```powershell
docker compose logs -f backend
```
Repeat connection/disconnection cycles. The important observation is that disconnected streams disappear and MongoDB/client resources do not continuously accumulate.
