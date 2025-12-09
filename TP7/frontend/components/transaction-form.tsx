"use client"

import type React from "react"
import { useState } from "react"

interface TransactionFormProps {
  onTransactionCreated: (txId: string) => void
}

function TransactionForm({ onTransactionCreated }: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    fromAccount: "ACC-001",
    toAccount: "ACC-002",
    amount: "1000",
    currency: "USD",
    userId: "USER-123",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
        }),
      })

      const data = await response.json()

      if (data.success) {
        onTransactionCreated(data.transactionId)
        setFormData({
          fromAccount: "ACC-001",
          toAccount: "ACC-002",
          amount: "1000",
          currency: "USD",
          userId: "USER-123",
        })
      } else {
        setError(data.error || "Error creating transaction")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 sticky top-8">
      <h2 className="text-xl font-semibold mb-3">Nueva Transacción</h2>
      <p className="text-sm text-gray-500 mb-4">Llena los campos y presiona "Iniciar Transacción" para ver el flujo en tiempo real.</p>

      {error && <div className="bg-red-50 border border-error rounded p-3 mb-4 text-sm text-error">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Cuenta Origen</label>
          <input
            type="text"
            name="fromAccount"
            value={formData.fromAccount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cuenta Destino</label>
          <input
            type="text"
            name="toAccount"
            value={formData.toAccount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Monto</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Moneda</label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>USD</option>
            <option>EUR</option>
            <option>ARS</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">User ID</label>
          <input
            type="text"
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold py-2 rounded hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              Procesando...
            </>
          ) : (
            "Iniciar Transacción"
          )}
        </button>
      </form>
    </div>
  )
}

export default TransactionForm
