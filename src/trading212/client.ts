import config from 'config';
import puppeteer from 'puppeteer';

export enum RequiredCookie {
  CUSTOMER_SESSION = 'CUSTOMER_SESSION',
  LOGIN_TOKEN = 'LOGIN_TOKEN',
  SESSION_ID = 'TRADING212_SESSION_LIVE',
}

export async function authenticate() {
  try {
    const browser = await puppeteer.launch({ headless: config.get('automation.headless') });
    const page = await browser.newPage();

    await page.goto('https://www.trading212.com/en/login');

    await page.type('#username-real', config.get('form.username'), { delay: config.get('automation.typingDelay') });
    await page.type('#pass-real', config.get('form.password'), { delay: config.get('automation.typingDelay') });
    await page.click('.button-login');

    await page.waitForNavigation({ waitUntil: 'load' });

    const cookies = await page.cookies();

    const customerSession = cookies.find((cookie) => cookie.name === RequiredCookie.CUSTOMER_SESSION)?.value;
    const loginToken = cookies.find((cookie) => cookie.name === RequiredCookie.LOGIN_TOKEN)?.value;
    const sessionId = cookies.find((cookie) => cookie.name === RequiredCookie.SESSION_ID)?.value;

    await browser.close();

    if (!customerSession) {
      throw new Error(`Unable to retrieve ${RequiredCookie.CUSTOMER_SESSION} from cookies`);
    }

    if (!loginToken) {
      throw new Error(`Unable to retrieve ${RequiredCookie.LOGIN_TOKEN} from cookies`);
    }

    if (!sessionId) {
      throw new Error(`Unable to retrieve ${RequiredCookie.SESSION_ID} from cookies`);
    }

    return {
      customerSession,
      loginToken,
      sessionId,
    };
  } catch (err) {
    console.error(err);
  }
}
