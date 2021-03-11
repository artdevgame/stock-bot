import fetch from 'node-fetch';
import config from 'config';
import * as cache from '../helpers/cache';
import { Dividend, FetchDividend, FetchInstrumentWithSymbol, Instrument } from './types';

interface GraphQLRequest {
  path?: string;
  query: string;
  variables?: unknown;
}

export async function request({ path = '/graphql', query, variables = {} }: GraphQLRequest) {
  const apiKey: string = config.get('stockBotApi.key');

  if (typeof apiKey === 'undefined' || !apiKey.trim()) {
    throw new Error(`Set 'stockBotApi.key' in config`);
  }

  const endpoint = `${config.get('stockBotApi.host')}${path}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, variables }),
    redirect: 'follow',
  });

  if (!response.ok) {
    const error = `${response.statusText} (${response.status})`;
    throw new Error(`Unable to query StockBot API: ${error}`);
  }

  const { data, errors } = await response.json();

  if (typeof errors !== 'undefined' && errors.length) {
    throw new Error(`Error whilst querying StockBot API: ${errors[0].message}`);
  }

  return data;
}

export async function fetchInstrument({ symbol }: FetchInstrumentWithSymbol) {
  const cacheOptions = {
    filename: `${symbol}.json`,
    path: `${__dirname}/.cache/instruments`,
    purgeDate: cache.NeverPurge,
  };

  cache.pruneCache({ path: cacheOptions.path });

  const cachedInstrument = cache.readFromCache(cacheOptions);

  if (typeof cachedInstrument !== 'undefined') {
    return cachedInstrument as Instrument;
  }

  const instrumentQuery = `
    query {
      fetchInstrumentWithSymbol(symbol: "${symbol}") {
        id
      }
    }
  `;

  const instrumentRes = await request({ query: instrumentQuery });
  const result = instrumentRes.fetchInstrumentWithSymbol;

  cache.writeToCache(result, cacheOptions);

  return result as Instrument;
}

export async function fetchDividend({ instrument }: FetchDividend) {
  const { id } = instrument;

  const cacheOptions = {
    filename: `${id}.json`,
    path: `${__dirname}/.cache/dividends`,
  };

  cache.pruneCache({ path: cacheOptions.path });

  const cachedDividend = cache.readFromCache(cacheOptions);

  if (typeof cachedDividend !== 'undefined') {
    return cachedDividend as Dividend;
  }

  const dividendQuery = `
    query {
      fetchDividend(id: "${id}") {
        dividendYield
      }
    }
  `;

  const dividendRes = await request({ query: dividendQuery });
  const result = dividendRes.fetchDividend;

  cache.writeToCache(result, cacheOptions);

  return result as Dividend;
}
