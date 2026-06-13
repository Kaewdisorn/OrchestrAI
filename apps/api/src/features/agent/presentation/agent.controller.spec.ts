import { CreateAgentCommand } from "../application/commands/create-agent.command";
import { ICreateAgentUseCase } from "../application/ports/inbound/create-agent.use-case.port";
import { AgentController } from "./agent.controller";
import { CreateAgentRequestDto } from "./dto/create-agent.request.dto";

const mockUseCase: jest.Mocked<ICreateAgentUseCase> = {
  execute: jest.fn(),
};

describe("AgentController", () => {
    let controller: AgentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AgentController(mockUseCase);
  });

    it("calls use case with correct arguments and maps the response", async () => {
    const dto: CreateAgentRequestDto = {
      name: "Test Agent",
      systemPrompt: "You are helpful.",
    };

    const useCaseResponse = {
      id: "some-uuid",
      name: dto.name,
      systemPrompt: dto.systemPrompt,
      createdAt: new Date().toISOString(),
    };
    
    mockUseCase.execute.mockResolvedValue(useCaseResponse);

    const result = await controller.create(dto);

    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    expect(mockUseCase.execute).toHaveBeenCalledWith(
      new CreateAgentCommand(dto.name, dto.systemPrompt),
    );

    expect(result).toEqual(useCaseResponse);

  });
  
});
