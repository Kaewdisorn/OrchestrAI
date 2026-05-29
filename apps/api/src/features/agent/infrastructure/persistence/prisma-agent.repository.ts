import { Injectable } from "@nestjs/common";
import { IAgentRepository } from "../../application/ports/outbound/agent-repository.port";
import { PrismaService } from "./prisma.service";
import { Agent } from "../../domain/agent.entity";

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
}
