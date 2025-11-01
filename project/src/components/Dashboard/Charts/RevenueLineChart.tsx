import { Paper, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RevenueLineChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export const RevenueLineChart = ({ data }: RevenueLineChartProps) => {
  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Gelir Trendi (Zaman Serisi)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#666"
            tickFormatter={(value) => `₺${value}`}
          />
          <Tooltip
            formatter={(value: number) => [`₺${value.toFixed(2)}`, 'Gelir']}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#1976d2"
            strokeWidth={2}
            dot={{ fill: '#1976d2', r: 4 }}
            activeDot={{ r: 6 }}
            name="Gelir"
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
};
