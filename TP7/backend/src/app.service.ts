// src/app.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { wrapEvent } from './kafka/envelope';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AppService {
  constructor(@Inject('KAFKA_CLIENT') private client: ClientKafka) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async initiateTransaction(dto: any) {
    const transactionId = uuid();
    const event = wrapEvent(
      'txn.TransactionInitiated',
      transactionId,
      dto.userId,
      { ...dto, transactionId },
    );

    await this.client.emit('txn.commands', {
      key: transactionId,
      value: JSON.stringify(event),
    });

    return { transactionId, status: 'INITIATED' };
  }
}