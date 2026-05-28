import { CreateAgentCommand } from "../../commands/create-agent.command";
import { CreateAgentResponse } from "../../create-agent.response";

export const CREATE_AGENT_USE_CASE = Symbol("ICreateAgentUseCase");

export interface ICreateAgentUseCase {
  execute(command: CreateAgentCommand): Promise<CreateAgentResponse>;
}
