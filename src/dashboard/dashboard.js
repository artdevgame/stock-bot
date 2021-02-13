import React from 'react';
import ReactDOM from 'react-dom';
import { CartesianGrid, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import DataTable from 'react-data-table-component';
import monthlyData from './monthly.json';
import topDividendsData from './top-dividends.json';

const columns = [
  {
    grow: 0,
    name: 'Instrument',
    selector: 'instrument',
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
  {
    name: 'Yield (%)',
    selector: 'dividendYield',
    sortable: true,
  },
  {
    name: 'BFB',
    selector: 'bangForBuck',
    sortable: true,
  },
  {
    cell: (row) => row.lastPaymentDate.slice(0, 10),
    name: 'Last Payment',
    selector: 'lastPaymentDate',
    sortable: true,
  },
];

const Label = ({ x, y, stroke, value }) => (
  <text x={x} y={y} dy={-10} fill="#0B486B" fontSize={14} fontWeight="bold" textAnchor="middle">
    {value}
  </text>
);

const Dashboard = () => (
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
      data={Object.values(topDividendsData)}
      defaultSortFieldId={5}
      defaultSortAsc={false}
      dense
      striped
      title="Dividend payees"
    />
  </>
);

ReactDOM.render(<Dashboard />, document.getElementById('dashboard'));
