import dayjs from 'dayjs';

import { default as inventory } from './dashboard/inventory.json';
import { AllInventory } from './generate-inventory';
import * as cache from './helpers/cache';
import { round } from './helpers/number';
import * as stockBotApi from './stock-bot-api/client';
import { default as dividends } from './trading212/.cache/dividends.json';

interface Dividend {
  averaged: number;
  bangForBuck: number;
  dividendYield: number;
  invested: number;
  lastPaymentAmount: number;
  lastPaymentDate: string;
  name: string;
  numberOfPayments: number;
  symbol: string;
  total: number;
}

type Dividends = Record<StockSymbol, Dividend>;
type StockSymbol = string;

function getMonthlyYield(dividendYield: number) {
  if (dividendYield === 0) {
    return 0;
  }

  return dividendYield / 12;
}

async function run() {
  const cacheOptions = { filename: 'top-dividends.json', path: `${__dirname}/dashboard`, purgeDate: cache.NeverPurge };
  const dividendData: Dividends = {};

  for await (const dividend of dividends) {
    const { instrument: symbol, instrumentCode: id, prettyName: name } = dividend.subHeading.context;
    const { amount = 0 } = dividend.mainInfo.context!;

    const numberOfPayments = dividendData[symbol]?.numberOfPayments ?? 0;
    const total = dividendData[symbol]?.total ?? 0;
    const totalPayments = numberOfPayments + 1;
    const newTotal = round(total + amount);
    const averaged = round(newTotal / totalPayments, 2);

    const previousDate = dividendData[symbol]?.lastPaymentDate || '0000-00-00';
    const lastPaymentDate = dayjs(dividend.date).isAfter(previousDate) ? dividend.date : previousDate;

    const lastPaymentAmount = lastPaymentDate === dividend.date ? amount : dividendData[symbol]?.lastPaymentAmount ?? 0;

    // const instrument = await stockBotApi.fetchInstrument({ symbol });
    // const { id } = instrument;

    const { dividendYield, invested } = (inventory as AllInventory)[id];

    const bangForBuck = round(getMonthlyYield(dividendYield) * numberOfPayments, 5);

    dividendData[symbol] = {
      averaged,
      bangForBuck,
      dividendYield: round(dividendYield * 100, 2),
      invested,
      lastPaymentAmount,
      lastPaymentDate,
      name: name.trim(),
      numberOfPayments: totalPayments,
      symbol,
      total: newTotal,
    };
  }

  const orderedDividends = Object.keys(dividendData)
    .sort()
    .reduce((obj, key) => {
      obj[key] = dividendData[key];
      return obj;
    }, {} as Dividends);

  cache.writeToCache(orderedDividends, cacheOptions);
  console.log('[Process completed: Top dividend payees data]');
}

run();
