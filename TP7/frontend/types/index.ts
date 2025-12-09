export interface Event {
  type: string
  timestamp: string
  payload: Record<string, any>
}

export interface Transaction {
  id: string
  events: Event[]
  status: string
  createdAt: string
}
