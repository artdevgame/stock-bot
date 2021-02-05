import { default as dividends } from './trading212/.cache/dividends.json';
import fs from 'fs';

interface Inventory {
  averaged: number;
  lastPaymentDate: string;
  name: string;
  numberOfPayments: number;
  total: number;
}

type AllInventory = Record<Instrument, Inventory>;
type Instrument = string;

const OUTPUT_INVENTORY_DATA = `${__dirname}/dashboard/top-dividends.json`;

const round = (number: number, decimalPlaces: number = 8) =>
  Number(Math.round(Number(`${number}e${decimalPlaces}`)) + `e-${decimalPlaces}`);

async function run() {
  const inventoryData: AllInventory = {};

  for await (const order of dividends) {
    const { instrument, prettyName: name } = order.subHeading.context;
    const { amount = 0 } = order.mainInfo.context!;

    const numberOfPayments = inventoryData[instrument]?.numberOfPayments ?? 0;
    const total = inventoryData[instrument]?.total ?? 0;
    const newTotal = round(total + amount);

    inventoryData[instrument] = {
      averaged: round(newTotal / (numberOfPayments + 1), 2),
      lastPaymentDate: order.date,
      name: name.trim(),
      numberOfPayments: numberOfPayments + 1,
      total: newTotal,
    };
  }

  const orderedInventory = Object.keys(inventoryData)
    .sort()
    .reduce((obj, key) => {
      obj[key] = inventoryData[key];
      return obj;
    }, {} as AllInventory);

  fs.writeFileSync(OUTPUT_INVENTORY_DATA, JSON.stringify(orderedInventory, null, 2), { encoding: 'utf8' });
  console.log('[Process completed: Top dividend payees data]');
}

run();
