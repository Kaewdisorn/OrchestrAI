import { IsNotEmpty, IsString } from "class-validator";

export class CreateAgentRequestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  systemPrompt!: string;
}
