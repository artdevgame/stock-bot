import React from 'react';
import ReactDOM from 'react-dom';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from 'recharts';
import DataTable from 'react-data-table-component';
import monthlyData from './monthly.json';
import topDividendsData from './top-dividends.json';

const columns = [
  {
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
    name: 'Last Payment',
    selector: 'lastPaymentDate',
    sortable: true,
  },
];

const Dashboard = () => (
  <>
    <ResponsiveContainer aspect={4 / 1}>
      <BarChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis scale="linear" padding={{ top: 40 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="total" fill="#3da4ab" type="monotone" label barSize={100} />
      </BarChart>
    </ResponsiveContainer>
    <DataTable
      columns={columns}
      data={Object.values(topDividendsData)}
      defaultSortFieldId={3}
      defaultSortAsc={false}
      dense
      striped
      title="Dividend payees"
    />
  </>
);

ReactDOM.render(<Dashboard />, document.getElementById('dashboard'));
