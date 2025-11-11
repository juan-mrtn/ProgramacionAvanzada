import { v4 as uuid } from 'uuid';

export interface EventEnvelope<T = any> {
  id: string;                // uuid v4
  type: string;              // ej: "txn.FundsReserved"
  version: number;           // 1
  ts: number;                // epoch ms
  transactionId: string;    // partición
  userId: string;
  payload: T;
  correlationId?: string;
}

export const wrapEvent = <T>(
  type: string,
  transactionId: string,
  userId: string,
  payload: T,
  correlationId?: string,
): EventEnvelope<T> => ({
  id: uuid(),
  type,
  version: 1,
  ts: Date.now(),
  transactionId,
  userId,
  payload,
  correlationId,
});