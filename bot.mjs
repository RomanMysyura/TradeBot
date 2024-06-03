import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';

let transactions = []; // Registro de transacciones
let currentTransaction = null; // Transacción actual en proceso
const precios = [];
const longSmaPeriod = 50; // Periodo de la media móvil lenta
const shortSmaPeriod = 20; // Periodo de la media móvil rápida
let ultimaSeñal = null;
let balance = 30; // Balance principal
let precioCompra = 0;
let precioVenta = 0;
let profitTotal = 0;
let comprado = false; // Estado de compra

let table = createTable();

async function obtenerPrecioBitcoin() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT');
    const data = await response.json();
    const precio = parseFloat(data.price);

    precios.push(precio);

    if (!comprado) {
      if (precios.length >= longSmaPeriod) {
        const shortSma = calcularSma(precios, shortSmaPeriod);
        const longSma = calcularSma(precios, longSmaPeriod);

        if (shortSma && longSma) {
          const señal = determinarSeñal(shortSma, longSma, precio);
          actualizarTabla(precio, señal);
        }
      } else {
        actualizarTabla(precio, null);
      }
    } else {
      const porcentajeVariacion = ((precio - precioCompra) / precioCompra) * 100;
      if (porcentajeVariacion <= -0.001 || porcentajeVariacion >= 0.001) {
        precioVenta = precio;
        const profit = precioVenta - precioCompra;
        profitTotal += profit;
        console.log(chalk.red(`Señal de VENTA a: ${precioVenta} USDT`));
        console.log(chalk.yellow(`Profit de esta operación: ${profit} USDT`));
        console.log(chalk.yellow(`Profit total: ${profitTotal} USDT`));
        currentTransaction.venta = precioVenta;
        currentTransaction.profit = profit;
        transactions.push(currentTransaction);
        comprado = false;
        if (transactions.length > 1) { // Solo ajusta el balance si no es la primera transacción
          balance += (profit > 0) ? profit : 0;
        }
        resetearTabla();
      } else {
        actualizarTabla(precio);
      }
    }
  } catch (error) {
    console.error('Error al obtener el precio:', error);
  }
}

function createTable() {
  return new Table({
    head: [
      chalk.cyan('Precio Actual de Bitcoin'),
      chalk.green('Precio de Compra'),
      chalk.red('Precio de Venta'),
      chalk.yellow('Profit Total'),
      chalk.blue('Balance Total')
    ],
    colWidths: [30, 30, 30, 30, 30]
  });
}

function calcularSma(data, period) {
  if (data.length < period) {
    return null;
  }
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function determinarSeñal(shortSma, longSma, precioActual) {
  if (shortSma > longSma && ultimaSeñal !== 'comprar' && balance >= 10) {
    ultimaSeñal = 'comprar';
    precioCompra = precioActual;
    console.log(chalk.green(`Señal de COMPRA a: ${precioCompra} USDT`));
    comprado = true;
    currentTransaction = {
      compra: precioCompra,
      venta: null,
      profit: null
    };
    return 'comprar';
  }
  return null;
}

function actualizarTabla(precioActual, señal) {
  const newTable = createTable();
  newTable.push([
    precioActual.toFixed(2) + ' USDT',
    precioCompra ? precioCompra.toFixed(2) + ' USDT' : '-',
    precioVenta ? precioVenta.toFixed(2) + ' USDT' : '-',
    profitTotal.toFixed(2) + ' USDT',
    balance.toFixed(2) + ' USDT'
  ]);

  console.clear();
  console.log(newTable.toString());

  if (transactions.length > 0) {
    console.log('\nRegistro de Transacciones:');
    console.table(transactions);
    const totalProfit = transactions.reduce((total, transaction) => total + transaction.profit, 0);
    console.log(chalk.yellow(`Profit Total de Todas las Transacciones: ${totalProfit.toFixed(2)} USDT`));
  }

  table = newTable;
}

function resetearTabla() {
  precioCompra = 0;
  precioVenta = 0;
  profitTotal = 0.00 + ' USDT';
  table = createTable();
}

setInterval(obtenerPrecioBitcoin, 250);
