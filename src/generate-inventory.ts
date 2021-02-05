import { default as orders } from './trading212/.cache/orders.json';
import fs from 'fs';

enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

interface Inventory {
  invested: number;
  name: string;
  quantity: number;
}

type AllInventory = Record<Instrument, Inventory>;
type Instrument = string;

const OUTPUT_INVENTORY_DATA = `${__dirname}/dashboard/inventory.json`;

const clamp = (min: number, max: number) => Math.min(Math.max(max, min), max);
const round = (number: number, decimalPlaces: number = 8) =>
  Number(Math.round(Number(`${number}e${decimalPlaces}`)) + `e-${decimalPlaces}`);

async function run() {
  const inventoryData: AllInventory = {};

  for await (const order of orders) {
    if (order.additionalInfo.key !== 'history.order.status.filled') {
      continue;
    }

    const { instrument, prettyName: name } = order.heading.context;
    const { quantity = 0, quantityPrecision = 8 } = order.subHeading.context;
    const { amount = 0 } = order.mainInfo.context!;
    const side = order.subHeading.key.replace('history.order.filled.', '') as OrderSide;
    const previousQuantity = inventoryData[instrument]?.quantity ?? 0;
    const newQuantity = round(
      clamp(0, side === OrderSide.BUY ? previousQuantity + quantity : previousQuantity - quantity),
      quantityPrecision,
    );

    if (newQuantity === 0) {
      if (instrument in inventoryData) {
        delete inventoryData[instrument];
      }
      continue;
    }

    const previousInvested = inventoryData[instrument]?.invested ?? 0;
    const newInvested = round(side === OrderSide.BUY ? previousInvested + amount : previousInvested - amount);

    inventoryData[instrument] = {
      invested: newInvested,
      name: name.trim(),
      quantity: newQuantity,
    };
  }

  const orderedInventory = Object.keys(inventoryData)
    .sort()
    .reduce((obj, key) => {
      obj[key] = inventoryData[key];
      return obj;
    }, {} as AllInventory);

  const totalInvested = Object.values(orderedInventory).reduce((subTotal, current) => subTotal + current.invested, 0);

  fs.writeFileSync(OUTPUT_INVENTORY_DATA, JSON.stringify(orderedInventory, null, 2), { encoding: 'utf8' });
  console.log('[Process completed: Inventory data]', `Total invested: £${totalInvested.toFixed(2)}`);
}

run();