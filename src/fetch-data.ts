import { authenticate } from './trading212/client';
import { fetchDividends } from './trading212/dividends';
import { fetchOrders } from './trading212/orders';

async function run() {
  try {
    const tokens = await authenticate();

    if (typeof tokens === 'undefined') {
      return;
    }

    const { customerSession, loginToken, sessionId } = tokens;

    await fetchDividends({ customerSession, loginToken, sessionId });
    await fetchOrders({ customerSession, loginToken, sessionId });
  } catch (err) {
    console.error(err);
  }
}

run();
