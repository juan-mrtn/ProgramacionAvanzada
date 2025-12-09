import { Kafka } from "kafkajs"

const kafka = new Kafka({
  clientId: "banking-orchestrator",
  brokers: ["localhost:9092"],
})

const consumer = kafka.consumer({ groupId: "orchestrator-group" })
const producer = kafka.producer()

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
await connectWithRetry(producer, "producer")

// Suscribirse a txn.commands
await consumer.subscribe({ topic: "txn.commands", fromBeginning: false })

// Procesar mensajes
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const event = JSON.parse(message.value.toString())
      const transactionId = message.key.toString()

      console.log(`[Orchestrator] Processing: ${event.type} (${transactionId})`)

      if (event.type === "TransactionInitiated") {
        // Paso 1: Reservar fondos
        await emitEvent(transactionId, "FundsReserved", {
          ok: true,
          holdId: `HOLD-${transactionId.substring(0, 8)}`,
          amount: event.payload.amount,
        })

        // Paso 2: Verificar fraude (simulado)
        const isFraudulent = Math.random() < 0.8 // 80% de probabilidad para demo
        if (isFraudulent) {
          // Emitir evento de fraude detectado
          await emitEvent(transactionId, "FraudDetected", {
            riskScore: 0.95,
            reason: "High fraud risk detected",
            details: "Transaction flagged by fraud detection system",
          })
          // Luego revertir
          await emitEvent(transactionId, "Reversed", {
            reason: "Transaction cancelled due to fraud risk",
            status: "cancelled",
          })
          return
        }

        await emitEvent(transactionId, "FraudChecked", {
          risk: "LOW",
        })

        // Paso 3: Confirmar transacción
        await emitEvent(transactionId, "Committed", {
          ledgerTxId: `LTX-${transactionId.substring(0, 8)}`,
        })

        // Paso 4: Notificar
        await emitEvent(transactionId, "Notified", {
          channels: ["email", "sms", "push"],
        })
      }
    } catch (error) {
      console.error("Orchestrator Error:", error)
      // Enviar a DLQ
      await producer.send({
        topic: "txn.dlq",
        messages: [
          {
            key: message.key,
            value: JSON.stringify({
              originalMessage: JSON.parse(message.value.toString()),
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      })
    }
  },
})

// Función helper para emitir eventos
async function emitEvent(transactionId, eventType, payload) {
  const event = {
    transactionId,
    type: eventType,
    timestamp: new Date().toISOString(),
    payload,
  }

  // Pequeño delay para simular procesamiento
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500))

  await producer.send({
    topic: "txn.events",
    messages: [
      {
        key: transactionId, // Mantener orden
        value: JSON.stringify(event),
      },
    ],
  })

  console.log(`[Orchestrator] Emitted: ${eventType}`)
}

console.log("Orchestrator started, listening on txn.commands...")
