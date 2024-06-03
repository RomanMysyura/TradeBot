import fetch from 'node-fetch';
import chalk from 'chalk';
import Table from 'cli-table3';

let transactions = []; // Transaction records
const maxTransactions = 3; // Máximo número de transacciones simultáneas
let currentTransaction = null; // Current transaction in progress
const prices = [];
const longSmaPeriod = 50; // Slow moving average period
const shortSmaPeriod = 20; // Fast moving average period
let principalBalance = 10000; // Initial principal balance
let balance = principalBalance; // Current balance
const purchaseAmount = 4000; // Amount to purchase in USDT
let totalProfit = 0;

let table = createTable();

async function fetchBitcoinPrice() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT');
    const data = await response.json();
    const price = parseFloat(data.price);

    prices.push(price);

    // Loop through active transactions to check for sell signals
    transactions.forEach((transaction, index) => {
      if (!transaction.sold) {
        const percentageChange = ((price - transaction.purchasePrice) / transaction.purchasePrice) * 100;
        if (percentageChange <= -0.001 || percentageChange >= 0.003) {
          transaction.sold = true;
          transaction.sellPrice = price;
          const profit = calculateProfit(price, transaction.purchasePrice);
          totalProfit += profit;
          console.log(chalk.red(`SELL signal at: ${price} USDT`));
          console.log(chalk.yellow(`Profit for this transaction: ${profit} USDT`));
          console.log(chalk.yellow(`Total profit: ${totalProfit} USDT`));
          balance += profit; // Adjust balance based on profit/loss
          console.log(chalk.yellow(`Balance: ${balance} USDT`));
        }
      }
    });

    // Check for buy signal if there are less than maxTransactions active transactions
    if (transactions.length < maxTransactions) {
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
  if (shortSma > longSma) {
    if (balance >= purchaseAmount) {
      const transaction = {
        purchasePrice: currentPrice,
        sold: false
      };
      transactions.push(transaction);
      console.log(chalk.green(`BUY signal at: ${currentPrice} USDT`));
      balance -= purchaseAmount; // Adjust balance for purchase
      console.log(chalk.yellow(`Balance after purchase: ${balance} USDT`));
      return 'buy';
    } else {
      console.log(chalk.yellow('Insufficient balance for purchase'));
    }
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
  const soldTransactions = transactions.filter(transaction => transaction.sold);
  const unsoldTransactions = transactions.filter(transaction => !transaction.sold);

  newTable.push([
    currentPrice.toFixed(2) + ' USDT',
    unsoldTransactions.map(transaction => transaction.purchasePrice.toFixed(2) + ' USDT').join(', ') || '-',
    soldTransactions.map(transaction => transaction.sellPrice.toFixed(2) + ' USDT').join(', ') || '-',
    totalProfit.toFixed(2) + ' USDT',
    balance.toFixed(8) + ' USDT'
  ]);

  console.clear();
  console.log(newTable.toString());

  table = newTable;
}

setInterval(fetchBitcoinPrice, 150);
