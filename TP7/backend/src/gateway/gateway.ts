// src/gateway/gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit, Logger } from '@nestjs/common';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { EventEnvelope } from '../kafka/envelope';

interface SubscribeDto {
  transactionId?: string;
  userId?: string;
}

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class EventsGateway implements OnModuleInit, OnGatewayInit {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger('GatewayWS');

  constructor(@Inject('KAFKA_CLIENT') private client: ClientKafka) {}
    afterInit(server: Server) {
    this.logger.log('WebSocket Gateway inicializado en puerto 3001');
    }

  async onModuleInit() {
    await this.client.subscribeToResponseOf('txn.events');
    await this.client.connect();

    this.client.consumer?.subscribe({ topics: ['txn.events'] });
    await this.client.consumer?.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          this.logger.warn('Received message with null value');
          return;
        }
        const envelope: EventEnvelope = JSON.parse(message.value.toString());
        const { transactionId, userId } = envelope;

        // Enviar a todos los clientes suscriptos a ese transactionId o userId
        this.server.to(`txn:${transactionId}`).emit('event', envelope);
        this.server.to(`user:${userId}`).emit('event', envelope);
        this.logger.log(`Push WS → txn:${transactionId} (${envelope.type})`);
      },
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: SubscribeDto,
    @ConnectedSocket() client: Socket,
  ) {
    if (data.transactionId) client.join(`txn:${data.transactionId}`);
    if (data.userId) client.join(`user:${data.userId}`);
    this.logger.log(`Cliente suscrito a txn:${data.transactionId} user:${data.userId}`);
    client.emit('subscribed', { ok: true });
  }
}