import config from 'config';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import cookieParser from 'set-cookie-parser';

import { AuthenticatedWebClient } from './types';

export enum RequiredCookie {
  CUSTOMER_SESSION = 'CUSTOMER_SESSION',
  LOGIN_TOKEN = 'LOGIN_TOKEN',
  SESSION_ID = 'TRADING212_SESSION_LIVE',
  USER_EMAIL = 'USER_EMAIL',
}

interface AuthenticationProps {
  accountId?: number;
  ampToken: AMPToken;
  loginToken: string;
  mfaToken: MFAToken;
  sessionId: string;
  userEmailToken: string;
}

interface AMPToken {
  name: string;
  value: string;
}

interface MFAToken {
  decoded: string;
  name: string;
  value: string;
}

export async function authenticate() {
  try {
    const browser = await puppeteer.launch({ headless: Boolean(config.get('automation.headless')) });
    const page = await browser.newPage();

    await page.goto('https://www.trading212.com/en/login');

    await page.type('input[name="email"]', config.get('form.username'), {
      delay: config.get('automation.typingDelay'),
    });
    await page.type('input[name="password"]', config.get('form.password'), {
      delay: config.get('automation.typingDelay'),
    });
    await page.click('input[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'load' });

    const authenticatedWebClientRes = await page.waitForResponse(
      'https://live.trading212.com/rest/v1/webclient/authenticate',
    );
    const { accountId } = (await authenticatedWebClientRes.json()) as AuthenticatedWebClient;

    const cookies = await page.cookies();

    const customerSession = cookies.find((cookie) => cookie.name === RequiredCookie.CUSTOMER_SESSION)?.value;
    const loginToken = cookies.find((cookie) => cookie.name === RequiredCookie.LOGIN_TOKEN)?.value;
    const sessionId = cookies.find((cookie) => cookie.name === RequiredCookie.SESSION_ID)?.value;
    const userEmailToken = cookies.find((cookie) => cookie.name === RequiredCookie.USER_EMAIL)?.value;
    const ampCookie = cookies.find((cookie) => /amp_/.test(cookie.name));
    const mfaCookie = cookies.find((cookie) => /([a-z0-9]+)/.test(cookie.name) && cookie.value.includes('%22'));

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

    if (!userEmailToken) {
      throw new Error(`Unable to retrieve ${RequiredCookie.USER_EMAIL} from cookies`);
    }

    if (!ampCookie) {
      throw new Error('Unable to retrieve AMP cookie');
    }

    if (!mfaCookie) {
      throw new Error(`Unable to retrieve MFA from cookies`);
    }

    const ampToken = {
      name: ampCookie.name,
      value: ampCookie.value,
    };

    const mfaToken = {
      name: mfaCookie.name,
      value: mfaCookie.value,
      decoded: mfaCookie.value.replace(/\%22/g, ''),
    };

    return {
      accountId,
      ampToken,
      customerSession,
      loginToken,
      mfaToken,
      sessionId,
      userEmailToken,
    };
  } catch (err) {
    console.error(err);
  }
}
