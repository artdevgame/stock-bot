import fetch from 'node-fetch';
import { parse, HTMLElement } from 'node-html-parser';
import path from 'path';
import fs from 'fs';
import { Meta } from './types';
import { round } from '../helpers/number';
import config from 'config';

interface Dividend {
  dividendYield: number;
  forecastAccuracy: number;
}

interface FetchDividendsForInstrument {
  instrument: string;
}

interface FetchDividendMeta {
  instrument: string;
}

interface FetchDividend {
  instrument: string;
  name: string;
  urlPath: string;
}

interface ParseDividend {
  dividendInfo: string;
}

interface GetServiceResponsePath {
  filename: string;
  instrument: string;
}

function getPercentageValue(el: HTMLElement) {
  const value = round(Number(el.text.replace('%', '')) / 100);
  return isNaN(value) ? 0 : value;
}

function getServiceResponsePath({ filename, instrument }: GetServiceResponsePath) {
  const responsePath = `${__dirname}/.cache/${instrument}`;

  if (!fs.existsSync(responsePath)) {
    fs.mkdirSync(responsePath, { recursive: true });
  }

  return `${responsePath}/${filename}`;
}

async function fetchDividendMeta({ instrument }: FetchDividendMeta): Promise<Meta[]> {
  const cachedPath = getServiceResponsePath({ filename: 'dividend-meta.json', instrument });

  if (fs.existsSync(cachedPath)) {
    config.get('debug') && console.log('[CACHE HIT]', cachedPath);
    return JSON.parse(fs.readFileSync(cachedPath, { encoding: 'utf-8' })) as Meta[];
  }

  const companyRes = await fetch(`https://www.dividendmax.com/suggest.json?q=${instrument}`);

  if (!companyRes.ok) {
    throw new Error(`Unable to find company with instrument: ${instrument}`);
  }

  const company = await companyRes.json();

  fs.writeFileSync(path.resolve(cachedPath), JSON.stringify(company, null, 2), {
    encoding: 'utf8',
    flag: 'w',
  });

  return company;
}

async function fetchDividend({ instrument, name, urlPath }: FetchDividend) {
  const cachedPath = getServiceResponsePath({ filename: 'dividend.html', instrument });

  if (fs.existsSync(cachedPath)) {
    config.get('debug') && console.log('[CACHE HIT]', cachedPath);
    return fs.readFileSync(cachedPath, { encoding: 'utf8' });
  }

  const dividendInfoRes = await fetch(`https://www.dividendmax.com${urlPath}`);

  if (!dividendInfoRes.ok) {
    throw new Error(`Unable to retrieve dividend info: ${name} (${instrument})`);
  }

  const dividendInfo = await dividendInfoRes.text();

  fs.writeFileSync(path.resolve(cachedPath), dividendInfo, { encoding: 'utf8', flag: 'w' });

  return dividendInfo;
}

function parseDividend({ dividendInfo }: ParseDividend): Dividend {
  const dividend = {
    dividendYield: 0,
    forecastAccuracy: 0,
  };

  const document = parse(dividendInfo);
  const highlights = document.querySelectorAll('.landing-card');

  const dividendYieldContainer = highlights.find((parent) =>
    parent.querySelector('.mdc-theme--secondary').text.includes('Yield'),
  );
  const forecastAccuracyContainer = highlights.find((parent) =>
    parent.querySelector('.mdc-theme--secondary').text.includes('Accuracy'),
  );

  if (typeof dividendYieldContainer !== 'undefined') {
    dividend.dividendYield = getPercentageValue(dividendYieldContainer.querySelector('.mdc-typography--headline3'));
  }

  if (typeof forecastAccuracyContainer !== 'undefined') {
    dividend.forecastAccuracy = getPercentageValue(
      forecastAccuracyContainer.querySelector('.mdc-typography--headline3'),
    );
  }

  return dividend;
}

export async function fetchDividendsForInstrument({ instrument }: FetchDividendsForInstrument) {
  try {
    const dividendMeta = await fetchDividendMeta({ instrument });
    const company = dividendMeta.find((meta) => meta.ticker === instrument);

    if (typeof company === 'undefined') {
      throw new Error(`Couldn't match dividend on instrument name: ${instrument}`);
    }

    const { name, path: urlPath, ticker } = company;

    if (ticker !== instrument) {
      throw new Error(`Instrument mismatch. Requested: ${instrument}, Received: ${ticker}`);
    }

    const dividendInfo = await fetchDividend({ instrument, name, urlPath });
    return parseDividend({ dividendInfo });
  } catch (err) {
    console.error(err.message);
  }
}
