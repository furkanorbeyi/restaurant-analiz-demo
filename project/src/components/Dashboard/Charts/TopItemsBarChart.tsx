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

interface TopItemsBarChartProps {
  data: Array<{ itemName: string; revenue: number }>;
}

export const TopItemsBarChart = ({ data }: TopItemsBarChartProps) => {
  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        En Çok Satan Ürünler (Gelir)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="itemName"
            tick={{ fontSize: 11 }}
            stroke="#666"
            angle={-45}
            textAnchor="end"
            height={100}
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
            fill="#ed6c02"
            name="Gelir"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};
