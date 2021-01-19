import config from 'config';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

enum RequiredCookie {
  CUSTOMER_SESSION = 'CUSTOMER_SESSION',
  LOGIN_TOKEN = 'LOGIN_TOKEN',
  SESSION_ID = 'TRADING212_SESSION_LIVE',
}

interface FetchDividends {
  customerSession: string;
  loginToken: string;
  olderThan?: string;
  sessionId: string;
}

interface T212Dividend {
  heading: {
    key: 'history.dividend.heading';
    context: null;
    meta: null;
  };
  subHeading: {
    key: 'history.instrument';
    context: {
      quantityPrecision: number; // 8
      baseCode: null;
      prettyName: string; // 'GlaxoSmithKline'
      precision: number; // 1
      treeType: string; // 'STOCK'
      instrument: string; // 'GSK'
      instrumentBadge: string; // 'EQ'
      instrumentCode: string; // 'GSKl_EQ'
    };
    meta: null;
  };
  mainInfo: {
    key: 'history.currency-amount';
    context: {
      amount: number; // 0.38
      applyPositiveSign: boolean;
    };
    meta: null;
  };
  additionalInfo: null;
  date: string; // "2021-01-19T15:56:55+02:00"
  detailsPath: string; // '/dividends/ddb02d78-aa48-4213-8f3a-9a28a9c6ea3a';
}

interface T212DividendsPayload {
  data: T212Dividend[];
  hasNext: boolean;
  footer: unknown;
}

const OUTPUT_API_RESPONSE = `${__dirname}/api-response/dividends.json`;

const fetchDividends = async ({
  customerSession,
  loginToken,
  olderThan,
  sessionId,
}: FetchDividends): Promise<T212Dividend[]> => {
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

  const dividends: T212DividendsPayload = await dividendsRes.json();

  if (dividends.hasNext) {
    const totalDividends = dividends.data.length;
    const lastDividend = dividends.data[totalDividends - 1];
    const { date } = lastDividend;

    dividends.data = [
      ...dividends.data,
      ...(await fetchDividends({ customerSession, loginToken, sessionId, olderThan: date })),
    ];
  }

  return dividends.data;
};

const run = async () => {
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

    const dividends = await fetchDividends({ customerSession, loginToken, sessionId });

    fs.writeFileSync(path.resolve(OUTPUT_API_RESPONSE), JSON.stringify(dividends, null, 2), {
      encoding: 'utf8',
      flag: 'w',
    });
  } catch (err) {
    console.error(err);
  }
};

run();
