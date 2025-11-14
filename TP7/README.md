# Sistema de Eventos Bancarios con Kafka

Sistema distribuido de procesamiento de transacciones bancarias que utiliza Apache Kafka para la comunicación asíncrona entre servicios y WebSockets para la actualización en tiempo real en el frontend.

## Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Componentes del Sistema](#componentes-del-sistema)
- [Flujo de Transacciones](#flujo-de-transacciones)
- [Guía de Uso de la Interfaz](#guía-de-uso-de-la-interfaz)
- [Instalación y Ejecución](#instalación-y-ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Eventos de Kafka](#eventos-de-kafka)
- [Configuración](#configuración)

## Descripción

Este sistema implementa un orquestador de transacciones bancarias que procesa operaciones financieras de forma asíncrona utilizando un patrón de eventos. El sistema valida transacciones, verifica fondos, realiza controles de fraude y notifica a los usuarios en tiempo real sobre el estado de sus transacciones.

### Características Principales

- Procesamiento asíncrono de transacciones mediante Kafka
- Actualización en tiempo real mediante WebSockets
- Orquestación de múltiples pasos (reserva de fondos, verificación de fraude, commit)
- Manejo de errores con Dead Letter Queue (DLQ)
- Interfaz web moderna y responsive
- Arquitectura basada en microservicios

## Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│    Backend   │────────▶│    Kafka    │
│  (Next.js)  │◀──WS───▶│   (NestJS)   │◀────────│  (Broker)   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │                         │
                              │                         │
                              ▼                         ▼
                        ┌──────────────┐         ┌─────────────┐
                        │ Orchestrator │         │  Kafka UI   │
                        │   Consumer   │         │  (Port 8080)│
                        └──────────────┘         └─────────────┘
```

### Flujo de Datos

1. **Frontend** → Usuario completa formulario y envía transacción
2. **Backend API** → Recibe request HTTP y publica evento en Kafka
3. **Orchestrator Consumer** → Procesa la transacción paso a paso
4. **Events Gateway** → Escucha eventos y los envía vía WebSocket
5. **Frontend** → Recibe eventos en tiempo real y actualiza la UI

## Tecnologías

### Backend
- **NestJS** - Framework Node.js para aplicaciones escalables
- **KafkaJS** - Cliente JavaScript para Apache Kafka
- **Socket.IO** - Comunicación WebSocket bidireccional
- **TypeScript** - Tipado estático
- **Docker** - Containerización

### Frontend
- **Next.js 14** - Framework React con App Router
- **React 18** - Biblioteca UI
- **Socket.IO Client** - Cliente WebSocket
- **Tailwind CSS** - Framework CSS utility-first
- **TypeScript** - Tipado estático

### Infraestructura
- **Apache Kafka** - Sistema de mensajería distribuida
- **Zookeeper** - Coordinación de servicios distribuidos
- **Kafka UI** - Interfaz web para administrar Kafka
- **Docker Compose** - Orquestación de contenedores

## Componentes del Sistema

### 1. Backend (NestJS)

#### AppController (`/transactions`)
- **Endpoint**: `POST /transactions`
- **Función**: Recibe solicitudes de creación de transacciones
- **Proceso**: Valida datos y publica evento `txn.TransactionInitiated` en Kafka

#### AppService
- **Función**: Inicia transacciones y genera IDs únicos
- **Método**: `initiateTransaction(dto)` - Crea y publica evento inicial

#### OrchestratorConsumer
- **Función**: Procesa transacciones de forma secuencial
- **Topics**: Escucha `txn.commands`
- **Proceso**:
  1. Reserva de fondos (`txn.FundsReserved`)
  2. Verificación de fraude (`txn.FraudChecked`)
  3. Si riesgo es ALTO → Reversión (`txn.Reversed`)
  4. Si riesgo es BAJO → Commit (`txn.Committed`)
  5. Notificación (`txn.Notified`)

#### EventsGateway
- **Función**: Gateway WebSocket para eventos en tiempo real
- **Puerto**: 3001
- **Proceso**: Escucha `txn.events` y reenvía a clientes WebSocket conectados

#### KafkaClientProvider
- **Función**: Proveedor del cliente Kafka configurado
- **Configuración**: Conecta a broker Kafka usando variables de entorno

### 2. Frontend (Next.js)

#### Página Principal (`page.tsx`)
- **Componente**: Interfaz de usuario completa
- **Funcionalidades**:
  - Formulario de creación de transacciones
  - Visualización de eventos en tiempo real
  - Conexión WebSocket automática
  - Suscripción a eventos por transactionId y userId

### 3. Infraestructura

#### Kafka
- **Broker**: Puerto 29092 (interno), 9092 (host)
- **Topics**:
  - `txn.commands` - Comandos de transacciones
  - `txn.events` - Eventos de transacciones
  - `txn.dlq` - Dead Letter Queue para errores

#### Kafka UI
- **Puerto**: 8080
- **Función**: Interfaz web para monitorear topics, consumidores y mensajes

## Flujo de Transacciones

### Flujo Exitoso (Riesgo BAJO)

```
1. Usuario completa formulario → POST /transactions
2. Backend genera transactionId → Publica txn.TransactionInitiated
3. Orchestrator recibe comando → Inicia procesamiento
4. Reserva de fondos (1s) → txn.FundsReserved
5. Verificación de fraude (1s) → txn.FraudChecked (risk: LOW)
6. Commit en ledger (1s) → txn.Committed
7. Notificación (0.5s) → txn.Notified
8. Frontend recibe todos los eventos vía WebSocket
```

### Flujo con Reversión (Riesgo ALTO)

```
1. Usuario completa formulario → POST /transactions
2. Backend genera transactionId → Publica txn.TransactionInitiated
3. Orchestrator recibe comando → Inicia procesamiento
4. Reserva de fondos (1s) → txn.FundsReserved
5. Verificación de fraude (1s) → txn.FraudChecked (risk: HIGH)
6. Reversión (0.5s) → txn.Reversed (reason: HIGH_FRAUD_RISK)
7. Notificación (0.5s) → txn.Notified
8. Frontend recibe eventos y muestra reversión
```

### Estructura de Eventos

Todos los eventos siguen el formato `EventEnvelope`:

```typescript
{
  id: string;              // UUID único del evento
  type: string;            // Tipo de evento (ej: "txn.FundsReserved")
  version: number;         // Versión del esquema (1)
  ts: number;             // Timestamp en milisegundos
  transactionId: string;   // ID de la transacción
  userId: string;         // ID del usuario
  payload: any;           // Datos específicos del evento
  correlationId?: string; // ID de correlación opcional
}
```

## Guía de Uso de la Interfaz

### Acceso a la Aplicación

1. Inicia todos los servicios con Docker Compose:
   ```bash
   docker-compose up
   ```

2. Accede a la interfaz web:
   - **Frontend**: http://localhost:3002
   - **Backend API**: http://localhost:3000
   - **Kafka UI**: http://localhost:8080

### Crear una Transacción

#### Paso 1: Verificar Conexión
- Observa el indicador de estado en la esquina superior derecha del panel de eventos
- **Verde** = Conectado al WebSocket
- **Rojo** = Desconectado

#### Paso 2: Completar el Formulario

El formulario requiere los siguientes campos:

1. **User ID** (requerido)
   - Identificador único del usuario
   - Ejemplo: `user-123`, `john-doe`, `customer-456`

2. **Cuenta Origen** (requerido)
   - Número o identificador de la cuenta de origen
   - Ejemplo: `ACC-001`, `1234567890`

3. **Cuenta Destino** (requerido)
   - Número o identificador de la cuenta de destino
   - Ejemplo: `ACC-002`, `9876543210`

4. **Monto** (requerido)
   - Cantidad a transferir (número decimal)
   - Ejemplo: `100.50`, `1000`, `50.25`
   - Acepta decimales con hasta 2 decimales

5. **Moneda** (requerido)
   - Selecciona de las opciones disponibles:
     - USD (Dólares estadounidenses)
     - EUR (Euros)
     - ARS (Pesos argentinos)

#### Paso 3: Enviar la Transacción

1. Haz clic en el botón **"Crear Transacción"**
2. El botón se deshabilita si no hay conexión WebSocket
3. Espera la respuesta del servidor

#### Paso 4: Observar el Procesamiento

Después de enviar la transacción:

1. **Transaction ID**: Aparece debajo del formulario
   - Este ID identifica únicamente tu transacción
   - Se usa para suscribirse a eventos específicos

2. **Eventos en Tiempo Real**: Se muestran en el panel derecho
   - Los eventos aparecen en orden cronológico (más recientes primero)
   - Cada evento muestra:
     - **Tipo de evento** (ej: `txn.FundsReserved`)
     - **Timestamp** (hora del evento)
     - **Transaction ID** y **User ID**
     - **Payload** (datos específicos del evento en JSON)

### Tipos de Eventos que Verás

#### 1. `txn.TransactionInitiated`
- **Cuándo**: Inmediatamente después de crear la transacción
- **Payload**: Contiene todos los datos del formulario

#### 2. `txn.FundsReserved`
- **Cuándo**: Después de ~1 segundo
- **Payload**: 
  ```json
  {
    "ok": true,
    "holdId": "hold-abc12345",
    "amount": 100.50
  }
  ```

#### 3. `txn.FraudChecked`
- **Cuándo**: Después de ~2 segundos
- **Payload**:
  ```json
  {
    "risk": "LOW"  // o "HIGH"
  }
  ```

#### 4. `txn.Committed` (solo si riesgo es BAJO)
- **Cuándo**: Después de ~3 segundos
- **Payload**:
  ```json
  {
    "ledgerTxId": "ledger-abc12345"
  }
  ```

#### 5. `txn.Reversed` (solo si riesgo es ALTO)
- **Cuándo**: Después de ~2.5 segundos
- **Payload**:
  ```json
  {
    "reason": "HIGH_FRAUD_RISK"
  }
  ```

#### 6. `txn.Notified`
- **Cuándo**: Al final del proceso (~3.5 segundos)
- **Payload**:
  ```json
  {
    "channels": ["email", "push"]
  }
  ```

### Ejemplo de Uso Completo

1. **Completa el formulario**:
   - User ID: `user-123`
   - Cuenta Origen: `ACC-001`
   - Cuenta Destino: `ACC-002`
   - Monto: `150.75`
   - Moneda: `USD`

2. **Haz clic en "Crear Transacción"**

3. **Observa los eventos**:
   ```
   txn.Notified → { channels: ["email", "push"] }
   txn.Committed → { ledgerTxId: "ledger-abc12345" }
   txn.FraudChecked → { risk: "LOW" }
   txn.FundsReserved → { ok: true, holdId: "hold-abc12345", amount: 150.75 }
   txn.TransactionInitiated → { ...datos del formulario... }
   ```

### Características de la Interfaz

- **Diseño Responsive**: Funciona en desktop, tablet y móvil
- **Actualización en Tiempo Real**: Los eventos aparecen automáticamente sin recargar
- **Scroll Automático**: El panel de eventos tiene scroll para ver todos los eventos
- **Indicador de Estado**: Muestra si estás conectado al WebSocket
- **Validación de Formulario**: Previene envíos con campos vacíos

## Instalación y Ejecución

### Prerrequisitos

- Docker y Docker Compose instalados
- Node.js 20+ (para desarrollo local)
- npm o yarn

### Ejecución con Docker (Recomendado)

1. **Clonar o navegar al directorio del proyecto**:
   ```bash
   cd TP7
   ```

2. **Construir e iniciar todos los servicios**:
   ```bash
   docker-compose up --build
   ```

3. **Verificar que todos los servicios estén corriendo**:
   ```bash
   docker-compose ps
   ```

4. **Acceder a las aplicaciones**:
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3000
   - Kafka UI: http://localhost:8080
   - Health Check: http://localhost:3000/health

### Ejecución en Desarrollo Local

#### Backend

```bash
cd backend
npm install
npm run start:dev
```

El backend estará disponible en http://localhost:3000

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en http://localhost:3000 (Next.js)

**Nota**: Asegúrate de que Kafka esté corriendo (puedes usar `docker-compose up kafka zookeeper`)

### Detener los Servicios

```bash
docker-compose down
```

Para eliminar también los volúmenes:

```bash
docker-compose down -v
```

## Estructura del Proyecto

```
TP7/
├── backend/
│   ├── src/
│   │   ├── app.controller.ts      # Endpoint REST para transacciones
│   │   ├── app.service.ts          # Lógica de negocio
│   │   ├── app.module.ts           # Módulo principal
│   │   ├── main.ts                 # Punto de entrada
│   │   ├── health.controller.ts   # Health check endpoint
│   │   ├── gateway/
│   │   │   └── gateway.ts         # WebSocket Gateway
│   │   ├── kafka/
│   │   │   ├── kafka-client.ts    # Cliente Kafka provider
│   │   │   └── envelope.ts       # Estructura de eventos
│   │   └── orchestrator/
│   │       └── orchestrator.consumer.ts  # Procesador de transacciones
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx           # Página principal
│   │       ├── layout.tsx         # Layout de la app
│   │       └── globals.css        # Estilos globales
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

### POST /transactions

Crea una nueva transacción bancaria.

**Request Body**:
```json
{
  "userId": "user-123",
  "fromAccount": "ACC-001",
  "toAccount": "ACC-002",
  "amount": 100.50,
  "currency": "USD"
}
```

**Response**:
```json
{
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "INITIATED"
}
```

**Status Codes**:
- `201 Created` - Transacción creada exitosamente
- `400 Bad Request` - Datos inválidos
- `500 Internal Server Error` - Error del servidor

### GET /health

Health check del backend.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T23:39:15.521Z"
}
```

## Eventos de Kafka

### Topics

#### `txn.commands`
- **Descripción**: Comandos de transacciones iniciadas
- **Producer**: AppService
- **Consumer**: OrchestratorConsumer
- **Formato**: EventEnvelope con tipo `txn.TransactionInitiated`

#### `txn.events`
- **Descripción**: Eventos de procesamiento de transacciones
- **Producer**: OrchestratorConsumer
- **Consumer**: EventsGateway
- **Tipos de eventos**:
  - `txn.FundsReserved`
  - `txn.FraudChecked`
  - `txn.Committed`
  - `txn.Reversed`
  - `txn.Notified`

#### `txn.dlq`
- **Descripción**: Dead Letter Queue para eventos con errores
- **Producer**: OrchestratorConsumer (en caso de error)
- **Consumer**: Ninguno (requiere procesamiento manual)

### Ejemplo de Evento

```json
{
  "id": "event-uuid-1234",
  "type": "txn.FundsReserved",
  "version": 1,
  "ts": 1699834755521,
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "payload": {
    "ok": true,
    "holdId": "hold-550e8400",
    "amount": 100.50
  }
}
```

## Configuración

### Variables de Entorno

#### Backend

- `KAFKA_BROKERS`: Dirección del broker Kafka (default: `localhost:9092`)
- `PORT`: Puerto del servidor NestJS (default: `3000`)

#### Docker Compose

Las variables están configuradas en `docker-compose.yml`:
- `KAFKA_BROKERS=kafka:29092` (para comunicación interna entre contenedores)

### Puertos

| Servicio | Puerto Interno | Puerto Host |
|----------|---------------|-------------|
| Backend API | 3000 | 3000 |
| Backend WebSocket | 3001 | 3001 |
| Frontend | 3000 | 3002 |
| Kafka | 29092 | 9092, 29092 |
| Zookeeper | 2181 | 2181 |
| Kafka UI | 8080 | 8080 |

## Monitoreo y Debugging

### Kafka UI

Accede a http://localhost:8080 para:
- Ver todos los topics
- Inspeccionar mensajes
- Monitorear consumidores y grupos
- Ver métricas de Kafka

### Logs de Docker

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f kafka
```

### Health Checks

- Backend: http://localhost:3000/health
- Frontend: http://localhost:3002 (debe cargar la página)

## Troubleshooting

### El frontend no se conecta al WebSocket

1. Verifica que el backend esté corriendo en el puerto 3001
2. Revisa los logs del backend: `docker-compose logs backend`
3. Asegúrate de que no haya errores de CORS

### Los eventos no aparecen en el frontend

1. Verifica la conexión WebSocket (indicador verde/rojo)
2. Revisa la consola del navegador para errores
3. Verifica que Kafka esté procesando mensajes en Kafka UI

### Error al crear transacción

1. Verifica que todos los campos estén completos
2. Revisa los logs del backend
3. Verifica que Kafka esté disponible

## 📝 Notas Adicionales

- El sistema usa delays simulados para demostrar el procesamiento asíncrono
- El riesgo de fraude se determina aleatoriamente (50% LOW, 50% HIGH)
- Los IDs de transacción son UUIDs v4 generados automáticamente
- El sistema está diseñado para ser escalable horizontalmente

## 📄 Licencia

Este proyecto es parte de un trabajo práctico académico.

---

**Desarrollado con ❤️ usando NestJS, Next.js y Apache Kafka**

