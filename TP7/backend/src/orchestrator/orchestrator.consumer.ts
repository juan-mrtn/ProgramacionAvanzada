import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { wrapEvent } from '../kafka/envelope';

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
        if (!message.value) return;

        try {
          const envelope = JSON.parse(message.value.toString());
          if (envelope.type !== 'txn.TransactionInitiated') return;

          const { transactionId, userId, payload } = envelope;
          this.logger.log(`Procesando ${transactionId}`);

          await this.delay(1000);
          await this.publish(
            'txn.FundsReserved',
            { ok: true, holdId: `hold-${transactionId.slice(0, 8)}`, amount: payload.amount },
            transactionId,
            userId,
          );

          await this.delay(1000);
          const risk = Math.random() > 0.5 ? 'LOW' : 'HIGH';
          await this.publish('txn.FraudChecked', { risk }, transactionId, userId);

          if (risk === 'HIGH') {
            await this.delay(500);
            await this.publish('txn.Reversed', { reason: 'HIGH_FRAUD_RISK' }, transactionId, userId);
            await this.publish('txn.Notified', { channels: ['email', 'push'] }, transactionId, userId);
            return;
          }

          await this.delay(1000);
          await this.publish(
            'txn.Committed',
            { ledgerTxId: `ledger-${transactionId.slice(0, 8)}` },
            transactionId,
            userId,
          );
          await this.delay(500);
          await this.publish('txn.Notified', { channels: ['email', 'push'] }, transactionId, userId);
        } catch (err) {
          this.logger.error('DLQ', err);
          await this.client.emit('txn.dlq', message.value);
        }
      },
    });
  }

  async publish(type: string, payload: any, transactionId: string, userId: string) {
    const event = wrapEvent(type, transactionId, userId, payload);
    await this.client.emit('txn.events', {
      key: transactionId,
      value: JSON.stringify(event),
    });
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getContext() {
    return [null, 'dummy-txn-id', 'dummy-user-id'];
  }
}

