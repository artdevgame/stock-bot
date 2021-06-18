import React, { useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { CartesianGrid, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import DataTable from 'react-data-table-component';
import monthlyData from './monthly.json';
import topDividendsData from './top-dividends.json';
import dayjs from 'dayjs';

const columns = [
  {
    grow: 0,
    name: 'Symbol',
    selector: 'symbol',
    sortable: true,
  },
  {
    grow: 3,
    name: 'Name',
    selector: 'name',
    sortable: true,
  },
  {
    name: 'Payments',
    selector: 'numberOfPayments',
    sortable: true,
  },
  {
    name: 'Total',
    selector: 'total',
    sortable: true,
  },
  {
    name: 'Avg.',
    selector: 'averaged',
    sortable: true,
  },
  {
    name: 'Invested',
    selector: 'invested',
    sortable: true,
  },
  // {
  //   name: 'Yield (%)',
  //   selector: 'dividendYield',
  //   sortable: true,
  // },
  // {
  //   name: 'BFB',
  //   selector: 'bangForBuck',
  //   sortable: true,
  // },
  {
    cell: (row) => row.lastPaymentDate.slice(0, 10),
    name: 'Last Payment',
    selector: 'lastPaymentDate',
    sortable: true,
  },
  {
    name: 'Last Amount',
    selector: 'lastPaymentAmount',
    sortable: true,
  },
];

const getFilteredData = (data, filterFns) => {
  const filteredData = [];

  for (let rowId = 0; rowId < data.length; rowId++) {
    const payment = data[rowId];

    const isValid = filterFns.reduce((prev, fn) => {
      if (prev === false) return prev;
      return fn(prev) && payment;
    }, payment);

    if (isValid) filteredData.push(payment);
  }

  return filteredData;
};

const Label = ({ x, y, value }) => (
  <text x={x} y={y} dy={-10} fill="#0B486B" fontSize={14} fontWeight="bold" textAnchor="middle">
    {value}
  </text>
);

const Actions = ({ isMonthlyPayee, setMonthlyPayee, setTimeframe, timeframe }) => {
  const selectTimeframe = useCallback(
    (ev) => {
      ev.preventDefault();
      const { value } = ev.target;
      setTimeframe(value);
    },
    [setTimeframe],
  );

  const filterMonthlyButton = (
    <label className="label" key="filter-monthly">
      <input type="checkbox" onChange={() => setMonthlyPayee(!isMonthlyPayee)} checked={isMonthlyPayee} />
      &nbsp; Monthly Dividend
    </label>
  );

  const filterTimeframe = (
    <label className="label" key="filter-timeframe">
      Timeframe:
      <select onChange={selectTimeframe} value={timeframe}>
        <option value="all-time">Any</option>
        <option value="this-month">This month</option>
        <option value="last-month">Last month</option>
      </select>
    </label>
  );

  return (
    <div className="actions">
      {filterMonthlyButton}
      {filterTimeframe}
    </div>
  );
};

const Dashboard = () => {
  const data = Object.values(topDividendsData);
  const filters = [];

  const [isMonthlyPayee, setMonthlyPayee] = useState(true);
  const [timeframe, setTimeframe] = useState('all-time');

  if (isMonthlyPayee) filters.push((payment) => payment.numberOfPayments > 1);

  if (timeframe === 'this-month') {
    filters.push((payment) => dayjs(payment.lastPaymentDate).isSame(dayjs(), 'month'));
  }

  if (timeframe === 'last-month') {
    filters.push((payment) => dayjs(payment.lastPaymentDate).isSame(dayjs().subtract(1, 'month'), 'month'));
  }

  const filteredData = useMemo(() => getFilteredData(data, filters), [data, filters]);

  return (
    <>
      <ResponsiveContainer aspect={3 / 1}>
        <LineChart data={monthlyData} margin={{ right: 40, top: 20 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#E2DDD9" />
          <XAxis dataKey="label" fontSize={10} stroke="#97B8B6" strokeWidth={2} />
          <YAxis scale="linear" fontSize={10} padding={{ top: 40 }} width={40} stroke="#97B8B6" strokeWidth={2} />
          <Line
            dataKey="total"
            type="monotone"
            strokeWidth={3}
            isAnimationActive={false}
            stroke="#79BD9A"
            label={<Label />}
          />
        </LineChart>
      </ResponsiveContainer>
      <DataTable
        columns={columns}
        data={filteredData}
        defaultSortFieldId={5}
        defaultSortAsc={false}
        dense
        striped
        title="Dividend Payees"
        actions={
          <Actions
            isMonthlyPayee={isMonthlyPayee}
            setMonthlyPayee={setMonthlyPayee}
            setTimeframe={setTimeframe}
            timeframe={timeframe}
          />
        }
      />
    </>
  );
};

ReactDOM.render(<Dashboard />, document.getElementById('dashboard'));
