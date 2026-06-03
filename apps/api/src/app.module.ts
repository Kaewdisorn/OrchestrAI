import { Module } from "@nestjs/common";
import { AgentModule } from "./features/agent/agent.module";

@Module({
  imports: [AgentModule],
})
export class AppModule {}
