export interface SubHeadingBuy {
  context: {
    amount: number; // 720
    amountPrecision: number; // 2
    quantity: number; // 72.832867
    quantityPrecision: number; // 8
  };
  key: 'history.order.filled.buy';
  meta: null;
}

export interface SubHeadingInstrument {
  context: {
    baseCode: null;
    instrument: string; // 'GSK'
    instrumentBadge: string; // 'EQ'
    instrumentCode: string; // 'GSKl_EQ'
    precision: number; // 1
    prettyName: string; // 'GlaxoSmithKline'
    quantityPrecision: number; // 8
    treeType: string; // 'STOCK'
  };
  key: 'history.instrument';
  meta: null;
}

export interface SubHeadingSell {
  context: {
    quantity: number; // 0.38262348
    quantityPrecision: number; // 8
  };
  key: 'history.order.filled.sell';
  meta: null;
}

export interface Transaction {
  additionalInfo: {
    context: null;
    key: string; // history.order.status.filled | history.order.status.cancelled
    meta: null;
  } | null;
  date: string; // "2021-01-19T15:56:55+02:00"
  detailsPath: string; // '/dividends/ddb02d78-aa48-4213-8f3a-9a28a9c6ea3a';
  heading: {
    key: 'history.dividend.heading';
    context: null;
    meta: null;
  };
  mainInfo: {
    key: string; // history.currency-amount | history.blank
    context: {
      amount: number; // 0.38
      applyPositiveSign: boolean;
    };
    meta: null;
  };
  subHeading: SubHeadingBuy | SubHeadingInstrument | SubHeadingSell;
}

export interface TransactionsPayload {
  data: Transaction[];
  hasNext: boolean;
  footer: unknown;
}
