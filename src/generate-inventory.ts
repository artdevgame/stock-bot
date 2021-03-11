import { default as orders } from './trading212/.cache/orders.json';
import { clamp, round } from './helpers/number';
import * as cache from './helpers/cache';
import * as stockBotApi from './stock-bot-api/client';

enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

interface Inventory {
  dividendYield: number;
  invested: number;
  name: string;
  quantity: number;
  symbol: string;
}

export type AllInventory = Record<InstrumentId, Inventory>;
type InstrumentId = string;

const dividendStocks = new Set();
const problematicStocks = new Set();

async function run() {
  const cacheOptions = { filename: 'inventory.json', path: `${__dirname}/dashboard`, purgeDate: cache.NeverPurge };
  const inventoryData: AllInventory = {};

  for await (const order of orders) {
    if (!['history.order.status.filled', 'history.order.status.partial-fill'].includes(order.additionalInfo.key)) {
      continue;
    }

    const { instrument: symbol, prettyName } = order.heading.context;
    const { quantity = 0, quantityPrecision = 8 } = order.subHeading.context;
    const { amount = 0 } = order.mainInfo.context!;
    const side = order.subHeading.key.replace('history.order.filled.', '') as OrderSide;
    const previousQuantity = inventoryData[symbol]?.quantity ?? 0;
    const newQuantity = round(
      clamp(0, side === OrderSide.BUY ? previousQuantity + quantity : previousQuantity - quantity),
      quantityPrecision,
    );
    const name = prettyName.trim();

    const instrument = await stockBotApi.fetchInstrument({ symbol });
    const { id } = instrument;

    if (newQuantity === 0) {
      if (id in inventoryData) {
        delete inventoryData[id];
      }
      continue;
    }

    const previousInvested = inventoryData[id]?.invested ?? 0;
    const newInvested = round(side === OrderSide.BUY ? previousInvested + amount : previousInvested - amount);

    inventoryData[id] = {
      dividendYield: inventoryData[id]?.dividendYield ?? 0,
      invested: newInvested,
      name: name,
      quantity: newQuantity,
      symbol,
    };

    try {
      const isDividendStock = dividendStocks.has(id);
      const isOtherStock = problematicStocks.has(id);

      if (isDividendStock || isOtherStock) {
        continue;
      }

      const { dividendYield } = await stockBotApi.fetchDividend({ instrument });

      inventoryData[id].dividendYield = dividendYield;
      dividendStocks.add(id);
    } catch (err) {
      console.error(err.message, `: ${name} (${symbol}) - ${id}`);
      problematicStocks.add(id);
    }
  }

  const orderedInventory = Object.keys(inventoryData)
    .sort()
    .reduce((obj, key) => {
      obj[key] = inventoryData[key];
      return obj;
    }, {} as AllInventory);

  const totalInvested = Object.values(orderedInventory).reduce((subTotal, current) => subTotal + current.invested, 0);

  cache.writeToCache(orderedInventory, cacheOptions);
  console.log('[Process completed: Inventory data]', `Total invested: £${totalInvested.toFixed(2)}`);
}

run();
