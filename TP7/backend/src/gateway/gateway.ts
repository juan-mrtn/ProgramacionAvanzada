import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class EventsGateway implements OnGatewayInit, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('GatewayWS');

  constructor(@Inject('KAFKA_CLIENT') private client: ClientKafka) { }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway inicializado en puerto 3001');
  }

  async onModuleInit() {
    await this.client.connect();

    // Crear un consumer separado para escuchar eventos de txn.events
    const consumer = this.client.createClient().consumer({ groupId: 'gateway-group' });
    await consumer.connect();
    await consumer.subscribe({ topics: ['txn.events'] });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          this.logger.warn('Received message with null value');
          return;
        }

        const envelope = JSON.parse(message.value.toString());
        const { transactionId, userId } = envelope;

        // Emit once to the transaction room. Emitting to both txn:{id} and
        // user:{id} caused clients subscribed to both rooms to receive
        // duplicate deliveries. Clients can subscribe to whichever room they
        // need; server will publish to txn:{transactionId} only to avoid
        // duplicate emissions.
        this.server.to(`txn:${transactionId}`).emit('event', envelope);
        this.logger.log(`Push WS → txn:${transactionId} (${envelope.type})`);
      },
    });
  }

  /**
   * Handle subscription requests from clients.
   * Clients join Socket.io rooms based on transactionId to receive events
   * specific to their transaction. The server emits only to txn:{transactionId}
   * rooms to avoid duplicate deliveries (see onModuleInit where we emit only once).
   *
   * NOTE: userId room joins are not used by the server (no emissions to user:{userId}).
   * If you need per-user notifications in the future, add a separate emission path
   * or modify onModuleInit to emit to both rooms with proper deduplication.
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { transactionId?: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.transactionId) {
      client.join(`txn:${data.transactionId}`);
      this.logger.log(`Client ${client.id} joined room txn:${data.transactionId}`);
    } else {
      this.logger.warn('Subscribe message missing transactionId');
    }

    client.emit('subscribed', { ok: true });
  }
}

