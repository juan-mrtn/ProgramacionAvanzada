'use client';

import { useState } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuid } from 'uuid';

interface Event {
  type: string;
  payload: any;
}

const socket = io('http://localhost:3001', { transports: ['websocket'] });

export default function Home() {
  const [form, setForm] = useState({
    userId: '',
    fromAccount: '',
    toAccount: '',
    amount: '',
    currency: 'ARS',
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEvents([]);
    const txId = uuid();
    setTransactionId(txId);

    socket.emit('subscribe', { transactionId: txId, userId: form.userId });

    await fetch('http://localhost:3000/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, transactionId: txId }),
    });

    setLoading(false);
  };

  socket.on('event', (event: Event) => {
    setEvents(prev => [...prev, event]);
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Banking Events System</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Panel */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">New Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">User ID</label>
                <input
                  type="text"
                  required
                  value={form.userId}
                  onChange={e => setForm({ ...form, userId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 outline-none"
                  placeholder="usd-123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">From Account</label>
                  <input
                    type="text"
                    required
                    value={form.fromAccount}
                    onChange={e => setForm({ ...form, fromAccount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                    placeholder="111-111"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">To Account</label>
                  <input
                    type="text"
                    required
                    value={form.toAccount}
                    onChange={e => setForm({ ...form, toAccount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                    placeholder="222-222"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                    placeholder="1,000.00"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                  >
                    <option>ARS</option>
                    <option>USD</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Initiating...' : 'Initiate Transaction'}
              </button>
            </form>
          </div>

          {/* Timeline Panel */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Transaction Timeline</h2>
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                  <p>No events yet. Create a transaction to see the timeline.</p>
                </div>
              ) : (
                events.map((event, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {event.type.includes('FundsReserved') && <span className="text-green-500 text-2xl">Check</span>}
                      {event.type.includes('FraudChecked') && (
                        <span className={`text-2xl ${event.payload.risk === 'HIGH' ? 'text-yellow-500' : 'text-green-500'}`}>Warning</span>
                      )}
                      {event.type.includes('Committed') && <span className="text-green-500 text-2xl">Check</span>}
                      {event.type.includes('Reversed') && <span className="text-red-500 text-2xl">Cross</span>}
                      {event.type.includes('Notified') && <span className="text-blue-500 text-2xl">Bell</span>}
                    </div>
                    <div>
                      <p className="font-medium">{event.type.replace('txn.', '')}</p>
                      <p className="text-sm text-gray-400">
                        {event.payload.risk && `Risk: ${event.payload.risk}`}
                        {event.payload.reason && `Reason: ${event.payload.reason}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => window.open('http://localhost:8080', '_blank')}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View all Events
              </button>
              <button
                onClick={() => {
                  setEvents([]);
                  setTransactionId(null);
                  socket.emit('subscribe', { transactionId: null });
                }}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => socket.disconnect()}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
