export interface MenuItem {
  id: string;
  name: string;
  menu_group: string;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  menu_item_id: string | null;
  menu_group: string;
  service_type: string;
  item_name: string;
  amount: number;
  order_date: string;
  created_at: string;
}

export interface FilterState {
  startDate: Date | null;
  endDate: Date | null;
  period: 'Gün' | 'Ay';
  menuGroup: string;
}

export interface KPIData {
  totalRevenue: number;
  averageOrder: number;
  orderCount: number;
}
