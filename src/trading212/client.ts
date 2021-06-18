import config from 'config';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';
import cookieParser from 'set-cookie-parser';

import { AuthenticatedWebClient } from './types';

export enum RequiredCookie {
  CUSTOMER_SESSION = 'CUSTOMER_SESSION',
  LOGIN_TOKEN = 'LOGIN_TOKEN',
  SESSION_ID = 'TRADING212_SESSION_LIVE',
}

export interface AuthenticationProps {
  accountId?: number;
  customerSession: string;
  loginToken: string;
  mfaToken: MFAToken;
  sessionId: string;
}

interface MFAToken {
  decoded: string;
  name: string;
  value: string;
}

export async function authenticate(): Promise<AuthenticationProps | undefined> {
  try {
    const browser = await puppeteer.launch({ headless: Boolean(config.get('automation.headless')) });
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

    if (!mfaCookie) {
      throw new Error(`Unable to retrieve MFA from cookies`);
    }

    const mfaToken = {
      name: mfaCookie.name,
      value: mfaCookie.value,
      decoded: mfaCookie.value.replace(/\%22/g, ''),
    };

    return authenticateWebClient({ customerSession, loginToken, mfaToken, sessionId });
  } catch (err) {
    console.error(err);
  }
}

async function authenticateWebClient({ customerSession, loginToken, mfaToken, sessionId }: AuthenticationProps) {
  const authenticationRes = await fetch('https://live.trading212.com/rest/v1/webclient/authenticate', {
    headers: {
      Accept: 'application/json',
      Cookie: [
        `${RequiredCookie.CUSTOMER_SESSION}=${customerSession}`,
        `${RequiredCookie.LOGIN_TOKEN}=${loginToken}`,
        `${RequiredCookie.SESSION_ID}=${sessionId}`,
        `${mfaToken.name}=${mfaToken.value}`,
      ].join(';'),
      Host: 'live.trading212.com',
      Referer: 'https://live.trading212.com',
      'sec-ch-ua': '";Not\\A"Brand";v="99", "Chromium";v="88"',
      'sec-ch-ua-mobile': '?0',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Trader-Client': ['application=WC4', 'version=1.11.0', `dUUID=${mfaToken.decoded}`].join(','),
    },
  });

  if (!authenticationRes.ok) {
    throw new Error(`Unable to authenticate web client: ${authenticationRes.statusText}`);
  }

  const responseCookies = authenticationRes.headers.raw()['set-cookie'];

  if (!responseCookies) {
    throw new Error('No cookies found after authenticating web client');
  }

  const cookies = cookieParser.parse(responseCookies, { map: true });

  const result: AuthenticatedWebClient = await authenticationRes.json();

  return {
    accountId: result.accountId,
    customerSession: cookies[RequiredCookie.CUSTOMER_SESSION].value,
    loginToken,
    mfaToken,
    sessionId: cookies[RequiredCookie.SESSION_ID].value,
  };
}
