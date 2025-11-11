// src/kafka/kafka-client.ts
import { ClientKafka } from '@nestjs/microservices';

export const KafkaClientProvider = {
  provide: 'KAFKA_CLIENT',
  useFactory: () => {
    return new ClientKafka({
      client: {
        clientId: 'banking-app',
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
        retry: { retries: 5 },
      },
    });
  },
};