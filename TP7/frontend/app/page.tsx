"use client"

import { useState } from "react"
import TransactionForm from "@/components/transaction-form"
import TransactionTimeline from "@/components/transaction-timeline"
import type { Transaction } from "@/types"
import { getStatusFromEvent, getStatusBadge } from "@/lib/utils"

interface Event {
  type: string
  timestamp: string
  payload: Record<string, any>
  transactionId?: string
}

function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const handleTransactionCreated = (txId: string) => {
    const newTransaction: Transaction = {
      id: txId,
      events: [],
      status: "initiated",
      createdAt: new Date().toISOString(),
    }
    setTransactions((prev) => [newTransaction, ...prev])
    setSelectedTxId(txId)
  }

  const handleEventReceived = (txId: string, event: Event) => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? {
              ...tx,
              events: [...tx.events, event],
              status: getStatusFromEvent(event.type),
            }
          : tx,
      ),
    )
  }

  const selectedTransaction = transactions.find((tx) => tx.id === selectedTxId)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="app-header mb-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold text-foreground mb-2">Banking Transactions</h1>
                <p className="text-gray-500">Sistema basado en eventos — actualizaciones en tiempo real</p>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-400">Demo</p>
                  <p className="text-xs text-gray-500">Kafka · WebSocket · Next.js</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <TransactionForm onTransactionCreated={handleTransactionCreated} />
          </div>

          <div className="lg:col-span-2">
            {selectedTransaction ? (
              <TransactionTimeline transaction={selectedTransaction} onEventReceived={handleEventReceived} />
            ) : (
              <div className="bg-white rounded-lg border border-border p-8 text-center">
                <p className="text-gray-500">Selecciona una transacción para ver el timeline</p>
              </div>
            )}
          </div>
        </div>

        {transactions.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Transacciones Recientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition transform hover:-translate-y-0.5 hover:shadow-md ${
                    selectedTxId === tx.id ? "selected-card card" : "card"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">{tx.id.substring(0, 8)}</p>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm capitalize">{tx.status}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(tx.status).className}`}>
                      {getStatusBadge(tx.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{tx.events.length} eventos</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default Home
