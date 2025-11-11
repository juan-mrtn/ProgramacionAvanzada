// src/orchestrator/orchestrator.consumer.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EventEnvelope, wrapEvent } from '../kafka/envelope';

@Injectable()
export class OrchestratorConsumer implements OnModuleInit {
  private readonly logger = new Logger('Orchestrator');
  constructor(@Inject('KAFKA_CLIENT') private client: ClientKafka) {}

async onModuleInit() {
  await this.client.connect();
  const consumer = this.client.createClient().consumer({ groupId: 'orchestrator-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['txn.commands'] });
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return; // ← FIX null
      try {
        const envelope: EventEnvelope = JSON.parse(message.value.toString());
        if (envelope.type !== 'txn.TransactionInitiated') return;

        const { transactionId, userId, payload } = envelope;
        this.logger.log(`Procesando ${transactionId}`);

        // Paso 1: Reservar fondos
        await this.delay(1000);
        await this.publish('txn.FundsReserved', { ok: true, holdId: `hold-${transactionId.slice(0,8)}`, amount: payload.amount }, transactionId, userId);

        // Paso 2: Fraude
        await this.delay(1000);
        const risk = Math.random() > 0.5 ? 'LOW' : 'HIGH';
        await this.publish('txn.FraudChecked', { risk }, transactionId, userId);

        if (risk === 'HIGH') {
          await this.delay(500);
          await this.publish('txn.Reversed', { reason: 'HIGH_FRAUD_RISK' }, transactionId, userId);
          await this.publish('txn.Notified', { channels: ['email', 'push'] }, transactionId, userId);
          return;
        }

        // Commit + Notify
        await this.delay(1000);
        await this.publish('txn.Committed', { ledgerTxId: `ledger-${transactionId.slice(0,8)}` }, transactionId, userId);
        await this.delay(500);
        await this.publish('txn.Notified', { channels: ['email', 'push'] }, transactionId, userId);

      } catch (err) {
        this.logger.error('DLQ', err);
        await this.client.emit('txn.dlq', message.value);
      }
    },
  });
}

private async publish(type: string, payload: any, transactionId: string, userId: string) {
  const event = wrapEvent(type, transactionId, userId, payload);
  await this.client.emit('txn.events', {
    key: transactionId,
    value: JSON.stringify(event),
  });
}

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Simulamos que tenemos contexto (en producción usarías headers)
  private async getContext(): Promise<[any, string, string]> {
    return [null, 'dummy-txn-id', 'dummy-user-id']; // se sobrescribe en real
  }
}