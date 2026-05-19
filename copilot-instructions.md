# OrchestrAI — Copilot Instructions

## Overview

AI Agent Orchestration Platform.

- Architecture: Clean + Hexagonal + CQRS + DDD Light + Event-driven
- LLM = decision engine | Tools = execution layer | Memory = context layer

---

## Tech Stack

| Layer    | Tech                      |
| -------- | ------------------------- |
| Frontend | Next.js (App Router, TS)  |
| Backend  | NestJS (TS)               |
| DB       | PostgreSQL + Prisma       |
| Vector   | pgvector                  |
| LLM      | OpenAI (via adapter only) |
| Queue    | Redis + BullMQ            |

> Access ALL external services via Ports. Adapters must be replaceable.

---

## Architecture Flow

```
Controller → Handler (UseCase) → Domain → Ports → Adapters
```

- ❌ No OpenAI/Prisma in domain or application layer
- ✅ Interfaces (ports) + DI only

---

## Folder Structure

```
api/src/
  presentation/     # controllers, dto (validate here with class-validator)
  application/      # commands, queries, ports
  domain/           # entities, value-objects, services, events
  infrastructure/   # llm, persistence, vector, queue, tool adapters
  modules/
  workers/
```

---

## CQRS

- Command = write → `XCommand` + `XCommandHandler`
- Query = read → `XQuery` + `XQueryHandler`
- Handlers **orchestrate only** — no business logic inside

---

## Domain (DDD Light)

```ts
// Entity
class Agent { static create(...) {} }

// Value Object (immutable)
class Message { readonly role: 'user'|'assistant'|'tool'; readonly content: string }
```

- No framework, no side effects, business logic lives here

---

## Key Types

```ts
type Message = { role: "user" | "assistant" | "tool"; content: string };
type LLMResponse = { text: string; toolCall?: { name: string; input: any } };
type Tool = {
  name: string;
  description: string;
  inputSchema: any;
  handler: (input: any) => Promise<any>;
};
type ToolCall = { name: string; input: any };
```

---

## Ports (application layer)

```ts
interface LLMPort {
  generate(input: {
    message: string;
    context: Message[];
  }): Promise<LLMResponse>;
}
interface MemoryQueryPort {
  getContext(userId: string): Promise<Message[]>;
}
interface MemoryCommandPort {
  saveMessage(userId: string, msg: Message): Promise<void>;
}
interface VectorSearchPort {
  search(query: string, userId: string): Promise<Message[]>;
}
interface ToolExecutorPort {
  execute(call: ToolCall): Promise<Message>;
}
```

---

## Agent Loop (CORE — always follow this)

```
1. load context     → MemoryQueryPort + VectorSearchPort
2. call LLM         → LLMPort.generate()
3. if toolCall:
   a. execute tool  → ToolExecutorPort.execute()
   b. append result to context
   c. call LLM again (max 5 iterations — throw AgentLoopLimitException if exceeded)
4. save messages    → MemoryCommandPort.saveMessage()
5. emit event       → MemoryUpdatedEvent (from handler, after use case completes)
```

---

## Memory

| Type       | Port                | When          |
| ---------- | ------------------- | ------------- |
| Short-term | `MemoryQueryPort`   | Step 1 always |
| Semantic   | `VectorSearchPort`  | Step 1 always |
| Persist    | `MemoryCommandPort` | Step 4 always |

---

## Error Handling

- Use domain exceptions: `LLMUnavailableException`, `ToolExecutionException`, `AgentLoopLimitException`
- Infrastructure errors must NOT bubble into domain
- Tool failure → append error message to context, continue loop (don't throw)

---

## Events

- Emitted by **handler** after use case completes (not inside domain)
- Examples: `MemoryUpdatedEvent`, `ToolExecutedEvent`, `AgentResponseEvent`
- Use for: async processing, multi-agent workflows, audit logs

---

## Testing

| Scope    | Strategy                      |
| -------- | ----------------------------- |
| Domain   | Unit test — no mocks needed   |
| Handlers | Unit test — mock ports only   |
| Adapters | Integration test — real infra |

---

## Naming

| Type    | Pattern                        | Example                  |
| ------- | ------------------------------ | ------------------------ |
| Command | `XCommand` + `XCommandHandler` | `HandleChatCommand`      |
| Query   | `XQuery` + `XQueryHandler`     | `GetContextQuery`        |
| Port    | `XPort`                        | `LLMPort`                |
| Adapter | `XAdapter`                     | `OpenAIAdapter`          |
| File    | kebab-case                     | `handle-chat.command.ts` |

---

## DO / DON'T

✅ Ports for all external calls | Thin handlers | Pure domain | DI everywhere | Map LLM response before returning
❌ OpenAI in handlers | Business logic in controllers | Mix command/query | Raw LLM response stored | Infinite tool loops
