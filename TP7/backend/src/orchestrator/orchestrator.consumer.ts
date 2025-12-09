import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { wrapEvent } from '../kafka/envelope';

@Injectable()
export class OrchestratorConsumer implements OnModuleInit {
  private readonly logger = new Logger('Orchestrator');

  // In-memory stores for idempotency and transaction state tracking.
  // NOTE: These are simple fallbacks for demo purposes. In production you
  // should persist transaction state by `transactionId` in a durable store
  // (e.g. Postgres/Mongo/Redis) or use a `processed_events` table to record
  // processed event IDs. That persistent store must be consulted before
  // executing each step to guarantee idempotency across restarts/rebalances.
  private processedEventIds = new Set<string>();
  private txnState = new Map<string, string>();

  // Helper: Store fraud risk decision per transaction (in-memory).
  // In production, persist this in the transactions table or as metadata
  // in the processed_events table so it survives restarts.
  private riskCache = new Map<string, string>();

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

          // If this transaction already reached or passed the FUNDS_RESERVED
          // state, skip this step. This avoids duplicating the FundsReserved
          // event on consumer retries or duplicate deliveries.
          if (this.isStepDone(transactionId, 'FUNDS_RESERVED')) {
            this.logger.log(`Skipping FundsReserved for ${transactionId}, already processed`);
          } else {
            await this.delay(1000);
            await this.publish(
              'txn.FundsReserved',
              { ok: true, holdId: `hold-${transactionId.slice(0, 8)}`, amount: payload.amount },
              transactionId,
              userId,
            );
          }

          // Fraud check step. Skip if already executed.
          let riskDecision = 'LOW';
          if (this.isStepDone(transactionId, 'FRAUD_CHECKED')) {
            this.logger.log(`Skipping FraudChecked for ${transactionId}, already processed`);
            // Retrieve the risk decision from state if needed; for now assume LOW if already done.
            // In production, store and retrieve the fraud result from DB/event store.
            riskDecision = this.getTxnRisk(transactionId) || 'LOW';
          } else {
            await this.delay(1000);
            riskDecision = Math.random() > 0.5 ? 'LOW' : 'HIGH';
            await this.publish('txn.FraudChecked', { risk: riskDecision }, transactionId, userId);
            // Store the risk decision for later retrieval in case of replay
            this.setTxnRisk(transactionId, riskDecision);
          }

          if (riskDecision === 'HIGH') {
            if (!this.isStepDone(transactionId, 'REVERSED')) {
              await this.delay(500);
              await this.publish('txn.Reversed', { reason: 'HIGH_FRAUD_RISK' }, transactionId, userId);
            } else {
              this.logger.log(`Skipping Reversed for ${transactionId}, already processed`);
            }

            if (!this.isStepDone(transactionId, 'NOTIFIED')) {
              await this.publish('txn.Notified', { channels: ['email', 'push'] }, transactionId, userId);
            } else {
              this.logger.log(`Skipping Notified for ${transactionId}, already processed`);
            }

            return;
          }

          // Commit path (LOW risk)
          if (!this.isStepDone(transactionId, 'COMMITTED')) {
            await this.delay(1000);
            await this.publish(
              'txn.Committed',
              { ledgerTxId: `ledger-${transactionId.slice(0, 8)}` },
              transactionId,
              userId,
            );
          } else {
            this.logger.log(`Skipping Committed for ${transactionId}, already processed`);
          }

          if (!this.isStepDone(transactionId, 'NOTIFIED')) {
            await this.delay(500);
            await this.publish('txn.Notified', { channels: ['email', 'push'] }, transactionId, userId);
          } else {
            this.logger.log(`Skipping Notified for ${transactionId}, already processed`);
          }
        } catch (err) {
          this.logger.error('DLQ', err);
          await this.client.emit('txn.dlq', message.value);
        }
      },
    });
  }

  async publish(type: string, payload: any, transactionId: string, userId: string) {
    // Build the event envelope
    const event = wrapEvent(type, transactionId, userId, payload);

    // Idempotency: avoid re-publishing the same event ID.
    // In production this check should consult a durable `processed_events`
    // table keyed by event.id. Here we use an in-memory Set as a fallback.
    if (this.processedEventIds.has(event.id)) {
      this.logger.log(`Event ${event.id} already processed, skipping publish`);
      return;
    }

    try {
      await this.client.emit('txn.events', {
        key: transactionId,
        value: JSON.stringify(event),
      });

      // Mark event as processed (in-memory). Replace this with a DB insert
      // into `processed_events` for production durability.
      this.processedEventIds.add(event.id);

      // Update transaction state machine. Persist this in DB in production.
      switch (type) {
        case 'txn.FundsReserved':
          this.txnState.set(transactionId, 'FUNDS_RESERVED');
          break;
        case 'txn.FraudChecked':
          this.txnState.set(transactionId, 'FRAUD_CHECKED');
          break;
        case 'txn.Committed':
          this.txnState.set(transactionId, 'COMMITTED');
          break;
        case 'txn.Reversed':
          this.txnState.set(transactionId, 'REVERSED');
          break;
        case 'txn.Notified':
          this.txnState.set(transactionId, 'NOTIFIED');
          break;
        case 'txn.TransactionInitiated':
          this.txnState.set(transactionId, 'INITIATED');
          break;
        default:
          break;
      }
    } catch (err) {
      // Bubble up so the caller can route to DLQ if necessary.
      this.logger.error(`Failed to publish ${type} for ${transactionId}`, err as any);
      throw err;
    }
  }

  // Helper: check whether a given transactional step has already been
  // executed for transactionId. Compares positions in a simple ordered list
  // of states. Replace with a durable read from your transactions table.
  private isStepDone(transactionId: string, step: string) {
    const order = ['INITIATED', 'FUNDS_RESERVED', 'FRAUD_CHECKED', 'COMMITTED', 'REVERSED', 'NOTIFIED'];
    const current = this.txnState.get(transactionId);
    if (!current) return false;
    return order.indexOf(current) >= order.indexOf(step);
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getContext() {
    return [null, 'dummy-txn-id', 'dummy-user-id'];
  }

  private setTxnRisk(transactionId: string, risk: string) {
    this.riskCache.set(transactionId, risk);
  }

  private getTxnRisk(transactionId: string): string | undefined {
    return this.riskCache.get(transactionId);
  }
}

