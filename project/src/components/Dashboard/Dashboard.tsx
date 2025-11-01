import { useState, useEffect } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { supabase } from '../../lib/supabase';
import { Order, FilterState, KPIData } from '../../types';
import { DashboardLayout } from './DashboardLayout';
import { NewOrderForm } from './NewOrderForm';
import { KPICards } from './KPICards';
import { FilterSection } from './FilterSection';
import { RevenueLineChart } from './Charts/RevenueLineChart';
import { MenuGroupBarChart } from './Charts/MenuGroupBarChart';
import { ServiceTypePieChart } from './Charts/ServiceTypePieChart';
import { TopItemsBarChart } from './Charts/TopItemsBarChart';
import { Chatbot } from './Chatbot';
import { SeedDemoDataButton } from './SeedDemoDataButton';
import { format, parseISO } from 'date-fns';

export const Dashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuGroups, setMenuGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    startDate: null,
    endDate: null,
    period: 'Gün',
    menuGroup: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: true });

      if (ordersError) throw ordersError;

      if (ordersData) {
        setOrders(ordersData);
        const groups = [...new Set(ordersData.map((order) => order.menu_group))];
        setMenuGroups(groups);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = (): Order[] => {
    let filtered = [...orders];

    if (filters.startDate) {
      filtered = filtered.filter(
        (order) => new Date(order.order_date) >= filters.startDate!
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (order) => new Date(order.order_date) <= filters.endDate!
      );
    }

    if (filters.menuGroup) {
      filtered = filtered.filter((order) => order.menu_group === filters.menuGroup);
    }

    return filtered;
  };

  const calculateKPIs = (): KPIData => {
    const filtered = getFilteredOrders();
    const totalRevenue = filtered.reduce((sum, order) => sum + Number(order.amount), 0);
    const orderCount = filtered.length;
    const averageOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

    return { totalRevenue, averageOrder, orderCount };
  };

  const getRevenueLineData = () => {
    const filtered = getFilteredOrders();
    const grouped = filtered.reduce((acc, order) => {
      const date = order.order_date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += Number(order.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, revenue]) => ({
        date: format(parseISO(date), 'dd/MM/yyyy'),
        revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getMenuGroupData = () => {
    const filtered = getFilteredOrders();
    const grouped = filtered.reduce((acc, order) => {
      if (!acc[order.menu_group]) {
        acc[order.menu_group] = 0;
      }
      acc[order.menu_group] += Number(order.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([menuGroup, revenue]) => ({ menuGroup, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const getServiceTypeData = () => {
    const filtered = getFilteredOrders();
    const grouped = filtered.reduce((acc, order) => {
      if (!acc[order.service_type]) {
        acc[order.service_type] = 0;
      }
      acc[order.service_type] += Number(order.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([serviceType, revenue]) => ({
      serviceType,
      revenue,
    }));
  };

  const getTopItemsData = () => {
    const filtered = getFilteredOrders();
    const grouped = filtered.reduce((acc, order) => {
      if (!acc[order.item_name]) {
        acc[order.item_name] = 0;
      }
      acc[order.item_name] += Number(order.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([itemName, revenue]) => ({ itemName, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* First row: form + KPI cards */}
      <Box sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
        mb: 3,
      }}>
        <Box>
          <NewOrderForm onOrderAdded={fetchData} />
        </Box>
        <Box>
          <KPICards data={calculateKPIs()} />
        </Box>
      </Box>

      {/* Filters + seed button */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box sx={{ flex: 1 }}>
            <FilterSection
              filters={filters}
              onFilterChange={setFilters}
              menuGroups={menuGroups}
            />
          </Box>
          <SeedDemoDataButton onDone={fetchData} />
        </Stack>
      </Box>

      {/* Charts grid */}
      <Box sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
      }}>
        <Box>
          <RevenueLineChart data={getRevenueLineData()} />
        </Box>
        <Box>
          <MenuGroupBarChart data={getMenuGroupData()} />
        </Box>
        <Box>
          <ServiceTypePieChart data={getServiceTypeData()} />
        </Box>
        <Box>
          <TopItemsBarChart data={getTopItemsData()} />
        </Box>
      </Box>

      <Chatbot />
    </DashboardLayout>
  );
};
