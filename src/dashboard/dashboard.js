import React from 'react';
import ReactDOM from 'react-dom';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from 'recharts';
import monthlyData from './monthly.json';

console.log(monthlyData);

const Dashboard = () => (
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
);

ReactDOM.render(<Dashboard />, document.getElementById('dashboard'));
