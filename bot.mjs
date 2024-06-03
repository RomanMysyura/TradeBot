import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';

let transactions = []; // Transaction records
let currentTransaction = null; // Current transaction in progress
const prices = [];
const longSmaPeriod = 50; // Slow moving average period
const shortSmaPeriod = 20; // Fast moving average period
let lastSignal = null;
let balance = 30; // Initial principal balance
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
      if (percentageChange <= -0.001 || percentageChange >= 0.001) {
        sellPrice = price;
        const profit = sellPrice - purchasePrice;
        totalProfit += profit;
        console.log(chalk.red(`SELL signal at: ${sellPrice} USDT`));
        console.log(chalk.yellow(`Profit for this transaction: ${profit} USDT`));
        console.log(chalk.yellow(`Total profit: ${totalProfit} USDT`));
        currentTransaction.sell = sellPrice;
        currentTransaction.profit = profit;
        transactions.push(currentTransaction);
        bought = false;
        balance += profit; // Adjust balance based on profit/loss
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
  if (shortSma > longSma && lastSignal !== 'buy' && balance >= 10) {
    lastSignal = 'buy';
    purchasePrice = currentPrice;
    console.log(chalk.green(`BUY signal at: ${purchasePrice} USDT`));
    bought = true;
    currentTransaction = {
      buy: purchasePrice,
      sell: null,
      profit: null
    };
    // Realizar la compra por una cantidad fija de $10
    balance -= 10; // Restar $10 del balance
    console.log(chalk.yellow(`Balance after purchase: ${balance} USDT`));
    return 'buy';
  }
  return null;
}

function updateTable(currentPrice, signal) {
  const newTable = createTable();
  newTable.push([
    currentPrice.toFixed(2) + ' USDT',
    purchasePrice ? purchasePrice.toFixed(2) + ' USDT' : '-',
    sellPrice ? sellPrice.toFixed(2) + ' USDT' : '-',
    totalProfit.toFixed(2) + ' USDT',
    balance.toFixed(2) + ' USDT'
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
  balance = 30;
  totalProfit = 0;
}

setInterval(fetchBitcoinPrice, 250);
