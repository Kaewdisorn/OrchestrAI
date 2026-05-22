# Slice 1 — Create an Agent

**Goal:** A user can POST to `/agents`, provide a name and system prompt, and the agent is persisted to PostgreSQL.

**Done when:** E2E test passes and the agent row appears in the database.

---

## Files to create

```
apps/api/
  prisma/
    schema.prisma                                     ← add Agent model
  src/
    features/
      agent/
        domain/
          agent.entity.ts                             ← plain Agent class, no framework
        application/
          ports/
            agent-repository.port.ts                  ← IAgentRepository interface + DI token
          commands/
            create-agent.command.ts                   ← intent data object (CQRS write side)
            create-agent.command-handler.ts           ← orchestrates domain + repo via port
          create-agent.response.ts                    ← output shape (plain interface)
        infrastructure/
          persistence/
            prisma.service.ts                         ← Prisma client wrapper
            prisma-agent.repository.ts                ← adapter: implements IAgentRepository
        presentation/
          dto/
            create-agent.request.dto.ts               ← HTTP request DTO (class-validator)
            create-agent.response.dto.ts              ← HTTP response DTO
          agent.controller.ts                         ← POST /agents, dispatches command
          agent.module.ts                             ← wires everything, binds port token
    app.module.ts                                     ← import AgentModule
  test/
    agent.e2e-spec.ts                                 ← E2E test
```

---

## Step 1 — Prisma Schema

**File:** `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Agent {
  id           String   @id @default(uuid())
  name         String
  systemPrompt String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("agents")
}
```

**Run migration:**

```bash
cd apps/api
npx prisma migrate dev --name create-agents-table
npx prisma generate
```

---

## Step 2 — Domain Entity

**File:** `apps/api/src/features/agent/domain/agent.entity.ts`

No NestJS. No Prisma. Just a plain class with a static factory method.

```typescript
export class Agent {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly createdAt: Date;

  private constructor(props: {
    id: string;
    name: string;
    systemPrompt: string;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.systemPrompt = props.systemPrompt;
    this.createdAt = props.createdAt;
  }

  static create(props: {
    id: string;
    name: string;
    systemPrompt: string;
  }): Agent {
    if (!props.name.trim()) {
      throw new Error("Agent name must not be empty");
    }
    if (!props.systemPrompt.trim()) {
      throw new Error("Agent system prompt must not be empty");
    }
    return new Agent({ ...props, createdAt: new Date() });
  }

  static reconstitute(props: {
    id: string;
    name: string;
    systemPrompt: string;
    createdAt: Date;
  }): Agent {
    return new Agent(props);
  }
}
```

---

## Step 3 — Prisma Service

**File:** `apps/api/src/features/agent/infrastructure/persistence/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

---

## Step 4 — Repository Port

**File:** `apps/api/src/features/agent/application/ports/agent-repository.port.ts`

No framework. The application layer depends on this interface, never on Prisma directly.

```typescript
import { Agent } from "../../domain/agent.entity";

export const AGENT_REPOSITORY = Symbol("IAgentRepository");

export interface IAgentRepository {
  save(agent: Agent): Promise<void>;
  findById(id: string): Promise<Agent | null>;
}
```

---

## Step 5 — Prisma Repository Adapter

**File:** `apps/api/src/features/agent/infrastructure/persistence/prisma-agent.repository.ts`

Implements `IAgentRepository`. The only file that knows about Prisma's shape.

```typescript
import { Injectable } from "@nestjs/common";
import { Agent } from "../../domain/agent.entity";
import { IAgentRepository } from "../../application/ports/agent-repository.port";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaAgentRepository implements IAgentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agent: Agent): Promise<void> {
    await this.prisma.agent.create({
      data: {
        id: agent.id,
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        createdAt: agent.createdAt,
      },
    });
  }

  async findById(id: string): Promise<Agent | null> {
    const row = await this.prisma.agent.findUnique({ where: { id } });
    if (!row) return null;
    return Agent.reconstitute({
      id: row.id,
      name: row.name,
      systemPrompt: row.systemPrompt,
      createdAt: row.createdAt,
    });
  }
}
```

---

## Step 6 — Command & Handler

> **Install:** `pnpm --filter api add @nestjs/cqrs`

### Command

**File:** `apps/api/src/features/agent/application/commands/create-agent.command.ts`

```typescript
export class CreateAgentCommand {
  constructor(
    public readonly name: string,
    public readonly systemPrompt: string,
  ) {}
}
```

### Response shape

**File:** `apps/api/src/features/agent/application/create-agent.response.ts`

```typescript
export interface CreateAgentResponse {
  id: string;
  name: string;
  systemPrompt: string;
  createdAt: string;
}
```

### Command Handler

**File:** `apps/api/src/features/agent/application/commands/create-agent.command-handler.ts`

```typescript
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Agent } from "../../domain/agent.entity";
import {
  IAgentRepository,
  AGENT_REPOSITORY,
} from "../ports/agent-repository.port";
import { CreateAgentCommand } from "./create-agent.command";
import { CreateAgentResponse } from "../create-agent.response";

@CommandHandler(CreateAgentCommand)
export class CreateAgentCommandHandler implements ICommandHandler<
  CreateAgentCommand,
  CreateAgentResponse
> {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepository: IAgentRepository,
  ) {}

  async execute(command: CreateAgentCommand): Promise<CreateAgentResponse> {
    const agent = Agent.create({
      id: uuidv4(),
      name: command.name,
      systemPrompt: command.systemPrompt,
    });

    await this.agentRepository.save(agent);

    return {
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.systemPrompt,
      createdAt: agent.createdAt.toISOString(),
    };
  }
}
```

---

## Step 7 — HTTP DTOs

**File:** `apps/api/src/features/agent/presentation/dto/create-agent.request.dto.ts`

```typescript
import { IsNotEmpty, IsString } from "class-validator";

export class CreateAgentRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  systemPrompt!: string;
}
```

**File:** `apps/api/src/features/agent/presentation/dto/create-agent.response.dto.ts`

```typescript
export class CreateAgentResponseDto {
  id!: string;
  name!: string;
  systemPrompt!: string;
  createdAt!: string;
}
```

---

## Step 8 — HTTP Controller

**File:** `apps/api/src/features/agent/presentation/agent.controller.ts`

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CreateAgentCommand } from "../application/commands/create-agent.command";
import { CreateAgentRequestDto } from "./dto/create-agent.request.dto";
import { CreateAgentResponseDto } from "./dto/create-agent.response.dto";

@Controller("agents")
export class AgentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateAgentRequestDto,
  ): Promise<CreateAgentResponseDto> {
    return this.commandBus.execute(
      new CreateAgentCommand(body.name, body.systemPrompt),
    );
  }
}
```

---

## Step 9 — Module

**File:** `apps/api/src/features/agent/presentation/agent.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { AgentController } from "./agent.controller";
import { CreateAgentCommandHandler } from "../application/commands/create-agent.command-handler";
import { PrismaAgentRepository } from "../infrastructure/persistence/prisma-agent.repository";
import { PrismaService } from "../infrastructure/persistence/prisma.service";
import { AGENT_REPOSITORY } from "../application/ports/agent-repository.port";

@Module({
  imports: [CqrsModule],
  controllers: [AgentController],
  providers: [
    CreateAgentCommandHandler,
    PrismaService,
    { provide: AGENT_REPOSITORY, useClass: PrismaAgentRepository },
  ],
})
export class AgentModule {}
```

**File:** `apps/api/src/app.module.ts` — import `AgentModule`

```typescript
import { Module } from "@nestjs/common";
import { AgentModule } from "./features/agent/presentation/agent.module";

@Module({
  imports: [AgentModule],
})
export class AppModule {}
```

---

## Step 10 — Enable Global Validation Pipe

**File:** `apps/api/src/main.ts`

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

---

## Step 11 — Tests

### Unit test — Command Handler

**File:** `apps/api/src/features/agent/application/commands/create-agent.command-handler.spec.ts`

```typescript
import { CreateAgentCommandHandler } from "./create-agent.command-handler";
import { CreateAgentCommand } from "./create-agent.command";
import { IAgentRepository } from "../ports/agent-repository.port";

const mockRepo: jest.Mocked<IAgentRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
};

describe("CreateAgentCommandHandler", () => {
  let handler: CreateAgentCommandHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new CreateAgentCommandHandler(mockRepo);
  });

  it("saves the agent and returns it", async () => {
    const result = await handler.execute(
      new CreateAgentCommand("Test Agent", "You are helpful."),
    );

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("Test Agent");
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it("throws when name is empty", async () => {
    await expect(
      handler.execute(new CreateAgentCommand("", "You are helpful.")),
    ).rejects.toThrow("Agent name must not be empty");
  });

  it("throws when system prompt is empty", async () => {
    await expect(
      handler.execute(new CreateAgentCommand("Agent", "   ")),
    ).rejects.toThrow("Agent system prompt must not be empty");
  });
});
```

### Unit test — Domain Entity

**File:** `apps/api/src/features/agent/domain/agent.entity.spec.ts`

```typescript
import { Agent } from "./agent.entity";

describe("Agent.create", () => {
  it("creates a valid agent", () => {
    const agent = Agent.create({
      id: "1",
      name: "Bot",
      systemPrompt: "Be helpful.",
    });
    expect(agent.name).toBe("Bot");
    expect(agent.createdAt).toBeInstanceOf(Date);
  });

  it("rejects empty name", () => {
    expect(() =>
      Agent.create({ id: "1", name: "  ", systemPrompt: "ok" }),
    ).toThrow("Agent name must not be empty");
  });
});
```

### Integration test — Repository

**File:** `apps/api/src/features/agent/infrastructure/persistence/prisma-agent.repository.int-spec.ts`

> Requires `DATABASE_URL` pointing at a real (test) database.

```typescript
import { PrismaService } from "./prisma.service";
import { PrismaAgentRepository } from "./prisma-agent.repository";
import { Agent } from "../../domain/agent.entity";
import { v4 as uuidv4 } from "uuid";

describe("PrismaAgentRepository (integration)", () => {
  let prisma: PrismaService;
  let repo: PrismaAgentRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaAgentRepository(prisma);
  });

  afterAll(async () => {
    await prisma.agent.deleteMany();
    await prisma.onModuleDestroy();
  });

  it("saves and retrieves an agent", async () => {
    const agent = Agent.create({
      id: uuidv4(),
      name: "IntBot",
      systemPrompt: "Hello.",
    });
    await repo.save(agent);

    const found = await repo.findById(agent.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("IntBot");
  });

  it("returns null for unknown id", async () => {
    const found = await repo.findById("00000000-0000-0000-0000-000000000000");
    expect(found).toBeNull();
  });
});
```

### E2E test

**File:** `apps/api/test/agent.e2e-spec.ts`

```typescript
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("POST /agents (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an agent and returns 201", async () => {
    const res = await request(app.getHttpServer())
      .post("/agents")
      .send({ name: "E2E Agent", systemPrompt: "You are a test agent." })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("E2E Agent");
    expect(res.body.createdAt).toBeDefined();
  });

  it("returns 400 when name is missing", async () => {
    await request(app.getHttpServer())
      .post("/agents")
      .send({ systemPrompt: "Missing name." })
      .expect(400);
  });

  it("returns 400 when systemPrompt is missing", async () => {
    await request(app.getHttpServer())
      .post("/agents")
      .send({ name: "No prompt" })
      .expect(400);
  });
});
```

---

## Run the tests

```bash
# Unit tests
cd apps/api
pnpm test

# Integration tests (needs DATABASE_URL set)
pnpm test:int

# E2E tests (needs DATABASE_URL set, app starts in-process)
pnpm test:e2e
```

---

## Checklist

- [ ] `prisma migrate dev` runs without error
- [ ] `Agent.create` rejects empty name and empty system prompt
- [ ] `AgentRepository.save` writes a row; `findById` retrieves it
- [ ] `POST /agents` with valid body returns `201` + `{ id, name, systemPrompt, createdAt }`
- [ ] `POST /agents` with missing field returns `400`
- [ ] All three test levels (unit, integration, E2E) pass
