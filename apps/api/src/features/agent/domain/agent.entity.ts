export class Agent {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly createdAt: Date;

  constructor(id: string, name: string, systemPrompt: string, createdAt: Date) {
    this.id = id;
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.createdAt = createdAt;
  }
}
