import { RequiredCookie } from './client';
import fetch from 'node-fetch';
import { Transaction, TransactionsPayload } from './types';
import * as cache from '../helpers/cache';

interface FetchOrders {
  customerSession: string;
  loginToken: string;
  olderThan?: string;
  sessionId: string;
}

export async function fetchOrders({
  customerSession,
  loginToken,
  olderThan,
  sessionId,
}: FetchOrders): Promise<Transaction[]> {
  const cacheOptions = { filename: 'orders.json', path: `${__dirname}/.cache` };
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

  cache.writeToCache(orders.data, cacheOptions);

  return orders.data;
}
