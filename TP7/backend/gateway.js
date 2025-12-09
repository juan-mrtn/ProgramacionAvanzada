import express from "express"
import { WebSocketServer } from "ws"
import { createServer } from "http"
import { Kafka } from "kafkajs"

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Configuración de Kafka
const kafka = new Kafka({
  clientId: "banking-gateway",
  brokers: ["localhost:9092"],
})

const consumer = kafka.consumer({ groupId: "gateway-group" })
// Retry helper for Kafka clients
async function connectWithRetry(client, name = "kafka", maxAttempts = 10, baseDelay = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect()
      console.log(`${name} connected`)
      return
    } catch (err) {
      const delay = baseDelay * attempt
      console.warn(`${name} connect attempt ${attempt} failed. Retrying in ${delay}ms...`)
      await new Promise((res) => setTimeout(res, delay))
    }
  }
  throw new Error(`${name} failed to connect after ${maxAttempts} attempts`)
}

await connectWithRetry(consumer, "consumer")
await consumer.subscribe({ topic: "txn.events", fromBeginning: false })

// Store active connections
const connections = new Map() // transactionId -> Set<WebSocket>

// NUEVO: Historial de eventos para clientes que llegan tarde (Race Condition fix)
const eventHistory = new Map() // transactionId -> Array<Event>

// Manejar conexiones WebSocket
wss.on("connection", (ws) => {
  console.log("[Gateway] New WebSocket connection")

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data)
      const { type, transactionId } = message

      if (type === "subscribe") {
        // 1. Registrar suscripción
        if (!connections.has(transactionId)) {
          connections.set(transactionId, new Set())
        }
        connections.get(transactionId).add(ws)
        console.log(`[Gateway] Subscribed to transaction: ${transactionId}`)
        
        // 2. Enviar confirmación
        ws.send(JSON.stringify({ type: "subscribed", transactionId }))

        // 3. (CRUCIAL) Reenviar eventos que ocurrieron ANTES de la suscripción
        if (eventHistory.has(transactionId)) {
            const pastEvents = eventHistory.get(transactionId)
            console.log(`[Gateway] Replaying ${pastEvents.length} historical events for ${transactionId}`)
            
            pastEvents.forEach(event => {
                ws.send(JSON.stringify({
                    type: "event",
                    transactionId,
                    ...event,
                }))
            })
        }
      }
    } catch (error) {
      console.error("Gateway message error:", error)
    }
  })

  ws.on("close", () => {
    // Limpiar conexiones del cliente
    for (const [txId, clients] of connections.entries()) {
      clients.delete(ws)
      if (clients.size === 0) {
        connections.delete(txId)
      }
    }
    console.log("[Gateway] Client disconnected")
  })
})

// Consumir eventos y reenviarlos por WebSocket
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const event = JSON.parse(message.value.toString())
      const { transactionId } = event

      console.log(`[Gateway] Broadcasting event: ${event.type} for transaction: ${transactionId}`)

      // 1. Guardar en historial (Buffer temporal)
      if (!eventHistory.has(transactionId)) {
          eventHistory.set(transactionId, [])
          
          // Limpieza automática: Borrar historial después de 2 minutos para no llenar la RAM
          setTimeout(() => {
              if (eventHistory.has(transactionId)) {
                  eventHistory.delete(transactionId)
                  console.log(`[Gateway] Cleared history for ${transactionId}`)
              }
          }, 120000) 
      }
      eventHistory.get(transactionId).push(event)

      // 2. Enviar a clientes YA conectados
      if (connections.has(transactionId)) {
        const clients = connections.get(transactionId)
        const eventMessage = JSON.stringify({
          type: "event",
          transactionId,
          ...event,
        })

        clients.forEach((client) => {
          if (client.readyState === 1) { // 1 = OPEN
            client.send(eventMessage)
          }
        })
      }
    } catch (error) {
      console.error("Gateway error:", error)
    }
  },
})

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gateway", connections: connections.size })
})

// Forzamos el puerto 3002 o usamos variable de entorno
const PORT = process.env.GATEWAY_PORT || 3002
server.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`)
  console.log(`WebSocket available at ws://localhost:${PORT}`)
})