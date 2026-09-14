# Webhook Delivery System

A backend service that allows customers to register webhook endpoints and receive event notifications asynchronously. The system stores events and delivery state in PostgreSQL, uses an outbox pattern for reliable fan-out, and uses BullMQ with Redis to process webhook deliveries.

## Features

- Customer creation and API-key authentication
- Webhook endpoint CRUD
- Endpoint secrets encrypted at rest
- Event ingestion with idempotency-key support
- Atomic event and outbox record creation
- Asynchronous fan-out to matching active endpoints
- Concurrent outbox processing
- Asynchronous webhook delivery using BullMQ workers
- HMAC-SHA256 request signatures with timestamps
- Delivery IDs for consumer-side deduplication
- Retry handling for retryable failures
- Exponential backoff, jitter, and `Retry-After` support
- Queue reconciliation and recovery of stuck deliveries
- Event completion after all associated deliveries reach terminal states

## Architecture

```text
Customer
   |
   | Submit event
   v
API
   |
   | Transaction: create Event + OutboxEvent
   v
PostgreSQL
   |
   v
Outbox Processor
   |
   | Find matching active endpoints
   | Create Delivery records
   | Mark OutboxEvent as PUBLISHED
   v
Delivery records in PostgreSQL
   |
   v
Queue Publisher
   |
   v
BullMQ / Redis
   |
   v
Delivery Worker
   |
   | Sign and send HTTP request
   v
Customer Webhook Endpoint
```

### Component responsibilities

**API**

Accepts customer requests, authenticates API keys, validates input, and stores events and related outbox records.

**Outbox Processor**

Reads pending outbox records and creates one delivery per matching active endpoint. It does not make HTTP requests.

**Queue Publisher**

Finds deliveries that are ready to be processed and publishes jobs to BullMQ. It also recovers stale `PROCESSING` deliveries and re-enqueues them. PostgreSQL remains the source of truth for delivery state.

**Delivery Worker**

Claims a delivery, sends the webhook request, and records the result. Retryable failures are returned to `PENDING` with a future `nextRetryAt` and a delayed BullMQ job.

**Event Completion**

An event is marked `COMPLETED` when all its deliveries are terminal: `SUCCESS` or `FAILED_PERMANENTLY`. Events with pending or processing deliveries remain `DELIVERING`.

## Technology Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Axios
- Zod
- Docker

## Data Model

The main entities are:

- **Customer** — customer identity, API-key hash, and account status.
- **WebhookEndpoint** — customer endpoint URL, event type, encrypted signing secret, and active state.
- **Event** — accepted event type, JSON payload, and customer-provided idempotency key.
- **OutboxEvent** — durable record used to trigger asynchronous fan-out.
- **Delivery** — one delivery attempt lifecycle for a specific event and endpoint.

The database uses unique constraints to prevent duplicate event acceptance and duplicate delivery records.

## Delivery and Retry Behavior

A delivery follows this lifecycle:

```text
PENDING → PROCESSING → SUCCESS
                    ↘ PENDING       (retry scheduled)
                    ↘ FAILED_PERMANENTLY
```

The implementation distinguishes retryable failures, such as HTTP 5xx responses and network errors, from non-retryable failures, such as HTTP 4xx responses.

Retries use a bounded retry count (default 5) and exponential backoff with jitter. The delivery's stable ID is sent to the receiving endpoint as `X-Webhook-Id`, allowing consumers to deduplicate repeated requests. The event's idempotency key is also sent as `Idempotency-Key`.

Webhook requests include a timestamp and HMAC-SHA256 signature:

```text
signedPayload = timestamp + "." + JSON.stringify(payload)
signature     = HMAC-SHA256(endpointSecret, signedPayload)
```

Headers sent on each delivery:


| Header                | Description              |
| --------------------- | ------------------------ |
| `Content-Type`        | `application/json`       |
| `X-Webhook-Id`        | Stable delivery ID       |
| `X-Webhook-Timestamp` | Unix timestamp (seconds) |
| `X-Webhook-Signature` | `sha256=<hex digest>`    |
| `Idempotency-Key`     | Event idempotency key    |


The receiving service should verify the signature using the shared endpoint secret and reject timestamps outside its configured replay window.

**Delivery is at-least-once, not exactly-once.** A webhook may be delivered more than once if the receiver processes it but the sender fails before recording success. Consumers should deduplicate using the delivery ID.

## Getting Started

### Prerequisites

Install or have access to:

- Node.js 18+ and npm
- Docker and Docker Compose

### 1. Clone the repository

```bash
git clone <repository-url>
cd Webhookdeliverysystem
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in the required values:

```bash
cp .env.example .env
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Typical configuration values:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://webhook_user:webhook_password@localhost:5432/webhook_db
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<64-character-hex-string>
```

Use a strong encryption key and keep secrets out of source control. Do not commit your `.env` file.

See `[.env.example](.env.example)` for optional delivery and worker tuning variables.

### 4. Start PostgreSQL and Redis

```bash
docker compose up -d
```

This starts Postgres on port `5432` and Redis on port `6379`.

### 5. Apply database migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 6. Start the application

Run all processes in one terminal:

```bash
npm run start:all
```

Or run each process separately:

```bash
npm run dev                        # API server
npm run start:outbox-worker        # Outbox processor
npm run start:delivery-publisher   # Queue publisher
npm run start:delivery-worker      # Delivery worker
```

For production, build first and use the compiled entry points:

```bash
npm run build
npm run start:prod:all
```

The API listens on `http://localhost:5000` by default.

## API

Authenticated routes require the `x-api-key` header. Event ingestion requires an `Idempotency-Key` header.


| Area              | Method   | Path                    | Auth | Purpose                                |
| ----------------- | -------- | ----------------------- | ---- | -------------------------------------- |
| Customers         | `POST`   | `/api/customer`         | No   | Create customer (returns API key once) |
| Customers         | `GET`    | `/api/customer`         | Yes  | Get current customer                   |
| Customers         | `PATCH`  | `/api/customer`         | Yes  | Update customer                        |
| Customers         | `DELETE` | `/api/customer`         | Yes  | Soft-deactivate customer               |
| Customers         | `POST`   | `/api/customer/api-key` | Yes  | Regenerate API key                     |
| Webhook endpoints | `POST`   | `/api/endpoint`         | Yes  | Register endpoint(s) for an event type |
| Webhook endpoints | `GET`    | `/api/endpoint`         | Yes  | List endpoints                         |
| Webhook endpoints | `GET`    | `/api/endpoint/:id`     | Yes  | Get endpoint by ID                     |
| Webhook endpoints | `PATCH`  | `/api/endpoint/:id`     | Yes  | Update endpoint                        |
| Webhook endpoints | `DELETE` | `/api/endpoint/:id`     | Yes  | Deactivate endpoint                    |
| Events            | `POST`   | `/api/event/create`     | Yes  | Submit event with idempotency key      |


**Create customer**

```bash
curl -X POST http://localhost:5000/api/customer \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp"}'
```

**Register endpoint**

```bash
curl -X POST http://localhost:5000/api/endpoint \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "eventType": "order.paid",
    "endpoints": [
      {
        "url": "https://webhook.site/your-unique-id",
        "secret": "whsec_your_secret"
      }
    ]
  }'
```

**Submit event**

```bash
curl -X POST http://localhost:5000/api/event/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Idempotency-Key: order-123-paid" \
  -d '{
    "eventType": "order.paid",
    "payload": {
      "orderId": "ord_123",
      "amount": 4999,
      "currency": "INR"
    }
  }'
```

Response (`202 Accepted`):

```json
{
  "eventId": "uuid",
  "status": "RECEIVED"
}
```

## Project Status

The core asynchronous delivery pipeline, retry handling, queue recovery, and event completion have been implemented.

Potential future improvements include:

- Event and delivery status read APIs
- Failed-delivery inspection and manual retry APIs
- Structured logging and metrics
- Additional security hardening, including SSRF protection
- Rate limiting and backpressure
- Automated unit and integration tests
- Graceful shutdown and deployment hardening

## Architecture & Design Decisions

For detailed flow diagrams, state machines, and the rationale behind every major design choice, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Important Notes

- PostgreSQL is the durable source of truth; Redis/BullMQ is used for job execution.
- Endpoint signing secrets are encrypted because they must be recoverable for request signing.
- Customer API keys are stored as hashes, not plaintext.
- Receiving services should verify webhook signatures and deduplicate deliveries.
- Never commit API keys, encryption keys, database credentials, or other secrets.



