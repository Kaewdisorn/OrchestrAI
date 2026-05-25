import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateAgentCommand } from "./create-agent.command";
import { CreateAgentResponse } from "../create-agent.response";

@CommandHandler(CreateAgentCommand)
export class CreateAgentCommandHandler implements ICommandHandler<
  CreateAgentCommand,
  CreateAgentResponse
> {
  constructor() {}

  async execute(command: CreateAgentCommand): Promise<CreateAgentResponse> {
    // call create agent domain
    return {} as CreateAgentResponse;
  }
}
