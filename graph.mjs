// Función para obtener el precio promedio de Binance
async function obtenerPrecio() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT');
        const data = await response.json();
        return parseFloat(data.price); // Convertir el precio a un número flotante
    } catch (error) {
        console.error('Error al obtener el precio:', error);
    }
}

// Función para imprimir el precio en la consola con el formato deseado
async function imprimirPrecio() {
    const precioActual = await obtenerPrecio();
    if (precioActual) {
        console.clear(); // Limpiar la consola antes de imprimir el nuevo precio
        const precioAnterior = imprimirPrecio.precioAnterior || precioActual;
        const cambio = precioActual - precioAnterior;
        let color = '';
        let flecha = '';
        if (cambio > 0) {
            color = 'green'; // Precio subió, color verde
            flecha = '↑';
        } else if (cambio < 0) {
            color = 'red'; // Precio bajó, color rojo
            flecha = '↓';
        }
        console.log(`%cPrecio BTC/USDT: $${precioActual.toFixed(2)} ${flecha}`, `color: ${color}`);
        imprimirPrecio.precioAnterior = precioActual; // Guardar el precio actual para la próxima comparación
    }
}

// Llamar a la función para imprimir el precio cada 5 segundos
setInterval(imprimirPrecio, 250);
