import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from "@nestjs/common";
import { CreateAgentRequestDto } from "./dto/create-agent.request.dto";
import { CreateAgentResponseDto } from "./dto/create-agent.response.dto";
import { CreateAgentCommand } from "../application/commands/create-agent.command";
import { AgentMapper } from "./mappers/agent.mapper";
import {
  CREATE_AGENT_USE_CASE,
  ICreateAgentUseCase,
} from "../application/ports/inbound/create-agent.use-case.port";

@Controller("agents")
export class AgentController {
  constructor(
    @Inject(CREATE_AGENT_USE_CASE)
    private readonly createAgentUseCase: ICreateAgentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateAgentRequestDto,
  ): Promise<CreateAgentResponseDto> {
    const result = await this.createAgentUseCase.execute(
      new CreateAgentCommand(body.name, body.systemPrompt),
    );

    return AgentMapper.toResponseDto(result);
  }
}
