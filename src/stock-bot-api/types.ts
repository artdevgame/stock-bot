export interface Dividend {
  dividendYield: number;
}

export interface FetchDividend {
  instrument: Instrument;
}

export interface FetchInstrumentWithIsin {
  isin: string;
}

export interface FetchInstrumentWithSymbol {
  symbol: string;
}

export interface Instrument {
  id: string;
}
