# OrchestrAI — Human-Style Implementation Plan

## Philosophy

Build one vertical slice at a time. Each slice delivers a working, tested feature from HTTP endpoint down to database. The domain model **emerges** from what each slice actually needs — nothing is defined in advance unless a slice requires it.

> Start thin. Add structure only when a second slice reveals the need for it.

---

## Prerequisites (do once, before any feature)

These are not features — they are the minimum needed to run any code at all.

- [ ] `package.json` + `pnpm-workspace.yaml` + `turbo.json`
- [ ] `apps/api/package.json` with NestJS, Prisma, Jest
- [ ] `apps/api/tsconfig.json` (strict TypeScript)
- [ ] `apps/api/nest-cli.json`
- [ ] `apps/api/jest.config.ts`
- [ ] `.env.example` + `.gitignore`
- [ ] PostgreSQL running (`k8s/postgres/` ✅ already done)
- [ ] `prisma/schema.prisma` — empty, just the generator block
- [ ] `src/main.ts` + `src/app.module.ts` — bare NestJS app that starts
- [ ] `GET /health/live` returns `{ status: "ok" }` — proves the app boots

**Done when:** `pnpm install` succeeds, `pnpm dev` starts, `/health/live` responds.

---

## Slice 1 — Create an Agent

**Goal:** A user can create an agent with a name and system prompt. It persists to the database.

### What to build (in this order)

1. **Database** — Add `agents` table to `schema.prisma`, run migration
2. **Domain** — `Agent` plain class/type with `id`, `name`, `systemPrompt`, `createdAt`
   - Emerges here because the slice needs it — not before
3. **Persistence** — `AgentRepository` with `save(agent)` and `findById(id)`
4. **Use case** — `CreateAgentUseCase` that validates input, creates agent, persists it
5. **HTTP** — `POST /agents` with DTO validation, calls use case, returns created agent
6. **Tests**
   - Unit: `CreateAgentUseCase` with mocked repository
   - Integration: repository saves and retrieves real row
   - E2E: `POST /agents` returns 201 with agent data

**Done when:** E2E test passes, agent row appears in database.

---

## Slice 2 — Start a Conversation

**Goal:** A user can start a conversation under an existing agent.

### What to build

1. **Database** — Add `conversations` table, FK to `agents`
2. **Domain** — `Conversation` type with `id`, `agentId`, `userId`, `createdAt`
3. **Persistence** — `ConversationRepository` with `save` and `findById`
4. **Use case** — `StartConversationUseCase`
5. **HTTP** — `POST /agents/:agentId/conversations`
6. **Tests** — Unit, integration, E2E

**Done when:** E2E test passes. At this point refactor if `AgentRepository` and `ConversationRepository` share obvious duplication.

---

## Slice 3 — Send a Message, Get a Plain Text Reply

**Goal:** A user sends a message to an agent and gets a real LLM response back. No tools, no memory, just one call to OpenAI.

This is the most important slice. Everything until now was scaffolding.

### What to build

1. **Database** — Add `messages` table, FK to `conversations`
2. **Domain** — `Message` type with `role` (`user` | `assistant`), `content`, `conversationId`
   - Add validation: content must not be empty
3. **LLM port** — Define `LLMPort` interface with `generate(messages): Promise<string>`
   - Just a TypeScript interface — no adapter yet
4. **OpenAI adapter** — Implement `LLMPort` using OpenAI SDK
5. **Use case** — `HandleChatUseCase`
   - Accept `{ conversationId, userId, content }`
   - Load agent system prompt from DB
   - Call `LLMPort.generate`
   - Save user message + assistant message
   - Return assistant message content
6. **HTTP** — `POST /agents/:agentId/conversations/:conversationId/chat`
7. **Tests**
   - Unit: use case with mocked LLM port and repository
   - Integration: OpenAI adapter returns a string (can use recorded response or stub)
   - E2E: full flow, real OpenAI call (mark as slow/optional in CI)

**Done when:** You can curl the endpoint and get a real response from the agent.

**Refactor checkpoint:** Now that three slices exist, check if patterns are repeating. Extract shared error types, a base `AppException` class, or a shared validation pipe if the code demands it.

---

## Slice 4 — Conversation History (Context)

**Goal:** The agent remembers what was said earlier in the conversation.

### What to build

1. **Persistence** — `MessageRepository.findByConversation(id)` returning ordered messages
2. **Use case update** — `HandleChatUseCase` now loads previous messages and passes them to LLM
3. **HTTP** — `GET /agents/:agentId/conversations/:conversationId/context` returns message list
4. **Tests** — Unit: assert previous messages are included in LLM call

**Done when:** Sending a second message in the same conversation gets a contextually aware response.

---

## Slice 5 — Tool Calling (Single Tool)

**Goal:** The agent can call a tool (start with `calculator`) and include the result in its response.

### What to build

1. **Domain** — `ToolCall` type: `{ name, input }` and `ToolResult` type: `{ name, output, error? }`
2. **Tool port** — `ToolExecutorPort` interface: `execute(name, input): Promise<ToolResult>`
3. **Calculator tool** — Implement `ToolExecutorPort` for a simple calculator
4. **Use case update** — `HandleChatUseCase` detects tool call in LLM response, executes it, feeds result back to LLM, gets final response
   - Add tool message to conversation messages
   - Do NOT loop yet — single tool call only
5. **Tests**
   - Unit: use case with mocked tool executor
   - Unit: tool failure becomes a tool message, not a thrown error

**Done when:** Agent can use the calculator to answer "what is 42 \* 7?"

---

## Slice 6 — Tool Loop (Up to 5 Iterations)

**Goal:** The agent can call multiple tools in sequence until it has enough information to answer.

### What to build

1. **Use case update** — Extract loop logic into `AgentLoopService`
   - Loop up to 5 iterations
   - Each iteration: call LLM → detect tool call → execute → append result → repeat
   - Stop when LLM returns text with no tool call
2. **Domain rule** — Add `AgentLoopLimitException` if iteration 6 would start
3. **Tests**
   - Unit: one tool call then final answer
   - Unit: repeated tool calls up to limit
   - Unit: loop limit throws exception, exception returns error response (not 500)

**Refactor checkpoint:** By now `HandleChatUseCase` is getting complex. If it has grown beyond ~80 lines, extract `ContextLoaderService` and `ToolLoopService` as separate classes. Only do this if the size/complexity justifies it — not speculatively.

---

## Slice 7 — Register and List Tools

**Goal:** Tools can be registered at runtime and listed via the API.

### What to build

1. **Tool registry** — `ToolRegistryPort` interface + in-memory implementation
2. **Use cases** — `RegisterToolUseCase`, `ListToolsUseCase`
3. **HTTP** — `POST /tools`, `GET /tools`
4. **Tests** — Unit and E2E

---

## Slice 8 — Semantic Memory (Vector Search)

**Goal:** The agent loads relevant past conversation snippets using vector similarity.

### What to build

1. **Database** — Add `memory_embeddings` table with pgvector column
2. **Domain** — No new domain types needed yet — reuse `Message`
3. **Vector ports** — `VectorSearchPort` and `VectorIndexPort` interfaces
4. **Adapters** — `PgVectorSearchAdapter` and `PgVectorIndexAdapter`
5. **Use case update** — `HandleChatUseCase` (or `ContextLoaderService`) calls vector search before building context
6. **Indexing** — After saving a message, index its embedding (synchronously for now)
7. **Tests**
   - Integration: embed a message, search for it, find it back
   - Unit: context loader merges short-term and semantic context

**Done when:** Agent references relevant facts from past conversations it hasn't seen in the current context window.

---

## Slice 9 — Health Readiness Check

**Goal:** `/health/ready` reports real dependency health (DB, Redis, LLM config).

### What to build

1. Check DB connection
2. Check Redis connection (if added)
3. Check OpenAI API key is configured
4. Return `{ status: "ok" | "degraded", checks: {...} }`

---

## Slice 10 — Authentication

**Goal:** Endpoints require an API key.

### What to build

1. `ApiKeyGuard` — reads `Authorization` header, validates against env var
2. Apply guard globally or to specific routes
3. Tests — 401 on missing/invalid key

---

## Slice 11 — Rate Limiting

**Goal:** Protect the chat endpoint from abuse.

### What to build

1. Redis (if not yet added via `k8s/dev/` ✅)
2. `RateLimiterPort` + `RedisRateLimiterAdapter`
3. Apply to `POST .../chat` — limit per user or API key
4. Return 429 with stable error shape

---

## Slice 12 — Async Memory Indexing (Background Queue)

**Goal:** Move vector embedding off the request path so chat is faster.

### What to build

1. Add BullMQ + Redis queue
2. `QueuePort` + `BullMqQueueAdapter`
3. After saving messages, enqueue an indexing job instead of indexing inline
4. Worker processor picks up job and calls `VectorIndexPort`
5. Separate worker bootstrap (`bootstrap-worker.ts`)

---

## Slice 13 — Observability

**Goal:** A single chat request can be traced across all layers in logs.

### What to build

1. Structured JSON logger with `requestId`, `userId`, `conversationId`
2. Request ID propagated from HTTP header or generated if missing
3. Timeout interceptor on HTTP routes
4. Metrics: LLM latency, tool execution count, loop iterations

---

## Slice 14 — Frontend MVP

**Goal:** A minimal Next.js chat UI so the product can be validated manually.

### What to build

1. `apps/web/` Next.js app
2. Typed API client pointing at local backend
3. Chat page: input box, message list, loading state, error state

---

## Slice 15 — CI / Deployment

**Goal:** Code can be validated automatically and deployed.

### What to build

1. GitHub Actions: install → lint → typecheck → unit tests → build
2. Integration test job with PostgreSQL + Redis service containers
3. `Dockerfile` for API and web
4. Migration deployment step before traffic switches

---

## Rules For All Slices

- **Write the test first or immediately after** — never leave a slice without tests
- **Only create a new abstraction when two slices share the same pattern** — not speculatively
- **Domain types live in a `domain/` folder but only grow when a slice needs them**
- **Ports (interfaces) are created when there are two or more potential implementations** — or when a use case needs to be testable without the real adapter
- **No layer is "finished" before the next starts** — layers grow incrementally with each slice
- **Refactor only at checkpoints** — after a slice is green, not during

---

## Progress

| #   | Slice                                  | Status  |
| --- | -------------------------------------- | ------- |
| 0   | Prerequisites / bare app boots         | ⬜ Todo |
| 1   | Create an agent                        | ⬜ Todo |
| 2   | Start a conversation                   | ⬜ Todo |
| 3   | Send a message, get a plain text reply | ⬜ Todo |
| 4   | Conversation history / context         | ⬜ Todo |
| 5   | Tool calling (single tool)             | ⬜ Todo |
| 6   | Tool loop (up to 5 iterations)         | ⬜ Todo |
| 7   | Register and list tools                | ⬜ Todo |
| 8   | Semantic memory (vector search)        | ⬜ Todo |
| 9   | Health readiness check                 | ⬜ Todo |
| 10  | Authentication                         | ⬜ Todo |
| 11  | Rate limiting                          | ⬜ Todo |
| 12  | Async memory indexing                  | ⬜ Todo |
| 13  | Observability                          | ⬜ Todo |
| 14  | Frontend MVP                           | ⬜ Todo |
| 15  | CI / Deployment                        | ⬜ Todo |
