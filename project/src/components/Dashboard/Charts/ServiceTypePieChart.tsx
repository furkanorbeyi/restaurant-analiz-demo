import { Paper, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ServiceTypePieChartProps {
  data: Array<{ serviceType: string; revenue: number }>;
}

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f'];

export const ServiceTypePieChart = ({ data }: ServiceTypePieChartProps) => {
  const chartData = data.map((item) => ({
    name: item.serviceType,
    value: item.revenue,
  }));

  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Servis Türüne Göre Gelir Payı
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `₺${value.toFixed(2)}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};
