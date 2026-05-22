import { Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

@Controller("agents")
export class AgentController {
  constructor() {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create() {}
}
