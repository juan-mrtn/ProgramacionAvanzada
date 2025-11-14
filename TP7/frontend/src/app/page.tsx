'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Transaction {
  transactionId: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  userId: string;
}

interface Event {
  id: string;
  type: string;
  version: number;
  ts: number;
  transactionId: string;
  userId: string;
  payload: any;
}

export default function Home() {
  // Creamos el socket inline (no usamos el singleton)
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  // Ref para llevar un set de event IDs ya procesados y así evitar duplicados
  const processedIdsRef = useRef<Set<string>>(new Set());
  // Ref para recordar a qué transactionId ya estamos suscriptos y evitar re-suscripciones
  const subscribedTxnRef = useRef<string | null>(null);
  const [transaction, setTransaction] = useState<Transaction>({
    transactionId: '',
    fromAccount: '',
    toAccount: '',
    amount: 0,
    currency: 'USD',
    userId: '',
  });

  useEffect(() => {
    // Conectamos la instancia singleton solo una vez desde el frontend.
    // Usamos manejadores nombrados para poder remover los listeners en el cleanup
    function onConnect() {
      setConnected(true);
      console.log('✅ Conectado al WebSocket en puerto 3001');
    }

    function onDisconnect() {
      setConnected(false);
      console.log('❌ Desconectado del WebSocket');
    }

    function onConnectError(error: any) {
      console.error('❌ Error de conexión WebSocket:', error);
      console.log('💡 Verifica que el backend esté corriendo en el puerto 3001');
    }

    function onEvent(event: Event) {
      // Debug: muestra cuántos listeners hay para 'event'
      try {
        const count = (socketRef.current as any)?.listenerCount ? (socketRef.current as any).listenerCount('event') : undefined;
        console.log('Listeners for "event":', count);
      } catch (e) {
        // listenerCount may not be available in all builds/envs
      }

      if (event && event.id) {
        if (processedIdsRef.current.has(event.id)) {
          console.log('Duplicate event ignored (frontend dedupe):', event.id);
          return;
        }
        processedIdsRef.current.add(event.id);
      }

      setEvents((prev) => [event, ...prev]);
      console.log('Received event:', event);
    }

    function onSubscribed(data: any) {
      console.log('Subscribed:', data);
    }

    // Crear el socket inline y conectarlo
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001');
    const newSocket = io(wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', onConnect);
    newSocket.on('disconnect', onDisconnect);
    newSocket.on('connect_error', onConnectError);
    newSocket.on('event', onEvent);
    newSocket.on('subscribed', onSubscribed);

    // Debug: log listener count after registration (guarded)
    try {
      const count = (socketRef.current as any)?.listenerCount ? (socketRef.current as any).listenerCount('event') : undefined;
      console.log('After registering, listeners for "event":', count);
    } catch (e) {}

    return () => {
      // Removemos listeners y desconectamos el socket al desmontar
      if (socketRef.current) {
        socketRef.current.off('connect', onConnect);
        socketRef.current.off('disconnect', onDisconnect);
        socketRef.current.off('connect_error', onConnectError);
        socketRef.current.off('event', onEvent);
        socketRef.current.off('subscribed', onSubscribed);

        try {
          const count = (socketRef.current as any)?.listenerCount ? (socketRef.current as any).listenerCount('event') : undefined;
          console.log('After cleanup, listeners for "event":', count);
        } catch (e) {}

        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction.fromAccount || !transaction.toAccount || !transaction.amount || !transaction.userId) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      // Detectar la URL de la API dinámicamente
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 
        (typeof window !== 'undefined'
          ? `http://${window.location.hostname}:3000`
          : 'http://localhost:3000');
      
      const response = await fetch(`${apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      const data = await response.json();
      const transactionId = data.transactionId;

      if (socketRef.current && transactionId) {
        // Evitar suscribir más de una vez a la misma transacción
        if (subscribedTxnRef.current !== transactionId) {
          socketRef.current.emit('subscribe', {
            transactionId,
            // NOTE: no enviamos userId para evitar doble-recepción si el backend
            // emite tanto a `txn:{id}` como a `user:{id}` y el socket está
            // unido a ambas salas.
          });
          subscribedTxnRef.current = transactionId;
          console.log('Emitted subscribe for', transactionId);
        } else {
          console.log('Already subscribed to', transactionId);
        }

        setTransaction((prev) => ({ ...prev, transactionId }));
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error al crear la transacción');
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Sistema de Eventos Bancarios</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Crear Transacción</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID
                </label>
                <input
                  type="text"
                  value={transaction.userId}
                  onChange={(e) => setTransaction({ ...transaction, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user-123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta Origen
                </label>
                <input
                  type="text"
                  value={transaction.fromAccount}
                  onChange={(e) => setTransaction({ ...transaction, fromAccount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ACC-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta Destino
                </label>
                <input
                  type="text"
                  value={transaction.toAccount}
                  onChange={(e) => setTransaction({ ...transaction, toAccount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ACC-002"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto
                </label>
                <input
                  type="number"
                  value={transaction.amount || ''}
                  onChange={(e) => setTransaction({ ...transaction, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  value={transaction.currency}
                  onChange={(e) => setTransaction({ ...transaction, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!connected}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {connected ? 'Crear Transacción' : 'Conectando...'}
              </button>
            </form>
            {transaction.transactionId && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Transaction ID:</strong> {transaction.transactionId}
                </p>
              </div>
            )}
          </div>

          {/* Eventos */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Eventos en Tiempo Real</h2>
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay eventos aún</p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-blue-600">{event.type}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(event.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-600 text-xs">
                      <p>Transaction ID: {event.transactionId}</p>
                      <p>User ID: {event.userId}</p>
                      <pre className="mt-1 text-xs bg-white p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

