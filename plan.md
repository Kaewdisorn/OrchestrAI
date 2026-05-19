# OrchestrAI Production Implementation Plan V2

## 1. Production Target

- Build an AI agent orchestration platform with Clean Architecture, Hexagonal Architecture, CQRS, DDD Light, and event-driven workflows.
- Keep all external services behind application ports: OpenAI, Prisma, PostgreSQL, pgvector, Redis, BullMQ, HTTP tools, and event publishing.
- Keep domain pure: no NestJS decorators, no Prisma types, no OpenAI SDK types, no Redis/BullMQ types.
- Keep handlers thin: handlers validate use-case intent, call application services, persist results, publish events.
- Keep controllers thin: DTO validation, command/query dispatch, response mapping only.
- Agent loop must always follow: load memory, load vector context, call LLM, execute tools if requested, repeat up to 5 iterations, save messages, emit events.
- Tool failures must be converted into tool-result messages and appended to context; they must not crash the agent loop.
- Infrastructure exceptions must be mapped into domain/application exceptions before crossing adapter boundaries.
- Production readiness requires tests, observability, rate limits, health checks, graceful shutdown, migrations, and deployment configuration.

## 2. Priority Legend

- P0: required for a production-safe MVP.
- P1: required before public beta or real users.
- P2: required after the core platform is stable.

## 3. Final Folder Structure

```txt
OrchestrAI/
  README.md
  plan.md
  plan-v2.md
  roadmap.md
  .env.example
  .gitignore
  docker-compose.yml
  docker-compose.test.yml
  package.json
  pnpm-workspace.yaml
  turbo.json
  apps/
    api/
      package.json
      tsconfig.json
      tsconfig.build.json
      nest-cli.json
      jest.config.ts
      test/
        setup-e2e.ts
        factories/
          agent.factory.ts
          message.factory.ts
          tool.factory.ts
        domain/
          agent.entity.spec.ts
          conversation.entity.spec.ts
          message.vo.spec.ts
          tool-call.vo.spec.ts
          context-window.vo.spec.ts
          agent-policy.service.spec.ts
          context-merge.service.spec.ts
        application/
          handle-chat.command-handler.spec.ts
          get-context.query-handler.spec.ts
          agent-loop.service.spec.ts
          context-loader.service.spec.ts
          tool-loop.service.spec.ts
        infrastructure/
          prisma-memory-command.adapter.int-spec.ts
          prisma-memory-query.adapter.int-spec.ts
          pgvector-search.adapter.int-spec.ts
          openai.adapter.int-spec.ts
          bullmq-queue.adapter.int-spec.ts
        e2e/
          health.e2e-spec.ts
          agent-chat.e2e-spec.ts
          tool-failure.e2e-spec.ts
      prisma/
        schema.prisma
        migrations/
        seed.ts
      src/
        main.ts
        app.module.ts
        core/
          core.module.ts
          constants.ts
          tokens.ts
          decorators/
            current-user.decorator.ts
            request-id.decorator.ts
          errors/
            application-error.ts
            domain-error.ts
            infrastructure-error.ts
          filters/
            domain-exception.filter.ts
            http-exception.filter.ts
          guards/
            api-key.guard.ts
          interceptors/
            logging.interceptor.ts
            request-id.interceptor.ts
            timeout.interceptor.ts
          middleware/
            request-context.middleware.ts
          pipes/
            validation.pipe.ts
          telemetry/
            logger.service.ts
            metrics.service.ts
            tracing.service.ts
        domain/
          shared/
            events/
              domain-event.ts
            types/
              ids.ts
          agent/
            entities/
              agent.entity.ts
              conversation.entity.ts
              tool-execution.entity.ts
            value-objects/
              agent-id.vo.ts
              conversation-id.vo.ts
              user-id.vo.ts
              message.vo.ts
              message-role.vo.ts
              context-window.vo.ts
              llm-response.vo.ts
              tool.vo.ts
              tool-call.vo.ts
              tool-result.vo.ts
            services/
              agent-policy.service.ts
              context-merge.service.ts
              tool-call-policy.service.ts
            events/
              memory-updated.event.ts
              tool-executed.event.ts
              agent-response.event.ts
              agent-loop-limit-reached.event.ts
            exceptions/
              agent-loop-limit.exception.ts
              invalid-message.exception.ts
              llm-unavailable.exception.ts
              tool-execution.exception.ts
              tool-not-found.exception.ts
        application/
          common/
            pagination.ts
            result.ts
            transaction-context.ts
          ports/
            agent-repository.port.ts
            conversation-repository.port.ts
            event-publisher.port.ts
            llm.port.ts
            memory-command.port.ts
            memory-query.port.ts
            queue.port.ts
            rate-limiter.port.ts
            tool-executor.port.ts
            tool-registry.port.ts
            transaction-manager.port.ts
            vector-index.port.ts
            vector-search.port.ts
          commands/
            handle-chat.command.ts
            save-message.command.ts
            register-tool.command.ts
            index-memory.command.ts
            replay-agent-event.command.ts
          queries/
            get-agent.query.ts
            get-context.query.ts
            get-conversation.query.ts
            list-tools.query.ts
          handlers/
            handle-chat.command-handler.ts
            save-message.command-handler.ts
            register-tool.command-handler.ts
            index-memory.command-handler.ts
            replay-agent-event.command-handler.ts
            get-agent.query-handler.ts
            get-context.query-handler.ts
            get-conversation.query-handler.ts
            list-tools.query-handler.ts
          services/
            agent-loop.service.ts
            context-loader.service.ts
            memory-writer.service.ts
            tool-loop.service.ts
            tool-result-normalizer.service.ts
          mappers/
            agent-response.mapper.ts
            message-response.mapper.ts
        infrastructure/
          config/
            config.module.ts
            configuration.ts
            env.validation.ts
          events/
            events.module.ts
            adapters/
              nest-event-publisher.adapter.ts
            subscribers/
              audit-log.subscriber.ts
              memory-index.subscriber.ts
          llm/
            llm.module.ts
            adapters/
              openai.adapter.ts
            mappers/
              openai-response.mapper.ts
            prompts/
              agent-system.prompt.ts
            resilience/
              llm-retry.policy.ts
              llm-timeout.policy.ts
          persistence/
            persistence.module.ts
            prisma/
              prisma.service.ts
              prisma-transaction-manager.adapter.ts
            mappers/
              agent.mapper.ts
              conversation.mapper.ts
              message.mapper.ts
              tool-execution.mapper.ts
            repositories/
              prisma-agent.repository.ts
              prisma-conversation.repository.ts
            adapters/
              prisma-memory-command.adapter.ts
              prisma-memory-query.adapter.ts
          queue/
            queue.module.ts
            adapters/
              bullmq-queue.adapter.ts
            processors/
              audit-log.processor.ts
              memory-index.processor.ts
              multi-agent.processor.ts
          rate-limit/
            rate-limit.module.ts
            adapters/
              redis-rate-limiter.adapter.ts
          tools/
            tool.module.ts
            adapters/
              default-tool-executor.adapter.ts
              in-memory-tool-registry.adapter.ts
            schemas/
              tool-input.schema.ts
            tools/
              calculator.tool.ts
              http.tool.ts
          vector/
            vector.module.ts
            adapters/
              pgvector-index.adapter.ts
              pgvector-search.adapter.ts
            mappers/
              embedding.mapper.ts
        modules/
          agent.module.ts
          health.module.ts
          memory.module.ts
          observability.module.ts
          tool.module.ts
          vector.module.ts
          worker.module.ts
        presentation/
          controllers/
            agent.controller.ts
            health.controller.ts
            memory.controller.ts
            tools.controller.ts
          dto/
            chat-response.dto.ts
            error-response.dto.ts
            get-context.dto.ts
            handle-chat.dto.ts
            message.dto.ts
            register-tool.dto.ts
          mappers/
            http-agent.mapper.ts
          validators/
            is-json-schema.validator.ts
        workers/
          worker.module.ts
          bootstrap-worker.ts
    web/
      package.json
      next.config.ts
      tsconfig.json
      app/
        layout.tsx
        page.tsx
        chat/
          page.tsx
      src/
        api/
          client.ts
          agent-api.ts
        components/
          chat/
            chat-panel.tsx
            message-list.tsx
            prompt-box.tsx
        lib/
          env.ts
```

## 4. Module Responsibilities

| Module | Priority | Responsibility | Depends On |
| --- | --- | --- | --- |
| AppModule | P0 | Root module, import order, global providers | All top-level modules |
| CoreModule | P0 | Tokens, filters, guards, interceptors, telemetry primitives | None |
| ConfigModule | P0 | Environment validation and typed config | CoreModule |
| AgentModule | P0 | CQRS handlers and agent loop services | MemoryModule, VectorModule, LlmModule, ToolModule, EventsModule |
| MemoryModule | P0 | Short-term context and durable message writes | PersistenceModule |
| VectorModule | P0 | Semantic search and memory embedding/indexing | PersistenceModule |
| LlmModule | P0 | OpenAI adapter behind LLMPort | ConfigModule |
| ToolModule | P0 | Tool registry, validation, execution adapter | ConfigModule |
| PersistenceModule | P0 | Prisma, repositories, transaction manager | ConfigModule |
| EventsModule | P0 | Event publishing and subscribers | QueueModule |
| QueueModule | P1 | BullMQ producer and processors | ConfigModule |
| RateLimitModule | P1 | Redis-backed API/user/tool rate limits | ConfigModule |
| HealthModule | P0 | Liveness and readiness endpoints | PersistenceModule, QueueModule, LlmModule |
| ObservabilityModule | P0 | Structured logs, metrics, tracing | CoreModule |
| WorkerModule | P1 | Dedicated background worker bootstrap | QueueModule, EventsModule, VectorModule |

## 5. Implementation Plan By Priority And Phase

### Phase 0 - Repository Baseline

- Priority: P0
- Goal: Create a predictable production workspace before feature code.
- Files:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `turbo.json`
  - `.env.example`
  - `.gitignore`
  - `docker-compose.yml`
  - `docker-compose.test.yml`
  - `apps/api/package.json`
  - `apps/api/tsconfig.json`
  - `apps/api/tsconfig.build.json`
  - `apps/api/nest-cli.json`
  - `apps/api/jest.config.ts`
- Implementation order:
  - Add monorepo package scripts: `dev`, `build`, `lint`, `test`, `test:e2e`, `test:int`, `format`, `prisma:migrate`, `prisma:generate`.
  - Add Docker services for PostgreSQL with pgvector and Redis.
  - Add strict TypeScript configuration.
  - Add Jest config for unit, integration, and e2e separation.
  - Add `.env.example` with all required variables.
- Acceptance criteria:
  - `pnpm install` succeeds.
  - `pnpm build` can run against an empty app.
  - PostgreSQL and Redis start from Docker Compose.
  - Test database can be isolated from development database.
- Why before next phase:
  - Every later phase needs stable scripts, strict TypeScript, test setup, and local infrastructure.

### Phase 1 - Foundation And DI Boundaries

- Priority: P0
- Goal: Establish NestJS module boundaries, cross-cutting infrastructure, and dependency injection tokens.
- Files:
  - `apps/api/src/main.ts`
  - `apps/api/src/app.module.ts`
  - `apps/api/src/core/core.module.ts`
  - `apps/api/src/core/tokens.ts`
  - `apps/api/src/core/constants.ts`
  - `apps/api/src/core/errors/application-error.ts`
  - `apps/api/src/core/errors/domain-error.ts`
  - `apps/api/src/core/errors/infrastructure-error.ts`
  - `apps/api/src/core/filters/domain-exception.filter.ts`
  - `apps/api/src/core/filters/http-exception.filter.ts`
  - `apps/api/src/core/interceptors/request-id.interceptor.ts`
  - `apps/api/src/core/interceptors/logging.interceptor.ts`
  - `apps/api/src/core/interceptors/timeout.interceptor.ts`
  - `apps/api/src/core/middleware/request-context.middleware.ts`
  - `apps/api/src/core/pipes/validation.pipe.ts`
  - `apps/api/src/infrastructure/config/config.module.ts`
  - `apps/api/src/infrastructure/config/configuration.ts`
  - `apps/api/src/infrastructure/config/env.validation.ts`
- Implementation order:
  - Define DI token constants for every port before any adapter exists.
  - Configure global validation with whitelist, transform, forbid unknown values, and consistent error shape.
  - Configure global exception filters for domain/application errors.
  - Add request ID propagation and structured logging hooks.
  - Add timeout interceptor for HTTP request safety.
  - Add typed environment config with validation.
- Acceptance criteria:
  - App starts with no feature modules.
  - Missing required env vars fail fast at startup.
  - Validation errors return stable JSON shape.
  - Every port has a token and no adapter import leaks into domain/application.
- Why before next phase:
  - Domain and application layers can stay framework-light only if DI and error boundaries are settled first.

### Phase 2 - Pure Domain Model

- Priority: P0
- Goal: Implement business rules and types with no framework or infrastructure dependency.
- Files:
  - `apps/api/src/domain/shared/events/domain-event.ts`
  - `apps/api/src/domain/shared/types/ids.ts`
  - `apps/api/src/domain/agent/entities/agent.entity.ts`
  - `apps/api/src/domain/agent/entities/conversation.entity.ts`
  - `apps/api/src/domain/agent/entities/tool-execution.entity.ts`
  - `apps/api/src/domain/agent/value-objects/agent-id.vo.ts`
  - `apps/api/src/domain/agent/value-objects/conversation-id.vo.ts`
  - `apps/api/src/domain/agent/value-objects/user-id.vo.ts`
  - `apps/api/src/domain/agent/value-objects/message.vo.ts`
  - `apps/api/src/domain/agent/value-objects/message-role.vo.ts`
  - `apps/api/src/domain/agent/value-objects/context-window.vo.ts`
  - `apps/api/src/domain/agent/value-objects/llm-response.vo.ts`
  - `apps/api/src/domain/agent/value-objects/tool.vo.ts`
  - `apps/api/src/domain/agent/value-objects/tool-call.vo.ts`
  - `apps/api/src/domain/agent/value-objects/tool-result.vo.ts`
  - `apps/api/src/domain/agent/services/agent-policy.service.ts`
  - `apps/api/src/domain/agent/services/context-merge.service.ts`
  - `apps/api/src/domain/agent/services/tool-call-policy.service.ts`
  - `apps/api/src/domain/agent/events/memory-updated.event.ts`
  - `apps/api/src/domain/agent/events/tool-executed.event.ts`
  - `apps/api/src/domain/agent/events/agent-response.event.ts`
  - `apps/api/src/domain/agent/events/agent-loop-limit-reached.event.ts`
  - `apps/api/src/domain/agent/exceptions/agent-loop-limit.exception.ts`
  - `apps/api/src/domain/agent/exceptions/invalid-message.exception.ts`
  - `apps/api/src/domain/agent/exceptions/llm-unavailable.exception.ts`
  - `apps/api/src/domain/agent/exceptions/tool-execution.exception.ts`
  - `apps/api/src/domain/agent/exceptions/tool-not-found.exception.ts`
- Implementation order:
  - Define immutable value objects first.
  - Define entities using value objects only.
  - Define domain services for context merge, max context size, allowed tool calls, and loop limit policy.
  - Define events as plain objects/classes with event ID, occurredAt, aggregate IDs, and metadata.
  - Define domain exceptions with stable error codes.
- Production rules:
  - Message content must reject empty strings after trimming.
  - Message role must be one of `user`, `assistant`, or `tool`.
  - Tool names must be normalized and validated.
  - Tool call input must be JSON-serializable.
  - Context window must protect against unbounded prompt growth.
  - Domain events must include correlation ID metadata when emitted from application layer.
- Acceptance criteria:
  - Domain unit tests use no mocks.
  - No file in `domain/` imports from NestJS, Prisma, OpenAI, Redis, BullMQ, or infrastructure.
  - Domain exceptions cover invalid message, unavailable LLM, missing tool, tool failure, and loop limit.
- Why before next phase:
  - Application services need stable domain contracts before ports, commands, and handlers are implemented.

### Phase 3 - Application Ports, Commands, Queries, And Services

- Priority: P0
- Goal: Define use-case contracts and orchestration services before writing any adapter.
- Files:
  - `apps/api/src/application/common/pagination.ts`
  - `apps/api/src/application/common/result.ts`
  - `apps/api/src/application/common/transaction-context.ts`
  - `apps/api/src/application/ports/agent-repository.port.ts`
  - `apps/api/src/application/ports/conversation-repository.port.ts`
  - `apps/api/src/application/ports/event-publisher.port.ts`
  - `apps/api/src/application/ports/llm.port.ts`
  - `apps/api/src/application/ports/memory-command.port.ts`
  - `apps/api/src/application/ports/memory-query.port.ts`
  - `apps/api/src/application/ports/queue.port.ts`
  - `apps/api/src/application/ports/rate-limiter.port.ts`
  - `apps/api/src/application/ports/tool-executor.port.ts`
  - `apps/api/src/application/ports/tool-registry.port.ts`
  - `apps/api/src/application/ports/transaction-manager.port.ts`
  - `apps/api/src/application/ports/vector-index.port.ts`
  - `apps/api/src/application/ports/vector-search.port.ts`
  - `apps/api/src/application/commands/handle-chat.command.ts`
  - `apps/api/src/application/commands/save-message.command.ts`
  - `apps/api/src/application/commands/register-tool.command.ts`
  - `apps/api/src/application/commands/index-memory.command.ts`
  - `apps/api/src/application/commands/replay-agent-event.command.ts`
  - `apps/api/src/application/queries/get-agent.query.ts`
  - `apps/api/src/application/queries/get-context.query.ts`
  - `apps/api/src/application/queries/get-conversation.query.ts`
  - `apps/api/src/application/queries/list-tools.query.ts`
  - `apps/api/src/application/services/context-loader.service.ts`
  - `apps/api/src/application/services/memory-writer.service.ts`
  - `apps/api/src/application/services/tool-result-normalizer.service.ts`
- Implementation order:
  - Define port interfaces exactly once in application layer.
  - Define command and query objects with primitive inputs only.
  - Define application response models that do not expose adapter SDK payloads.
  - Implement `ContextLoaderService` using `MemoryQueryPort` and `VectorSearchPort`.
  - Implement `MemoryWriterService` using `MemoryCommandPort` and transaction boundary.
  - Implement `ToolResultNormalizerService` to convert successful or failed tool execution into `Message`.
- Production rules:
  - Commands must carry `userId`, `conversationId`, request message, correlation ID, and optional metadata.
  - Queries must support pagination where list results can grow.
  - Ports must not return Prisma models or OpenAI responses.
  - Ports must have narrow methods; avoid generic `any` unless domain type requires JSON tool input.
- Acceptance criteria:
  - Application unit tests compile with mocked ports.
  - No application file imports infrastructure files.
  - Handlers are not implemented until supporting services and ports exist.
- Why before next phase:
  - Infrastructure adapters must conform to application-owned contracts, not the other way around.

### Phase 4 - Persistence, Schema, And Transactions

- Priority: P0
- Goal: Build durable state and mappings without leaking database types upward.
- Files:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/seed.ts`
  - `apps/api/src/infrastructure/persistence/persistence.module.ts`
  - `apps/api/src/infrastructure/persistence/prisma/prisma.service.ts`
  - `apps/api/src/infrastructure/persistence/prisma/prisma-transaction-manager.adapter.ts`
  - `apps/api/src/infrastructure/persistence/mappers/agent.mapper.ts`
  - `apps/api/src/infrastructure/persistence/mappers/conversation.mapper.ts`
  - `apps/api/src/infrastructure/persistence/mappers/message.mapper.ts`
  - `apps/api/src/infrastructure/persistence/mappers/tool-execution.mapper.ts`
  - `apps/api/src/infrastructure/persistence/repositories/prisma-agent.repository.ts`
  - `apps/api/src/infrastructure/persistence/repositories/prisma-conversation.repository.ts`
  - `apps/api/src/infrastructure/persistence/adapters/prisma-memory-command.adapter.ts`
  - `apps/api/src/infrastructure/persistence/adapters/prisma-memory-query.adapter.ts`
- Database models:
  - `users`: ID, external identity reference, status, timestamps.
  - `agents`: ID, owner ID, name, description, system prompt, status, timestamps.
  - `conversations`: ID, user ID, agent ID, title, status, timestamps.
  - `messages`: ID, conversation ID, user ID, role, content, token estimate, metadata JSON, timestamps.
  - `tool_executions`: ID, conversation ID, message ID, tool name, input JSON, output JSON, status, error code, duration, timestamps.
  - `memory_embeddings`: ID, message ID, user ID, conversation ID, embedding vector, content hash, metadata JSON, timestamps.
  - `outbox_events`: ID, event type, payload JSON, status, attempts, next retry at, timestamps.
  - `audit_logs`: ID, actor ID, action, resource type, resource ID, metadata JSON, timestamps.
- Implementation order:
  - Create Prisma schema with explicit indexes and foreign keys.
  - Add pgvector extension migration.
  - Add repository mappers before repositories.
  - Add memory command adapter with transaction support.
  - Add memory query adapter with pagination and most-recent ordering.
  - Add transaction manager adapter for multi-write application use cases.
  - Add outbox table for reliable event delivery.
- Production rules:
  - Use database transactions for saving user message, assistant message, tool executions, and outbox events.
  - Store mapped LLM response only; do not store raw provider payload by default.
  - Add indexes for `userId`, `conversationId`, `createdAt`, and vector search filters.
  - Use soft status fields for conversations and agents where deletion could break audit history.
  - Keep JSON metadata bounded and documented.
- Acceptance criteria:
  - Prisma migration runs from empty database.
  - Repository integration tests pass against test PostgreSQL.
  - Mappers round-trip domain objects without losing required fields.
  - No Prisma type escapes infrastructure.
- Why before next phase:
  - LLM, vector, queue, and event adapters depend on durable storage and transactions.

### Phase 5 - Infrastructure Adapters

- Priority: P0 for LLM, memory, vector search, and tool executor; P1 for queue/rate-limit hardening.
- Goal: Implement replaceable adapters for each external service.
- Files:
  - `apps/api/src/infrastructure/llm/llm.module.ts`
  - `apps/api/src/infrastructure/llm/adapters/openai.adapter.ts`
  - `apps/api/src/infrastructure/llm/mappers/openai-response.mapper.ts`
  - `apps/api/src/infrastructure/llm/prompts/agent-system.prompt.ts`
  - `apps/api/src/infrastructure/llm/resilience/llm-retry.policy.ts`
  - `apps/api/src/infrastructure/llm/resilience/llm-timeout.policy.ts`
  - `apps/api/src/infrastructure/vector/vector.module.ts`
  - `apps/api/src/infrastructure/vector/adapters/pgvector-search.adapter.ts`
  - `apps/api/src/infrastructure/vector/adapters/pgvector-index.adapter.ts`
  - `apps/api/src/infrastructure/vector/mappers/embedding.mapper.ts`
  - `apps/api/src/infrastructure/tools/tool.module.ts`
  - `apps/api/src/infrastructure/tools/adapters/default-tool-executor.adapter.ts`
  - `apps/api/src/infrastructure/tools/adapters/in-memory-tool-registry.adapter.ts`
  - `apps/api/src/infrastructure/tools/schemas/tool-input.schema.ts`
  - `apps/api/src/infrastructure/tools/tools/calculator.tool.ts`
  - `apps/api/src/infrastructure/tools/tools/http.tool.ts`
  - `apps/api/src/infrastructure/events/events.module.ts`
  - `apps/api/src/infrastructure/events/adapters/nest-event-publisher.adapter.ts`
  - `apps/api/src/infrastructure/events/subscribers/audit-log.subscriber.ts`
  - `apps/api/src/infrastructure/events/subscribers/memory-index.subscriber.ts`
  - `apps/api/src/infrastructure/queue/queue.module.ts`
  - `apps/api/src/infrastructure/queue/adapters/bullmq-queue.adapter.ts`
  - `apps/api/src/infrastructure/rate-limit/rate-limit.module.ts`
  - `apps/api/src/infrastructure/rate-limit/adapters/redis-rate-limiter.adapter.ts`
- Implementation order:
  - Implement OpenAI adapter behind `LLMPort`.
  - Map OpenAI response into `LLMResponse` value object and normalized optional `ToolCall`.
  - Add timeout, retry with bounded attempts, and provider error mapping.
  - Implement pgvector search adapter behind `VectorSearchPort`.
  - Implement vector index adapter behind `VectorIndexPort`.
  - Implement in-memory registry and default executor behind tool ports.
  - Validate tool inputs against schema before execution.
  - Add BullMQ adapter behind `QueuePort`.
  - Add event publisher adapter and subscribers.
  - Add Redis rate limiter adapter after API surface exists.
- Production rules:
  - LLM adapter must redact secrets from logs.
  - LLM adapter must not return raw provider payloads.
  - Tool executor must enforce timeout per tool.
  - HTTP tool must restrict methods, max response size, and allowed protocols.
  - Vector search must filter by `userId` before ranking.
  - Queue jobs must be idempotent by job ID or event ID.
  - Adapter modules bind tokens in one place only.
- Acceptance criteria:
  - Adapter integration tests pass with real local infrastructure or mocked provider where cost-sensitive.
  - OpenAI outage maps to `LLMUnavailableException`.
  - Tool failure maps to a tool message and does not throw out of the loop.
  - Vector search returns only records for the requested user.
- Why before next phase:
  - The agent loop needs all concrete port implementations available through DI.

### Phase 6 - Agent Loop And CQRS Handlers

- Priority: P0
- Goal: Wire the platform's core behavior end to end.
- Files:
  - `apps/api/src/application/services/agent-loop.service.ts`
  - `apps/api/src/application/services/tool-loop.service.ts`
  - `apps/api/src/application/handlers/handle-chat.command-handler.ts`
  - `apps/api/src/application/handlers/save-message.command-handler.ts`
  - `apps/api/src/application/handlers/register-tool.command-handler.ts`
  - `apps/api/src/application/handlers/index-memory.command-handler.ts`
  - `apps/api/src/application/handlers/replay-agent-event.command-handler.ts`
  - `apps/api/src/application/handlers/get-agent.query-handler.ts`
  - `apps/api/src/application/handlers/get-context.query-handler.ts`
  - `apps/api/src/application/handlers/get-conversation.query-handler.ts`
  - `apps/api/src/application/handlers/list-tools.query-handler.ts`
  - `apps/api/src/application/mappers/agent-response.mapper.ts`
  - `apps/api/src/application/mappers/message-response.mapper.ts`
  - `apps/api/src/modules/agent.module.ts`
  - `apps/api/src/modules/memory.module.ts`
  - `apps/api/src/modules/tool.module.ts`
  - `apps/api/src/modules/vector.module.ts`
- Agent loop exact order:
  - Create user `Message` from command input.
  - Load short-term context through `MemoryQueryPort`.
  - Load semantic context through `VectorSearchPort`.
  - Merge context through `ContextMergeService`.
  - Call `LLMPort.generate`.
  - If LLM returns text without tool call, create assistant `Message`.
  - If LLM returns tool call, execute through `ToolExecutorPort`.
  - Append successful tool result as `tool` message.
  - Append failed tool result as `tool` message containing normalized error content.
  - Call LLM again with updated context.
  - Repeat tool loop up to 5 iterations.
  - Throw `AgentLoopLimitException` when iteration 6 would start.
  - Save user, tool, and assistant messages through `MemoryCommandPort`.
  - Save tool execution records where applicable.
  - Publish `ToolExecutedEvent` for each tool attempt.
  - Publish `AgentResponseEvent` after response is created.
  - Publish `MemoryUpdatedEvent` after durable memory write succeeds.
- Handler responsibilities:
  - `HandleChatCommandHandler`: transaction boundary, call agent loop, save memory, publish events.
  - `SaveMessageCommandHandler`: direct message persistence for system/internal workflows.
  - `IndexMemoryCommandHandler`: create embeddings for durable semantic memory.
  - `RegisterToolCommandHandler`: validate and register tool metadata.
  - Query handlers: read only, no writes, no events.
- Production rules:
  - Never call OpenAI from handler directly.
  - Never execute tools from handler directly.
  - Never publish events before database commit.
  - Correlation ID must be passed through all loop steps.
  - Loop must record each iteration for logs and diagnostics.
  - Loop must respect request timeout and cancellation where possible.
- Acceptance criteria:
  - Unit tests cover direct LLM answer.
  - Unit tests cover one tool call then final answer.
  - Unit tests cover repeated tool calls up to max iterations.
  - Unit tests cover tool failure converted into context message.
  - Unit tests cover loop limit exception.
  - Handler tests assert events are emitted after successful use case completion.
- Why before next phase:
  - API controllers should expose a complete use case rather than implement orchestration logic.

### Phase 7 - HTTP API And Validation

- Priority: P0
- Goal: Expose validated HTTP endpoints with stable DTOs and error shapes.
- Files:
  - `apps/api/src/presentation/controllers/agent.controller.ts`
  - `apps/api/src/presentation/controllers/health.controller.ts`
  - `apps/api/src/presentation/controllers/memory.controller.ts`
  - `apps/api/src/presentation/controllers/tools.controller.ts`
  - `apps/api/src/presentation/dto/chat-response.dto.ts`
  - `apps/api/src/presentation/dto/error-response.dto.ts`
  - `apps/api/src/presentation/dto/get-context.dto.ts`
  - `apps/api/src/presentation/dto/handle-chat.dto.ts`
  - `apps/api/src/presentation/dto/message.dto.ts`
  - `apps/api/src/presentation/dto/register-tool.dto.ts`
  - `apps/api/src/presentation/mappers/http-agent.mapper.ts`
  - `apps/api/src/presentation/validators/is-json-schema.validator.ts`
  - `apps/api/src/modules/health.module.ts`
- Endpoints:
  - `POST /agents/:agentId/chat`: run agent loop for one user message.
  - `GET /agents/:agentId`: read agent details.
  - `GET /conversations/:conversationId/context`: read short-term context.
  - `GET /tools`: list available tools.
  - `POST /tools`: register tool metadata where supported.
  - `GET /health/live`: liveness check.
  - `GET /health/ready`: readiness check for DB, Redis, vector, and LLM config.
- Production rules:
  - Controllers dispatch commands and queries only.
  - DTOs use class-validator and class-transformer.
  - Error responses include `code`, `message`, `requestId`, and optional safe `details`.
  - User identity must come from auth guard or request context, not request body.
  - Apply rate limits to chat and tool endpoints.
  - Set request body size limits.
- Acceptance criteria:
  - E2E test covers happy path chat.
  - E2E test covers validation failure.
  - E2E test covers tool failure still returning assistant response.
  - Health endpoint fails readiness when database is unavailable.
- Why before next phase:
  - Workers and frontend can integrate only after stable HTTP and DTO contracts exist.

### Phase 8 - Workers, Events, And Async Processing

- Priority: P1
- Goal: Move non-request-critical work out of the request path.
- Files:
  - `apps/api/src/workers/worker.module.ts`
  - `apps/api/src/workers/bootstrap-worker.ts`
  - `apps/api/src/infrastructure/queue/processors/audit-log.processor.ts`
  - `apps/api/src/infrastructure/queue/processors/memory-index.processor.ts`
  - `apps/api/src/infrastructure/queue/processors/multi-agent.processor.ts`
  - `apps/api/src/infrastructure/events/subscribers/audit-log.subscriber.ts`
  - `apps/api/src/infrastructure/events/subscribers/memory-index.subscriber.ts`
- Implementation order:
  - Add worker bootstrap separate from HTTP server.
  - Add event subscriber that enqueues memory indexing after `MemoryUpdatedEvent`.
  - Add audit log subscriber for `ToolExecutedEvent` and `AgentResponseEvent`.
  - Add retry and dead-letter behavior for failed queue jobs.
  - Add idempotency checks for processors.
- Production rules:
  - Queue processors must be idempotent.
  - Failed jobs must retain error metadata without leaking secrets.
  - Memory indexing must not block chat response.
  - Outbox events must be replayable.
- Acceptance criteria:
  - Worker starts without HTTP server.
  - Memory indexing job can be replayed safely.
  - Dead-lettered jobs are queryable from logs or metrics.
- Why before next phase:
  - Production operations need async reliability and replay before real traffic.

### Phase 9 - Observability, Security, And Resilience

- Priority: P0 for request IDs, logs, health, timeouts; P1 for tracing, metrics dashboards, advanced rate limits.
- Goal: Make the system diagnosable and safe under failure.
- Files:
  - `apps/api/src/core/telemetry/logger.service.ts`
  - `apps/api/src/core/telemetry/metrics.service.ts`
  - `apps/api/src/core/telemetry/tracing.service.ts`
  - `apps/api/src/core/guards/api-key.guard.ts`
  - `apps/api/src/core/decorators/current-user.decorator.ts`
  - `apps/api/src/core/decorators/request-id.decorator.ts`
  - `apps/api/src/modules/observability.module.ts`
- Implementation order:
  - Add structured JSON logs with request ID, user ID, conversation ID, and agent ID.
  - Add metrics for request latency, LLM latency, tool latency, tool failures, loop iterations, token estimates, vector search latency, queue depth.
  - Add API auth guard suitable for current deployment stage.
  - Add rate limits for chat, tool execution, and registration endpoints.
  - Add graceful shutdown for Prisma and BullMQ.
  - Add provider timeouts and circuit-breaker style failure counters.
- Production rules:
  - Never log prompt content by default in production.
  - Redact API keys, bearer tokens, tool inputs marked sensitive, and provider responses.
  - Emit metrics for failures without high-cardinality labels.
  - Health readiness must check dependencies without expensive calls.
  - Use correlation IDs across HTTP, queue jobs, and events.
- Acceptance criteria:
  - Logs for one chat request can be traced across controller, handler, LLM adapter, tool executor, persistence, and event publishing.
  - Rate limit returns stable error response.
  - Shutdown closes HTTP, Prisma, Redis, and queues cleanly.
- Why before next phase:
  - The platform should be observable before load testing and deployment.

### Phase 10 - Testing Strategy

- Priority: P0 continuous, P1 broad integration coverage.
- Goal: Prove the architecture and behavior before deployment.
- Files:
  - `apps/api/test/setup-e2e.ts`
  - `apps/api/test/factories/agent.factory.ts`
  - `apps/api/test/factories/message.factory.ts`
  - `apps/api/test/factories/tool.factory.ts`
  - All test files listed in folder structure.
- Test matrix:
  - Domain unit tests: value objects, entities, policies, exceptions.
  - Application unit tests: handlers and services with mocked ports.
  - Adapter integration tests: Prisma, pgvector, Redis/BullMQ, OpenAI mapper.
  - E2E tests: HTTP validation, direct answer, tool answer, tool failure, loop limit, health.
  - Architecture tests: no forbidden imports from domain/application to infrastructure.
- Required scenarios:
  - Empty user message rejected.
  - Invalid role rejected.
  - Short-term and semantic context both loaded.
  - Context merge deduplicates messages.
  - LLM text response saved.
  - LLM tool call executes and loops.
  - Tool exception becomes context message.
  - Loop limit throws domain exception.
  - Memory updated event emitted after save.
  - Vector search filters by user ID.
  - Infrastructure outage maps to stable application/domain error.
- Acceptance criteria:
  - Unit tests pass in CI.
  - Integration tests pass with `docker-compose.test.yml`.
  - E2E tests pass from a clean database.
  - Coverage threshold is enforced for domain and application layers.

### Phase 11 - Frontend MVP

- Priority: P2 unless backend API contract needs UI validation earlier.
- Goal: Provide a simple Next.js chat UI for manual and product validation.
- Files:
  - `apps/web/package.json`
  - `apps/web/next.config.ts`
  - `apps/web/tsconfig.json`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/app/chat/page.tsx`
  - `apps/web/src/api/client.ts`
  - `apps/web/src/api/agent-api.ts`
  - `apps/web/src/components/chat/chat-panel.tsx`
  - `apps/web/src/components/chat/message-list.tsx`
  - `apps/web/src/components/chat/prompt-box.tsx`
  - `apps/web/src/lib/env.ts`
- Implementation order:
  - Add typed API client.
  - Add chat page connected to `POST /agents/:agentId/chat`.
  - Add loading, error, retry, and empty states.
  - Add conversation context viewer after backend is stable.
- Acceptance criteria:
  - User can send a message and see assistant response.
  - Validation and server errors render clearly.
  - UI does not require raw provider details.

### Phase 12 - Deployment And Operations

- Priority: P1
- Goal: Prepare for real environments.
- Files:
  - `.env.example`
  - `docker-compose.yml`
  - `docker-compose.test.yml`
  - `.github/workflows/ci.yml`
  - `.github/workflows/deploy.yml`
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
- Implementation order:
  - Add CI for install, lint, typecheck, unit tests, build.
  - Add integration test job with PostgreSQL and Redis services.
  - Add Dockerfiles for API, worker, and web.
  - Add migration deployment step.
  - Add runtime health checks.
  - Add rollback notes and migration safety rules.
- Production rules:
  - Migrations must run before new app version receives traffic.
  - Worker and API must deploy independently.
  - Secrets must come from environment or secret manager only.
  - Disable verbose prompt logging in production.
  - Pin Node and package manager versions.
- Acceptance criteria:
  - CI blocks on type, lint, tests, and build.
  - Fresh environment can start API, worker, PostgreSQL, Redis, and web.
  - Health readiness reflects dependency state.

## 6. Port Catalog

| Port | Priority | Implemented By | Purpose |
| --- | --- | --- | --- |
| `LLMPort` | P0 | `OpenAIAdapter` | Generate assistant response and normalized tool call |
| `MemoryQueryPort` | P0 | `PrismaMemoryQueryAdapter` | Load short-term conversation memory |
| `MemoryCommandPort` | P0 | `PrismaMemoryCommandAdapter` | Persist user, assistant, and tool messages |
| `VectorSearchPort` | P0 | `PgVectorSearchAdapter` | Load semantic context filtered by user |
| `VectorIndexPort` | P1 | `PgVectorIndexAdapter` | Store embeddings for semantic memory |
| `ToolExecutorPort` | P0 | `DefaultToolExecutorAdapter` | Execute one tool call safely |
| `ToolRegistryPort` | P0 | `InMemoryToolRegistryAdapter` | Resolve available tools and schemas |
| `AgentRepositoryPort` | P0 | `PrismaAgentRepository` | Persist and load agent aggregate |
| `ConversationRepositoryPort` | P0 | `PrismaConversationRepository` | Persist and load conversation aggregate |
| `EventPublisherPort` | P0 | `NestEventPublisherAdapter` | Publish application/domain events after use case completion |
| `QueuePort` | P1 | `BullMqQueueAdapter` | Enqueue async jobs |
| `RateLimiterPort` | P1 | `RedisRateLimiterAdapter` | Limit chat/tool traffic |
| `TransactionManagerPort` | P0 | `PrismaTransactionManagerAdapter` | Wrap multi-write use cases |

## 7. Agent Loop Touchpoint Map

| Step | Files | Production Requirement |
| --- | --- | --- |
| Receive command | `handle-chat.command.ts`, `handle-chat.command-handler.ts` | Validate IDs, attach correlation ID |
| Load short-term context | `context-loader.service.ts`, `memory-query.port.ts`, `prisma-memory-query.adapter.ts` | Query by user and conversation |
| Load semantic context | `context-loader.service.ts`, `vector-search.port.ts`, `pgvector-search.adapter.ts` | Filter by user before ranking |
| Merge context | `context-merge.service.ts`, `context-window.vo.ts`, `message.vo.ts` | Deduplicate and cap context size |
| Call LLM | `agent-loop.service.ts`, `llm.port.ts`, `openai.adapter.ts` | Timeout, retry, map provider errors |
| Detect tool call | `llm-response.vo.ts`, `tool-call.vo.ts`, `tool-loop.service.ts` | Validate tool name and JSON input |
| Execute tool | `tool-executor.port.ts`, `default-tool-executor.adapter.ts`, `in-memory-tool-registry.adapter.ts` | Timeout and normalize failures |
| Append tool result | `tool-result-normalizer.service.ts`, `message.vo.ts` | Convert success/failure into tool message |
| Repeat LLM call | `agent-loop.service.ts`, `tool-loop.service.ts` | Enforce max 5 tool iterations |
| Save messages | `memory-writer.service.ts`, `memory-command.port.ts`, `prisma-memory-command.adapter.ts` | Save in transaction |
| Save tool executions | `tool-execution.entity.ts`, `tool-execution.mapper.ts` | Persist status, duration, error code |
| Emit events | `event-publisher.port.ts`, `nest-event-publisher.adapter.ts` | Publish after durable save |
| Queue async work | `memory-index.subscriber.ts`, `bullmq-queue.adapter.ts` | Idempotent job IDs |

## 8. Production Readiness Checklist

- P0: strict TypeScript enabled.
- P0: all env vars validated at startup.
- P0: domain/application import boundaries enforced.
- P0: global validation pipe enabled.
- P0: global exception filters enabled.
- P0: request ID added to every request.
- P0: structured logs enabled.
- P0: OpenAI adapter behind `LLMPort`.
- P0: Prisma behind repository and memory ports.
- P0: pgvector behind vector ports.
- P0: tools behind registry and executor ports.
- P0: agent loop max iteration guard tested.
- P0: tool failure continuation tested.
- P0: health liveness and readiness endpoints.
- P0: graceful shutdown for HTTP and Prisma.
- P1: Redis/BullMQ worker bootstrap.
- P1: outbox event replay.
- P1: rate limiting.
- P1: metrics and tracing.
- P1: CI with integration services.
- P1: Docker image build.
- P2: Next.js frontend.
- P2: admin tooling for tool registry and replay.

## 9. Critical Build Order Summary

- 1. Repository baseline and Docker services.
- 2. CoreModule, ConfigModule, DI tokens, filters, validation.
- 3. Pure domain value objects, entities, services, events, exceptions.
- 4. Application ports, commands, queries, and helper services.
- 5. Prisma schema, migrations, mappers, repositories, memory adapters.
- 6. LLM, vector, tool, queue, event, and rate-limit adapters.
- 7. Agent loop service and CQRS handlers.
- 8. HTTP controllers, DTOs, guards, and health checks.
- 9. Worker bootstrap, subscribers, queue processors, outbox replay.
- 10. Observability, resilience, and security hardening.
- 11. Tests across domain, application, infrastructure, and e2e.
- 12. CI/CD, Docker images, deployment, and operational runbooks.

## 10. Non-Negotiable Architecture Rules

- Domain imports nothing from NestJS, Prisma, OpenAI, Redis, BullMQ, or infrastructure.
- Application imports domain and ports only; it never imports infrastructure adapters.
- Infrastructure implements application ports and maps all external SDK types.
- Presentation dispatches commands/queries only.
- Handlers orchestrate use cases only; business rules remain in domain services/entities.
- Events are emitted by handlers after the use case succeeds.
- No raw LLM provider response is stored or returned.
- Every external service call goes through a port.
- Tool loop is capped at 5 iterations.
- Tool errors are appended as context messages and the loop continues.
- Infinite loops, raw adapter leakage, and framework decorators in domain are release blockers.
