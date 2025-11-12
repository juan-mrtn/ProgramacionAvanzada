/**
 * Script para resolver el Code Challenge de Flybondi.
 * * Objetivo: Encontrar las mejores opciones de viaje (ida y vuelta) para Nelsona,
 * basándose en el archivo `dataset.json` y sus restricciones del `README.md`.
 * * Restricciones de Nelsona:
 * - Presupuesto máximo TOTAL: $800
 * - Flexibilidad total de fechas y destinos.
 * * Lógica:
 * 1. Cargar el archivo `dataset.json`.
 * 2. Pre-procesar los datos (convertir fechas a objetos Date).
 * 3. Iterar (O(n^2)) para encontrar todos los pares de ida y vuelta.
 * 4. Filtrar los pares que cumplan:
 * - Que el vuelo de vuelta sea DESPUÉS que el de ida.
 * - Que la suma de precios sea <= $800.
 * 5. Calcular la duración de cada viaje.
 * 6. Ordenar los viajes válidos por precio (de más barato a más caro).
 * 7. Mostrar los 10 mejores resultados en un formato claro para Nelsona.
 */
const fs = require('fs');
const path = require('path');

const PRESUPUESTO_MAXIMO = 800;
// Ciudad de origen de Nelsona (puede ser COR, EPA, MDZ, BRC, etc.)
// Por defecto usamos COR (Córdoba), pero puede cambiarse según necesidad
const CIUDAD_ORIGEN_NELSONA = 'BRC';

const DATASET = JSON.parse(fs.readFileSync(path.join(__dirname, 'dataset.json'), 'utf8'));

function procesarVuelos(dataset) {
    // Usamos .map() para crear una nueva lista basada en la anterior.
    // Cada elemento de la nueva lista es un objeto con los mismos propiedades que el elemento original,
    // pero con la fecha convertida a objeto Date.
    const vuelos = dataset.map(vuelo => {
        return {
            ...vuelo,
            date: new Date(vuelo.date)
        }
    });
    // Devolvemos la nueva lista de vuelos.
    return vuelos;
}

/**
 * Calcula la diferencia de días (redondeada) entre dos fechas.
 * @param {Date} fechaSalida - La fecha de inicio (ida).
 * @param {Date} fechaLlegada - La fecha de fin (vuelta).
 * @returns {number} El número de días de duración del viaje.
 */
function calcularDuracionViaje(fechaSalida, fechaLlegada) {
    const diferencia = fechaLlegada.getTime() - fechaSalida.getTime();
    // Convertimos la diferencia a días y redondeamos al entero más cercano.
    return Math.round(diferencia / (1000 * 60 * 60 * 24));
}
/**
 * El corazón del algoritmo. Encuentra todos los pares de vuelos (ida y vuelta)
 * que cumplen con las restricciones de Nelsona.
 * * @param {Array} vuelos - La lista de vuelos pre-procesada.
 * @param {number} presupuestoMax - El presupuesto total ($800).
 * @param {string} ciudadOrigen - La ciudad desde donde sale Nelsona.
 * @returns {Array} Una lista de viajes de ida y vuelta válidos.
 */
function encontrarViajesValidos(vuelos, presupuestoMax, ciudadOrigen) {
    const viajesValidos = [];
    // Iteramos sobre cada vuelo.
    vuelos.forEach(vuelo => {
        // Iteramos sobre cada vuelo de vuelta.
        vuelos.forEach(vueloVuelta => {
            // Verificamos que sea un viaje de ida y vuelta válido:
            // - El vuelo de ida debe salir desde la ciudad de origen de Nelsona
            // - El destino del vuelo de ida debe ser el origen del vuelo de vuelta
            // - El vuelo de vuelta debe regresar a la ciudad de origen de Nelsona
            // - El vuelo de vuelta debe ser después del vuelo de ida
            if (vuelo.origin === ciudadOrigen &&
                vuelo.destination === vueloVuelta.origin && 
                vueloVuelta.destination === ciudadOrigen &&
                vueloVuelta.date > vuelo.date) {
                // Verificamos que la suma de precios sea <= $800.
                if (vuelo.price + vueloVuelta.price <= presupuestoMax) {
                    // Calculamos la duración del viaje.
                    const duracion = calcularDuracionViaje(vuelo.date, vueloVuelta.date);
                    // Agregamos el viaje a la lista de viajes válidos.
                    viajesValidos.push({
                        vueloIda: vuelo,
                        vueloVuelta: vueloVuelta,
                        duracion: duracion,
                        precioTotal: vuelo.price + vueloVuelta.price
                    });
                }
            }
        });
    });
    // Ordenamos los viajes por precio total (de más barato a más caro).
    viajesValidos.sort((a, b) => a.precioTotal - b.precioTotal);
    
    // Devolvemos la lista de viajes válidos ordenada.
    return viajesValidos;
}

/**
 * Selecciona el mejor viaje a cada destino disponible.
 * @param {Array} viajes - Lista de viajes ordenados por precio.
 * @returns {Array} Lista con el mejor viaje a cada destino.
 */
function obtenerMejorViajePorDestino(viajes) {
    // Usamos un Map para agrupar por destino y mantener solo el mejor (más barato) de cada uno
    const mejoresPorDestino = new Map();
    
    viajes.forEach(viaje => {
        const destino = viaje.vueloIda.destination;
        // Si no tenemos un viaje a este destino, o este es más barato, lo guardamos
        if (!mejoresPorDestino.has(destino) || 
            viaje.precioTotal < mejoresPorDestino.get(destino).precioTotal) {
            mejoresPorDestino.set(destino, viaje);
        }
    });
    
    // Convertimos el Map a un array y lo ordenamos por precio
    return Array.from(mejoresPorDestino.values())
        .sort((a, b) => a.precioTotal - b.precioTotal);
}

/**
 * Formatea y muestra la información de un viaje individual.
 * @param {Object} viaje - Objeto con la información del viaje.
 * @param {number} index - Índice del viaje (para numeración).
 * @param {boolean} destacarDestino - Si es true, muestra el destino primero.
 */
function mostrarViaje(viaje, index, destacarDestino = false) {
    if (destacarDestino) {
        console.log(`${index + 1}. Destino: ${viaje.vueloIda.destination}`);
        console.log(`   Precio Total: $${viaje.precioTotal.toFixed(2)}`);
    } else {
        console.log(`${index + 1}. Precio Total: $${viaje.precioTotal.toFixed(2)}`);
        console.log(`   Destino: ${viaje.vueloIda.destination}`);
    }
    console.log(`   Ida: ${viaje.vueloIda.origin} → ${viaje.vueloIda.destination} | ${viaje.vueloIda.date.toLocaleDateString('es-AR')} | $${viaje.vueloIda.price.toFixed(2)}`);
    console.log(`   Vuelta: ${viaje.vueloVuelta.origin} → ${viaje.vueloVuelta.destination} | ${viaje.vueloVuelta.date.toLocaleDateString('es-AR')} | $${viaje.vueloVuelta.price.toFixed(2)}`);
    console.log(`   Duración: ${viaje.duracion} días\n`);
}

/**
 * Muestra una lista de viajes con un mensaje personalizado.
 * @param {Array} viajesAMostrar - Lista de viajes a mostrar.
 * @param {number} totalViajes - Total de viajes disponibles.
 * @param {string} mensaje - Mensaje personalizado a mostrar.
 * @param {boolean} destacarDestino - Si es true, destaca el destino en cada viaje.
 */
function mostrarListaViajes(viajesAMostrar, totalViajes, mensaje, destacarDestino = false) {
    console.log(`\nEncontré ${totalViajes} opciones de viaje en total.`);
    console.log(mensaje);
    console.log('');
    
    viajesAMostrar.forEach((viaje, index) => {
        mostrarViaje(viaje, index + 1, destacarDestino);
    });
}

/**
 * Muestra el mejor viaje a cada destino disponible.
 * Útil para ver todos los destinos a los que se puede viajar.
 * @param {Array} viajes - Lista de viajes ordenados por precio.
 */
function mostrarMejoresViajesPorDestino(viajes) {
    const mejoresPorDestino = obtenerMejorViajePorDestino(viajes);
    const mensaje = `Puedes viajar a ${mejoresPorDestino.length} destinos diferentes con tu presupuesto de $${PRESUPUESTO_MAXIMO}:`;
    mostrarListaViajes(mejoresPorDestino, viajes.length, mensaje, true);
}

/**
 * Muestra los N mejores viajes sin agrupar por destino.
 * Útil para ver las opciones más baratas sin importar el destino.
 * @param {Array} viajes - Lista de viajes ordenados por precio.
 * @param {number} cantidad - Cantidad de viajes a mostrar (por defecto 10).
 */
function mostrarMejoresViajes(viajes, cantidad = 10) {
    const mejores = viajes.slice(0, cantidad);
    const mensaje = `Aquí están las ${mejores.length} opciones más baratas:`;
    mostrarListaViajes(mejores, viajes.length, mensaje, false);
}

function main() {
    const vuelos = procesarVuelos(DATASET);
    const viajesValidos = encontrarViajesValidos(vuelos, PRESUPUESTO_MAXIMO, CIUDAD_ORIGEN_NELSONA);
    
    // Elige cómo quieres mostrar los resultados:
    // Opción 1: Mostrar el mejor viaje a cada destino (recomendado para Nelsona)
    mostrarMejoresViajesPorDestino(viajesValidos);
    
    // Opción 2: Mostrar los N mejores viajes sin agrupar por destino
    console.log('Opción 2: Mostrar los N mejores viajes sin agrupar por destino');
    mostrarMejoresViajes(viajesValidos, 10);
}

main();