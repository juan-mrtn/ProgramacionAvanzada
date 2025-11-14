// src/app.service.ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { wrapEvent } from './kafka/envelope';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(@Inject('KAFKA_CLIENT') private client: ClientKafka) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async initiateTransaction(dto: any) {
    // Usar transactionId del DTO si existe, sino generar uno nuevo
    const transactionId = dto.transactionId || uuid();
    
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