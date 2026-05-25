export class Agent {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly createdAt: Date;

  private constructor(props: {
    id: string;
    name: string;
    systemPrompt: string;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.systemPrompt = props.systemPrompt;
    this.createdAt = props.createdAt;
  }

  static create(props: {
    id: string;
    name: string;
    systemPrompt: string;
  }): Agent {
    if (!props.name.trim()) {
      throw new Error("Agent name must not be empty");
    }

    if (!props.systemPrompt.trim()) {
      throw new Error("Agent system prompt must not be empty");
    }

    return new Agent({ ...props, createdAt: new Date() });
  }
}
