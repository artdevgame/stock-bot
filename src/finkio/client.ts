import fetch, { Response } from 'node-fetch';
import path from 'path';
import fs from 'fs';
import config from 'config';
import { round } from '../helpers/number';

interface FetchDividendsForInstrument {
  instrument: string;
}

interface FetchDividendIsin {
  instrument: string;
}

interface CalculateDividendYield {
  instrument: string;
  isin: string;
}

interface GetServiceResponsePath {
  filename: string;
  instrument: string;
}

type FetchDividendYield = CalculateDividendYield;

async function calculateDividendYield({ instrument, isin }: CalculateDividendYield) {
  const cachedPath = getServiceResponsePath({ filename: 'dividend-yield.txt', instrument });

  if (fs.existsSync(cachedPath)) {
    config.get('debug') && console.log('[CACHE HIT]', cachedPath);
    return Number(fs.readFileSync(cachedPath, { encoding: 'utf8' }));
  }

  try {
    const dividendInfo = await Promise.all([
      fetch(`https://finki.io/callAPI.php?isin=${isin}&key=${config.get('finkio.key')}&function=dividendAnnual`),
      fetch(`https://finki.io/callAPI.php?isin=${isin}&key=${config.get('finkio.key')}&function=bid`),
    ]);

    const [dividendAnnual, currentSellPrice] = await Promise.all(
      dividendInfo.map((res) => {
        if (!res.ok || hasError(res)) {
          throw new Error(`Unable to calculate dividendYield, FinkIO API responded poorly`);
        }
        return Number(res.text());
      }),
    );

    const dividendYield = round(dividendAnnual / currentSellPrice, 2);

    fs.writeFileSync(path.resolve(cachedPath), String(dividendYield), { encoding: 'utf8', flag: 'w' });

    return dividendYield;
  } catch (err) {
    console.error(err.message);
    return 0;
  }
}

async function fetchDividendIsin({ instrument }: FetchDividendIsin): Promise<string> {
  const cachedPath = getServiceResponsePath({ filename: 'isin.txt', instrument });

  if (fs.existsSync(cachedPath)) {
    config.get('debug') && console.log('[CACHE HIT]', cachedPath);
    return fs.readFileSync(cachedPath, { encoding: 'utf-8' });
  }

  const isinRes = await fetch(`https://finki.io/isinAPI.php?ticker=${instrument}`);

  if (!isinRes.ok || (await hasError(isinRes))) {
    throw new Error(`Unable to find isin with instrument: ${instrument}`);
  }

  const isin = (await isinRes.text()).trim();

  fs.writeFileSync(path.resolve(cachedPath), isin, {
    encoding: 'utf8',
    flag: 'w',
  });

  return isin;
}

async function fetchDividendYield({ instrument, isin }: FetchDividendYield) {
  const cachedPath = getServiceResponsePath({ filename: 'dividend-yield.txt', instrument });

  if (fs.existsSync(cachedPath)) {
    config.get('debug') && console.log('[CACHE HIT]', cachedPath);
    return Number(fs.readFileSync(cachedPath, { encoding: 'utf-8' }));
  }

  const dividendYieldRes = await fetch(
    `https://finki.io/callAPI.php?isin=${isin}&key=${config.get('finkio.key')}&function=dividendYield`,
  );

  if (!dividendYieldRes.ok) {
    throw new Error(`Unable to find company with instrument: ${instrument}`);
  }

  if (await hasError(dividendYieldRes)) {
    console.log('Unable to retrieve yield with `dividendYield` function', instrument);
    return calculateDividendYield({ instrument, isin });
  }

  const dividendYield = (await dividendYieldRes.text()).trim();

  fs.writeFileSync(path.resolve(cachedPath), dividendYield, {
    encoding: 'utf8',
    flag: 'w',
  });

  return Number(dividendYield);
}

function getServiceResponsePath({ filename, instrument }: GetServiceResponsePath) {
  const responsePath = `${__dirname}/.cache/${instrument}`;

  if (!fs.existsSync(responsePath)) {
    fs.mkdirSync(responsePath, { recursive: true });
  }

  return `${responsePath}/${filename}`;
}

async function hasError(apiResponse: Response) {
  const responseBody = (await apiResponse.clone().text()).toLowerCase();
  return (
    responseBody.includes('temporarilyunavailable') ||
    responseBody.includes('no.data.found') ||
    responseBody.includes('invalidorunrecognizedresponse')
  );
}

export async function fetchDividendsForInstrument({ instrument }: FetchDividendsForInstrument) {
  try {
    const isin = await fetchDividendIsin({ instrument });

    if (typeof isin === 'undefined') {
      throw new Error(`Couldn't match dividend on instrument name: ${instrument}`);
    }

    return fetchDividendYield({ instrument, isin });
  } catch (err) {
    console.error(err.message);
    return 0;
  }
}
