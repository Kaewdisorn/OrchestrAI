import { Injectable } from "@nestjs/common";
import { ICreateAgentUseCase } from "./ports/inbound/create-agent.use-case.port";
import { CommandBus } from "@nestjs/cqrs";
import { CreateAgentCommand } from "./commands/create-agent.command";
import { CreateAgentResponse } from "./create-agent.response";

@Injectable()
export class CreateAgentService implements ICreateAgentUseCase {
  constructor(private readonly commandBus: CommandBus) {}

  async execute(command: CreateAgentCommand): Promise<CreateAgentResponse> {
    return this.commandBus.execute(command);
  }
}
