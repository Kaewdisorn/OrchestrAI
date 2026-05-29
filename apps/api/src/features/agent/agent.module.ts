import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { AgentController } from "./presentation/agent.controller";
import { CreateAgentCommandHandler } from "./application/commands/create-agent.command-handler";
import { CreateAgentService } from "./application/create-agent.service";
import { PrismaService } from "./infrastructure/persistence/prisma.service";
import { AGENT_REPOSITORY } from "./application/ports/outbound/agent-repository.port";
import { CREATE_AGENT_USE_CASE } from "./application/ports/inbound/create-agent.use-case.port";
import { PrismaAgentRepository } from "./infrastructure/persistence/prisma-agent.repository";

@Module({
  imports: [CqrsModule],
  controllers: [AgentController],
  providers: [
    CreateAgentCommandHandler,
    CreateAgentService,
    PrismaService,
    { provide: AGENT_REPOSITORY, useClass: PrismaAgentRepository },
    { provide: CREATE_AGENT_USE_CASE, useClass: CreateAgentService },
  ],
})
export class AgentModule {}
