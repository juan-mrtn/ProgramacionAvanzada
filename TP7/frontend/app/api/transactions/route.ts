import { Kafka } from "kafkajs"
import { v4 as uuidv4 } from "uuid"
import { type NextRequest, NextResponse } from "next/server"

const kafka = new Kafka({
  clientId: "banking-api",
  brokers: ["localhost:9092"],
})

let producer: any = null

async function getProducer() {
  if (!producer) {
    producer = kafka.producer()
    await producer.connect()
  }
  return producer
}

export async function POST(request: NextRequest) {
  try {
    const { fromAccount, toAccount, amount, currency, userId } = await request.json()

    if (!fromAccount || !toAccount || !amount || !currency || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const transactionId = uuidv4()

    const transactionEvent = {
      transactionId,
      type: "TransactionInitiated",
      timestamp: new Date().toISOString(),
      payload: {
        fromAccount,
        toAccount,
        amount,
        currency,
        userId,
      },
    }

    const prod = await getProducer()
    await prod.send({
      topic: "txn.commands",
      messages: [
        {
          key: transactionId,
          value: JSON.stringify(transactionEvent),
        },
      ],
    })

    return NextResponse.json({
      success: true,
      transactionId,
      message: "Transaction initiated",
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "banking-api",
  })
}
