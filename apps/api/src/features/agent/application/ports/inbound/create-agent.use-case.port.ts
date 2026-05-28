import { CreateAgentCommand } from "../../commands/create-agent.command";
import { CreateAgentResponse } from "../../create-agent.response";

export interface ICreateAgentUseCase {
  execute(command: CreateAgentCommand): Promise<CreateAgentResponse>;
}
