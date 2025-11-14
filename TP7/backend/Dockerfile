# --- Etapa 1: Builder ---
# Construye la aplicación NestJS
FROM node:20-alpine AS builder
WORKDIR /app

# Copia los archivos de paquete
COPY package*.json ./

# Instala TODAS las dependencias (incluyendo devDependencies) para construir
RUN npm ci

# Copia el resto del código fuente
COPY . .

# Ejecuta el build (esto crea la carpeta "./dist")
RUN npm run build

# --- Etapa 2: Runner ---
# Crea la imagen final de producción
FROM node:20-alpine
WORKDIR /app

# Establece el entorno a producción
ENV NODE_ENV=production

# Copia los package.json de la etapa builder
COPY --from=builder /app/package*.json ./

# Instala SÓLO las dependencias de producción
RUN npm ci --omit=dev

# --- ¡CAMBIO IMPORTANTE! ---
# Copiamos la carpeta "dist" que generó "nest build"
COPY --from=builder /app/dist ./dist

# El puerto por defecto de NestJS es 3000
EXPOSE 3000

# Usamos el script de "start:prod" del package.json ("node dist/main")
CMD ["npm", "run", "start:prod"]