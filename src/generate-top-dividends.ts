import { default as dividends } from './trading212/.cache/dividends.json';
import { default as inventory } from './dashboard/inventory.json';
import fs from 'fs';
import { AllInventory } from './generate-inventory';
import { round } from './helpers/number';

interface Dividend {
  averaged: number;
  bangForBuck: number;
  dividendYield: number;
  instrument: string;
  invested: number;
  lastPaymentDate: string;
  name: string;
  numberOfPayments: number;
  total: number;
}

type Dividends = Record<Instrument, Dividend>;
type Instrument = string;

const OUTPUT_INVENTORY_DATA = `${__dirname}/dashboard/top-dividends.json`;

function getMonthlyYield(dividendYield: number) {
  if (dividendYield === 0) {
    return 0;
  }

  return dividendYield / 12;
}

async function run() {
  const dividendData: Dividends = {};

  for await (const dividend of dividends) {
    const { instrument, prettyName: name } = dividend.subHeading.context;
    const { amount = 0 } = dividend.mainInfo.context!;

    const numberOfPayments = dividendData[instrument]?.numberOfPayments ?? 0;
    const total = dividendData[instrument]?.total ?? 0;
    const totalPayments = numberOfPayments + 1;
    const newTotal = round(total + amount);
    const averaged = round(newTotal / totalPayments, 2);

    const { dividendYield, invested } = (inventory as AllInventory)[instrument];

    const bangForBuck = round(getMonthlyYield(dividendYield) * averaged * totalPayments, 5);

    dividendData[instrument] = {
      averaged,
      bangForBuck,
      dividendYield,
      instrument,
      invested,
      lastPaymentDate: dividend.date,
      name: name.trim(),
      numberOfPayments: totalPayments,
      total: newTotal,
    };
  }

  const orderedDividends = Object.keys(dividendData)
    .sort()
    .reduce((obj, key) => {
      obj[key] = dividendData[key];
      return obj;
    }, {} as Dividends);

  fs.writeFileSync(OUTPUT_INVENTORY_DATA, JSON.stringify(orderedDividends, null, 2), { encoding: 'utf8' });
  console.log('[Process completed: Top dividend payees data]');
}

run();
