import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateAgentCommand } from "./create-agent.command";
import { CreateAgentResponse } from "../create-agent.response";
import { Agent } from "../../domain/agent.entity";
import { v4 as uuidv4 } from "uuid";

@CommandHandler(CreateAgentCommand)
export class CreateAgentCommandHandler implements ICommandHandler<
  CreateAgentCommand,
  CreateAgentResponse
> {
  constructor() {}

  async execute(command: CreateAgentCommand): Promise<CreateAgentResponse> {
    const agent = Agent.create({
      id: uuidv4(),
      name: command.name,
      systemPrompt: command.systemPrompt,
    });

    return {} as CreateAgentResponse;
  }
}
