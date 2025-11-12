// Constantes
const PRESUPUESTO_MAXIMO = 800;

// Estado global
let dataset = null;

// Funciones de procesamiento (adaptadas del challenge.js)
function procesarVuelos(dataset) {
    return dataset.map(vuelo => ({
        ...vuelo,
        date: new Date(vuelo.date)
    }));
}

function calcularDuracionViaje(fechaSalida, fechaLlegada) {
    const diferencia = fechaLlegada.getTime() - fechaSalida.getTime();
    return Math.round(diferencia / (1000 * 60 * 60 * 24));
}

function encontrarViajesValidos(vuelos, presupuestoMax, ciudadOrigen) {
    const viajesValidos = [];
    
    vuelos.forEach(vuelo => {
        vuelos.forEach(vueloVuelta => {
            if (vuelo.origin === ciudadOrigen &&
                vuelo.destination === vueloVuelta.origin && 
                vueloVuelta.destination === ciudadOrigen &&
                vueloVuelta.date > vuelo.date) {
                if (vuelo.price + vueloVuelta.price <= presupuestoMax) {
                    const duracion = calcularDuracionViaje(vuelo.date, vueloVuelta.date);
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
    
    viajesValidos.sort((a, b) => a.precioTotal - b.precioTotal);
    return viajesValidos;
}

function obtenerMejorViajePorDestino(viajes) {
    const mejoresPorDestino = new Map();
    
    viajes.forEach(viaje => {
        const destino = viaje.vueloIda.destination;
        if (!mejoresPorDestino.has(destino) || 
            viaje.precioTotal < mejoresPorDestino.get(destino).precioTotal) {
            mejoresPorDestino.set(destino, viaje);
        }
    });
    
    return Array.from(mejoresPorDestino.values())
        .sort((a, b) => a.precioTotal - b.precioTotal);
}

// Funciones de visualización
function formatearFecha(fecha) {
    return fecha.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function crearCardViaje(viaje, index) {
    const card = document.createElement('div');
    card.className = 'viaje-card';
    
    card.innerHTML = `
        <div class="viaje-header">
            <div class="destino">${viaje.vueloIda.destination}</div>
            <div class="precio-total">$${viaje.precioTotal.toFixed(2)}</div>
        </div>
        <div class="viaje-detalle">
            <div class="vuelo-info ida">
                <strong>Vuelo de Ida</strong>
                <div class="ruta">${viaje.vueloIda.origin} → ${viaje.vueloIda.destination}</div>
                <div>${formatearFecha(viaje.vueloIda.date)}</div>
                <div>$${viaje.vueloIda.price.toFixed(2)}</div>
            </div>
            <div class="vuelo-info vuelta">
                <strong>Vuelo de Vuelta</strong>
                <div class="ruta">${viaje.vueloVuelta.origin} → ${viaje.vueloVuelta.destination}</div>
                <div>${formatearFecha(viaje.vueloVuelta.date)}</div>
                <div>$${viaje.vueloVuelta.price.toFixed(2)}</div>
            </div>
        </div>
        <div class="duracion">Duración del viaje: ${viaje.duracion} días</div>
    `;
    
    return card;
}

function mostrarResultados(viajes, modo, cantidad, presupuesto) {
    const resultadosDiv = document.getElementById('resultados');
    const resumenDiv = document.getElementById('resumen');
    const listaDiv = document.getElementById('listaViajes');
    const errorDiv = document.getElementById('error');
    
    // Ocultar error si existe
    errorDiv.classList.add('hidden');
    
    // Limpiar resultados anteriores
    listaDiv.innerHTML = '';
    
    let viajesAMostrar = [];
    let mensaje = '';
    
    if (modo === 'porDestino') {
        viajesAMostrar = obtenerMejorViajePorDestino(viajes);
        mensaje = `Puedes viajar a <strong>${viajesAMostrar.length}</strong> destinos diferentes con tu presupuesto de <strong>$${presupuesto}</strong>.`;
    } else {
        viajesAMostrar = viajes.slice(0, cantidad);
        mensaje = `Aquí están las <strong>${viajesAMostrar.length}</strong> opciones más baratas de <strong>${viajes.length}</strong> disponibles.`;
    }
    
    if (viajesAMostrar.length === 0) {
        errorDiv.textContent = 'No se encontraron viajes que cumplan con los criterios seleccionados.';
        errorDiv.classList.remove('hidden');
        resultadosDiv.classList.add('hidden');
        return;
    }
    
    resumenDiv.innerHTML = `
        <h2>Resultados de la búsqueda</h2>
        <p>Encontré <strong>${viajes.length}</strong> opciones de viaje en total.</p>
        <p>${mensaje}</p>
    `;
    
    viajesAMostrar.forEach((viaje, index) => {
        const card = crearCardViaje(viaje, index + 1);
        listaDiv.appendChild(card);
    });
    
    resultadosDiv.classList.remove('hidden');
}

// Función principal de búsqueda
async function buscarViajes() {
    const ciudadOrigen = document.getElementById('ciudadOrigen').value;
    const presupuesto = parseFloat(document.getElementById('presupuesto').value);
    const modo = document.getElementById('modoVisualizacion').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    
    const loadingDiv = document.getElementById('loading');
    const resultadosDiv = document.getElementById('resultados');
    const errorDiv = document.getElementById('error');
    
    // Mostrar loading
    loadingDiv.classList.remove('hidden');
    resultadosDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    
    try {
        if (!dataset) {
            const response = await fetch('dataset.json');
            if (!response.ok) throw new Error('Error al cargar el dataset');
            dataset = await response.json();
        }
        
        const vuelos = procesarVuelos(dataset);
        const viajesValidos = encontrarViajesValidos(vuelos, presupuesto, ciudadOrigen);
        
        // Simular un pequeño delay para mejor UX
        setTimeout(() => {
            loadingDiv.classList.add('hidden');
            mostrarResultados(viajesValidos, modo, cantidad, presupuesto);
        }, 300);
        
    } catch (error) {
        loadingDiv.classList.add('hidden');
        errorDiv.textContent = `Error: ${error.message}`;
        errorDiv.classList.remove('hidden');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const buscarBtn = document.getElementById('buscarBtn');
    buscarBtn.addEventListener('click', buscarViajes);
    
    // Buscar automáticamente al cargar
    buscarViajes();
});

