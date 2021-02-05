import { RequiredCookie } from './client';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { Transaction, TransactionsPayload } from './types';

interface FetchOrders {
  customerSession: string;
  loginToken: string;
  olderThan?: string;
  sessionId: string;
}

const OUTPUT_API_RESPONSE = `${__dirname}/.cache/orders.json`;

export async function fetchOrders({
  customerSession,
  loginToken,
  olderThan,
  sessionId,
}: FetchOrders): Promise<Transaction[]> {
  let dividendUrl = 'https://live.trading212.com/rest/history/orders';

  if (typeof olderThan !== 'undefined') {
    dividendUrl += `?olderThan=${encodeURIComponent(olderThan)}`;
  }

  const ordersRes = await fetch(dividendUrl, {
    headers: {
      Cookie: [
        `${RequiredCookie.CUSTOMER_SESSION}=${customerSession}`,
        `${RequiredCookie.LOGIN_TOKEN}=${loginToken}`,
        `${RequiredCookie.SESSION_ID}=${sessionId}`,
      ].join(';'),
    },
  });

  if (!ordersRes.ok) {
    throw new Error(`Unable to acquire orders: ${ordersRes.statusText}`);
  }

  const orders: TransactionsPayload = await ordersRes.json();

  if (orders.hasNext) {
    const totalOrders = orders.data.length;
    const lastDividend = orders.data[totalOrders - 1];
    const { date } = lastDividend;

    orders.data = [...orders.data, ...(await fetchOrders({ customerSession, loginToken, sessionId, olderThan: date }))];
  }

  fs.writeFileSync(path.resolve(OUTPUT_API_RESPONSE), JSON.stringify(orders.data, null, 2), {
    encoding: 'utf8',
    flag: 'w',
  });

  return orders.data;
}
