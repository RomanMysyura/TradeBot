import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';

let transactions = []; // Transaction records
let currentTransaction = null; // Current transaction in progress
const prices = [];
const longSmaPeriod = 50; // Slow moving average period
const shortSmaPeriod = 20; // Fast moving average period
let lastSignal = null;
let principalBalance = 1000; // Initial principal balance
let balance = principalBalance; // Current balance
const purchaseAmount = 200; // Amount to purchase in USDT
let purchasePrice = 0;
let sellPrice = 0;
let totalProfit = 0;
let bought = false; // Purchase status

let table = createTable();

async function fetchBitcoinPrice() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT');
    const data = await response.json();
    const price = parseFloat(data.price);

    prices.push(price);

    if (!bought) {
      if (prices.length >= longSmaPeriod) {
        const shortSma = calculateSma(prices, shortSmaPeriod);
        const longSma = calculateSma(prices, longSmaPeriod);

        if (shortSma && longSma) {
          const signal = determineSignal(shortSma, longSma, price);
          updateTable(price, signal);
        }
      } else {
        updateTable(price, null);
      }
    } else {
      const percentageChange = ((price - purchasePrice) / purchasePrice) * 100;
      if (percentageChange <= -0.1 || percentageChange >= 0.3) {
        sellPrice = price;
        const profit = calculateProfit(price, purchasePrice);
        totalProfit += profit;
        console.log(chalk.red(`SELL signal at: ${sellPrice} USDT`));
        console.log(chalk.yellow(`Profit for this transaction: ${profit} USDT`));
        console.log(chalk.yellow(`Total profit: ${totalProfit} USDT`));
        currentTransaction.sell = sellPrice;
        currentTransaction.profit = profit;
        transactions.push(currentTransaction);
        bought = false;
        principalBalance += profit; // Adjust principal balance based on profit/loss
        balance = principalBalance; // Reset balance to principal balance
        resetTransaction(); // Reset transaction details for the next transaction
        resetEverythingExceptTransactionRecords(); // Reset everything except transaction records
      } else {
        updateTable(price);
      }
    }
  } catch (error) {
    console.error('Error fetching price:', error);
  }
}

function createTable() {
  return new Table({
    head: [
      chalk.cyan('Current Bitcoin Price'),
      chalk.green('Purchase Price'),
      chalk.red('Sell Price'),
      chalk.yellow('Total Profit'),
      chalk.blue('Total Balance')
    ],
    colWidths: [30, 30, 30, 30, 30]
  });
}

function calculateSma(data, period) {
  if (data.length < period) {
    return null;
  }
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function determineSignal(shortSma, longSma, currentPrice) {
  if (shortSma > longSma && lastSignal !== 'buy' && balance >= purchaseAmount) {
    lastSignal = 'buy';
    purchasePrice = currentPrice;
    console.log(chalk.green(`BUY signal at: ${purchasePrice} USDT`));
    bought = true;
    currentTransaction = {
      buy: purchasePrice,
      sell: null,
      profit: null
    };
    balance -= purchaseAmount; // Adjust balance for purchase
    console.log(chalk.yellow(`Balance after purchase: ${balance} USDT`));
    return 'buy';
  }
  return null;
}

function calculateProfit(sellPrice, purchasePrice) {
  const btcAmount = purchaseAmount / purchasePrice; // Cantidad de BTC comprados
  const sellValue = btcAmount * sellPrice; // Valor de venta en USDT
  const profit = sellValue - purchaseAmount; // Beneficio (restando el valor de compra)
  return profit;
}

function updateTable(currentPrice, signal) {
  const newTable = createTable();
  newTable.push([
    currentPrice.toFixed(2) + ' USDT',
    purchasePrice ? purchasePrice.toFixed(2) + ' USDT' : '-',
    sellPrice ? sellPrice.toFixed(2) + ' USDT' : '-',
    totalProfit.toFixed(2) + ' USDT',
    balance.toFixed(8) + ' USDT'
  ]);

  console.clear();
  console.log(newTable.toString());

  if (transactions.length > 0) {
    console.log('\nTransaction Records:');
    console.table(transactions);
    const totalTransactionProfit = transactions.reduce((total, transaction) => total + transaction.profit, 0);
    console.log(chalk.yellow(`Total Profit from All Transactions: ${totalTransactionProfit.toFixed(2)} USDT`));
  }

  table = newTable;
}

function resetTransaction() {
  currentTransaction = null;
  purchasePrice = 0;
  sellPrice = 0;
}

function resetEverythingExceptTransactionRecords() {
  prices.length = 0;
  lastSignal = null;
}

setInterval(fetchBitcoinPrice, 250);
