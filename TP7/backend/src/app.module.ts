import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaClientProvider } from './kafka/kafka-client';
import { OrchestratorConsumer } from './orchestrator/orchestrator.consumer';
import { EventsGateway } from './gateway/gateway';
import { HealthController } from './health.controller';

@Module({
  imports: [],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    KafkaClientProvider,
    OrchestratorConsumer,
    EventsGateway,
    
  ],
})
export class AppModule {}
