import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateAgentCommand } from "./create-agent.command";
import { CreateAgentResponse } from "../create-agent.response";
import { Agent } from "../../domain/agent.entity";
import { v4 as uuidv4 } from "uuid";
import { Inject } from "@nestjs/common";
import {
  AGENT_REPOSITORY,
  IAgentRepository,
} from "../ports/outbound/agent-repository.port";

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

    console.log("Agent created with ID:", agent.id);

    return {} as CreateAgentResponse;
  }
}
