import { Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MenuGroupBarChartProps {
  data: Array<{ menuGroup: string; revenue: number }>;
}

export const MenuGroupBarChart = ({ data }: MenuGroupBarChartProps) => {
  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Menü Gruplarına Göre Gelir
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="menuGroup"
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
          <Bar
            dataKey="revenue"
            fill="#2e7d32"
            name="Gelir"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};
