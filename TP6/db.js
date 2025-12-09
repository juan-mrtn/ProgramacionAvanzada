require('dotenv').config();
const { MongoClient } = require('mongodb');

const username = process.env.MONGO_USERNAME || 'admin';
const password = process.env.MONGO_PASSWORD || 'admin';
const host = process.env.MONGO_HOST || 'localhost';
const port = process.env.MONGO_PORT || '27017';
const dbName = process.env.MONGO_DB_NAME || 'usuarios_db';

const uri = `mongodb://${username}:${password}@${host}:${port}/`;

const client = new MongoClient(uri);
let db;

async function connectToDb() {
  try {
    await client.connect();
    console.log('Conectado exitosamente a MongoDB');
    db = client.db(dbName);

    // Crear índice único para el campo 'email'
    // Esto previene duplicados, igual que en SQL
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('Índice único para "email" verificado/creado.');

  } catch (err) {
    console.error('Error al conectar con MongoDB:', err);
    process.exit(1); // Detiene la aplicación si no se puede conectar
  }
}

// Función para obtener la instancia de la base de datos
function getDb() {
  return db;
}

module.exports = { connectToDb, getDb };