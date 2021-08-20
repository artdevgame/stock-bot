import fetch from 'node-fetch';

import * as cache from '../helpers/cache';
import { RequiredCookie } from './client';
import { Transaction, TransactionsPayload } from './types';

interface FetchOrders {
  customerSession: string;
  loginToken: string;
  olderThan?: string;
  sessionId: string;
  userEmailToken: string;
}

export async function fetchOrders({
  customerSession,
  loginToken,
  olderThan,
  sessionId,
  userEmailToken,
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
        `${RequiredCookie.USER_EMAIL}=${userEmailToken}`,
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

    orders.data = [
      ...orders.data,
      ...(await fetchOrders({ customerSession, loginToken, sessionId, olderThan: date, userEmailToken })),
    ];
  }

  cache.writeToCache(orders.data, cacheOptions);

  return orders.data;
}
