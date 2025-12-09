"use client"

import { useEffect, useState, useRef } from "react"
import type { Transaction, Event } from "@/types"

const EVENT_ICONS: Record<string, string> = {
  TransactionInitiated: "📝",
  FundsReserved: "💰",
  FraudDetected: "🚨",
  FraudChecked: "🛡️",
  Committed: "✅",
  Reversed: "❌",
  Notified: "📧",
}

const EVENT_COLORS: Record<string, string> = {
  TransactionInitiated: "bg-blue-50 border-blue-200",
  FundsReserved: "bg-yellow-50 border-yellow-200",
  FraudDetected: "bg-red-50 border-red-200",
  FraudChecked: "bg-purple-50 border-purple-200",
  Committed: "bg-green-50 border-green-200",
  Reversed: "bg-red-50 border-red-200",
  Notified: "bg-indigo-50 border-indigo-200",
}

interface TransactionTimelineProps {
  transaction: Transaction
  onEventReceived: (txId: string, event: Event) => void
}

function TransactionTimeline({ transaction, onEventReceived }: TransactionTimelineProps) {
  // Usamos useRef para que la conexión sobreviva a los re-renderizados de React Strict Mode
  const socketRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  // Efecto 1: Conectarse al gateway una sola vez (cuando el componente monta)
  useEffect(() => {
    // Si ya existe una conexión activa, no hacer nada
    if (socketRef.current?.readyState === 1) {
      return
    }

    // 1. Crear la conexión al puerto 3002 (Gateway) — SOLO UNA VEZ
    const socket = new WebSocket("ws://localhost:3002")
    socketRef.current = socket

    socket.onopen = () => {
      console.log("[Frontend] Connected to Gateway")
      setConnected(true)
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        // Ignore subscription confirmation
        if (message.type === "subscribed") return

        // Process messages for ANY transaction (not just the current one)
        if (message.transactionId) {
          console.log("[Frontend] Event received:", message)

          const normalized = {
            type: message.type,
            timestamp: message.timestamp || new Date().toISOString(),
            payload: message.payload || {},
            transactionId: message.transactionId,
          }

          onEventReceived(message.transactionId, normalized)
        }
      } catch (e) {
        console.error("Error parsing WS message", e)
      }
    }

    socket.onerror = (error) => {
      console.error("[Frontend] WebSocket error. Verify Gateway is running on port 3002.", error)
      setConnected(false)
    }

    socket.onclose = () => {
      console.log("[Frontend] WebSocket disconnected")
      setConnected(false)
      socketRef.current = null
    }

    // Cleanup: solo cerramos si el componente se desmonta
    return () => {
      if (socket.readyState === 1) {
        socket.close()
      }
    }
  }, []) // Array vacío: SOLO se ejecuta una vez al montar

  // Efecto 2: Suscribirse a la transacción actual (se ejecuta cada vez que transaction.id cambia)
  useEffect(() => {
    if (!socketRef.current || socketRef.current.readyState !== 1) {
      console.warn("[Frontend] Socket not connected yet, waiting...")
      return
    }

    // Enviar suscripción a la nueva transacción
    console.log(`[Frontend] Subscribing to transaction: ${transaction.id}`)
    socketRef.current.send(
      JSON.stringify({
        type: "subscribe",
        transactionId: transaction.id,
      }),
    )
  }, [transaction.id]) // Se ejecuta cuando transaction.id cambia

  return (
    <div className="card p-6 shadow-sm timeline">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Timeline de Transacción</h2>
        <div className="flex items-center gap-2">
           {/* Indicador visual de estado */}
           <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
           <span className={`text-xs font-semibold ${connected ? "text-green-700" : "text-red-700"}`}>
            {connected ? "Conectado al Gateway" : "Desconectado"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {transaction.events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Esperando eventos en tiempo real...</p>
            {!connected && (
               <p className="text-xs text-red-400 mt-2">Asegúrate de correr: node gateway.js</p>
            )}
          </div>
        ) : (
          <div className="relative">
            {transaction.events.map((event, idx) => (
              <div key={idx} className="flex gap-4 pb-4 items-start">
                <div className="flex-shrink-0 pt-1">
                  <div className="event-icon flex items-center justify-center bg-white rounded-full border-2 border-primary relative z-10 shadow-sm">
                    <div className="text-xl">{EVENT_ICONS[event.type] || "•"}</div>
                  </div>
                </div>

                <div className="flex-1 pt-1">
                  <div className={`event-card p-4 rounded-lg border transition-all duration-300 hover:shadow-md ${EVENT_COLORS[event.type] || "bg-gray-50"} animate-fade-in`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{event.type.replace(/\./g, " ")}</h3>
                      <span className="text-xs text-gray-500 font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="text-xs text-gray-700 space-y-1">
                      {Object.entries(event.payload || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-black/5 last:border-0 py-1">
                          <span className="font-medium text-gray-500">{key}:</span>
                          <span className="text-gray-800 font-mono">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionTimeline