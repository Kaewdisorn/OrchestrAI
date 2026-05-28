import { Agent } from "../../../domain/agent.entity";

export const AGENT_REPOSITORY = Symbol("IAgentRepository");

export interface IAgentRepository {
  save(agent: Agent): Promise<void>;
  //findById(id: string): Promise<Agent | null>;
}
