import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Esta función 'cn' es estándar en proyectos Next.js modernos para manejar clases de Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ESTA ES LA FUNCIÓN QUE TE FALTABA
export function getStatusFromEvent(eventType: string): string {
  // Map events emitted by the orchestrator to UI-friendly statuses
  switch (eventType) {
    case "TransactionInitiated":
      return "initiated"
    case "FundsReserved":
      return "reserved"
    case "FraudDetected":
      return "fraud_detected"
    case "FraudChecked":
      return "fraud_checked"
    case "Committed":
      return "committed"
    case "Reversed":
      return "reversed"
    case "Notified":
      return "notified"
    default:
      return "processing"
  }
}

// Return a small badge label and Tailwind classes for a given high-level status
export function getStatusBadge(status: string) {
  switch (status) {
    case "initiated":
      return { label: "Iniciado", className: "bg-blue-100 text-blue-800" }
    case "reserved":
      return { label: "Reservado", className: "bg-yellow-100 text-yellow-800" }
    case "fraud_detected":
      return { label: "Fraude Detectado", className: "bg-red-100 text-red-800" }
    case "fraud_checked":
      return { label: "Fraude verificado", className: "bg-purple-100 text-purple-800" }
    case "committed":
      return { label: "Completado", className: "bg-green-100 text-green-800" }
    case "reversed":
      return { label: "Cancelado", className: "bg-red-100 text-red-800" }
    case "notified":
      return { label: "Notificado", className: "bg-indigo-100 text-indigo-800" }
    case "processing":
    default:
      return { label: "Procesando", className: "bg-gray-100 text-gray-800" }
  }
}