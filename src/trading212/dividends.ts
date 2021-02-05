import { RequiredCookie } from './client';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { Transaction, TransactionsPayload } from './types';

interface FetchDividends {
  customerSession: string;
  loginToken: string;
  olderThan?: string;
  sessionId: string;
}

const OUTPUT_API_RESPONSE = `${__dirname}/.cache/dividends.json`;

export async function fetchDividends({
  customerSession,
  loginToken,
  olderThan,
  sessionId,
}: FetchDividends): Promise<Transaction[]> {
  let dividendUrl = 'https://live.trading212.com/rest/history/dividends';

  if (typeof olderThan !== 'undefined') {
    dividendUrl += `?olderThan=${encodeURIComponent(olderThan)}`;
  }

  const dividendsRes = await fetch(dividendUrl, {
    headers: {
      Cookie: [
        `${RequiredCookie.CUSTOMER_SESSION}=${customerSession}`,
        `${RequiredCookie.LOGIN_TOKEN}=${loginToken}`,
        `${RequiredCookie.SESSION_ID}=${sessionId}`,
      ].join(';'),
    },
  });

  if (!dividendsRes.ok) {
    throw new Error(`Unable to acquire dividends: ${dividendsRes.statusText}`);
  }

  const dividends: TransactionsPayload = await dividendsRes.json();

  if (dividends.hasNext) {
    const totalDividends = dividends.data.length;
    const lastDividend = dividends.data[totalDividends - 1];
    const { date } = lastDividend;

    dividends.data = [
      ...dividends.data,
      ...(await fetchDividends({ customerSession, loginToken, sessionId, olderThan: date })),
    ];
  }

  fs.writeFileSync(path.resolve(OUTPUT_API_RESPONSE), JSON.stringify(dividends.data, null, 2), {
    encoding: 'utf8',
    flag: 'w',
  });

  return dividends.data;
}
