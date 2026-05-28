import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CreateAgentRequestDto } from "./dto/create-agent.request.dto";
import { CommandBus } from "@nestjs/cqrs";
import { CreateAgentResponseDto } from "./dto/create-agent.response.dto";
import { CreateAgentCommand } from "../application/commands/create-agent.command";
import { AgentMapper } from "./mappers/agent.mapper";

@Controller("agents")
export class AgentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateAgentRequestDto,
  ): Promise<CreateAgentResponseDto> {
    const result = await this.commandBus.execute(
      new CreateAgentCommand(body.name, body.systemPrompt),
    );

    return AgentMapper.toResponseDto(result);
  }
}
