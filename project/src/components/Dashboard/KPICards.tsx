import { Paper, Typography, Box, Grid } from '@mui/material';
import { TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import { KPIData } from '../../types';

interface KPICardsProps {
  data: KPIData;
}

export const KPICards = ({ data }: KPICardsProps) => {
  const cards = [
    {
      title: 'Toplam Gelir',
      value: `₺${data.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: '#1976d2',
      bgColor: '#e3f2fd',
    },
    {
      title: 'Ortalama Sipariş Tutarı',
      value: `₺${data.averageOrder.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: '#2e7d32',
      bgColor: '#e8f5e9',
    },
    {
      title: 'Sipariş Sayısı',
      value: data.orderCount.toLocaleString('tr-TR'),
      icon: ShoppingCart,
      color: '#ed6c02',
      bgColor: '#fff3e0',
    },
  ];

  return (
    <Grid container spacing={3}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: card.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <Icon size={28} color={card.color} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {card.title}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
};
