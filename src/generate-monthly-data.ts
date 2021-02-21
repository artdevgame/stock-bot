import dayjs from 'dayjs';
import { default as dividends } from './trading212/.cache/dividends.json';
import * as cache from './helpers/cache';

interface MonthlyView {
  label: string;
  month: number;
  total: number;
  year: number;
}

async function run() {
  const cacheOptions = { filename: 'monthly.json', path: `${__dirname}/dashboard`, purageDate: cache.NeverPurge };
  const monthlyData: MonthlyView[] = [];

  for await (const dividend of dividends) {
    const { amount } = dividend.mainInfo.context;
    const { date } = dividend;

    const dividendDate = dayjs(date);
    const existingMonthlyView = monthlyData.find(
      (monthlyView) => monthlyView.month === dividendDate.get('month') && monthlyView.year === dividendDate.get('year'),
    );

    if (!existingMonthlyView) {
      monthlyData.push({
        label: dividendDate.format('MM/YYYY'),
        month: dividendDate.get('month'),
        total: amount,
        year: dividendDate.get('year'),
      });
    } else {
      existingMonthlyView.total += amount;
    }
  }

  for (const monthlyView of monthlyData) {
    monthlyView.total = Number(monthlyView.total.toFixed(2));
  }

  cache.writeToCache(monthlyData.reverse(), cacheOptions);
  console.log('[Process completed: Monthly data]');
}

run();
