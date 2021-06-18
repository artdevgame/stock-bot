import { authenticate } from './trading212/client';
import { fetchDividends } from './trading212/dividends';
import { fetchOrders } from './trading212/orders';

async function run() {
  try {
    const authenticatedProps = await authenticate();

    if (typeof authenticatedProps === 'undefined') {
      return;
    }

    await fetchDividends(authenticatedProps);
    await fetchOrders(authenticatedProps);

    console.log('[Process completed: Data retrieved from T212]');
  } catch (err) {
    console.error(err);
  }
}

run();
