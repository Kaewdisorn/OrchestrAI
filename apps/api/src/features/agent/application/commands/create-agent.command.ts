export class CreateAgentCommand {
  constructor(
    public readonly name: string,
    public readonly systemPrompt: string,
  ) {}
}
