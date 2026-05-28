import { CreateAgentResponse } from "../../application/create-agent.response";
import { CreateAgentResponseDto } from "../dto/create-agent.response.dto";

export class AgentMapper {
  static toResponseDto(response: CreateAgentResponse): CreateAgentResponseDto {
    return {
      id: response.id,
      name: response.name,
      systemPrompt: response.systemPrompt,
      createdAt: response.createdAt,
    };
  }
}
