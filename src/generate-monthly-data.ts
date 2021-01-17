import dayjs from 'dayjs';
import { default as dividends } from './api-response/dividends.json';
import fs from 'fs';

interface Instrument {
  prettyName: string;
}

interface MonthlyView {
  label: string;
  month: number;
  total: number;
  year: number;
}

type StockInstrument = string;

const OUTPUT_MONTHLY_DATA = `${__dirname}/dashboard/monthly.json`;

const run = async () => {
  const instruments: Record<StockInstrument, Instrument> = {};
  const monthlyData: MonthlyView[] = [];

  for (const dividend of dividends.data) {
    const { instrument, prettyName } = dividend.subHeading.context;
    const { amount } = dividend.mainInfo.context;
    const { date } = dividend;

    if (!(instrument in instruments)) {
      instruments[instrument] = { prettyName };
    }

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

  fs.writeFileSync(OUTPUT_MONTHLY_DATA, JSON.stringify(monthlyData.reverse(), null, 2), { encoding: 'utf8' });
  console.log('[Process completed: Monthly data]');
};

run();
