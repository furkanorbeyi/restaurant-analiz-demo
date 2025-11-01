import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export type DateRange = { start?: string; end?: string };

function toDateString(d: Date) { return d.toISOString().slice(0,10); }

export function computeRange(range: '7d'|'30d'|'month'|'thisWeek'|'lastWeek'|'today'|'yesterday'|'thisYear'|'lastMonth'|null): DateRange {
  if (!range) return {};
  const today = new Date();
  const toDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfWeek = (d: Date) => {
    const tmp = toDate(d);
    const day = tmp.getDay(); // 0 Sun - 6 Sat
    const diff = (day + 6) % 7; // make Monday start
    tmp.setDate(tmp.getDate() - diff);
    return tmp;
  };
  if (range === '7d') {
    const start = new Date();
    start.setDate(today.getDate() - 6);
    return { start: toDateString(start), end: toDateString(today) };
  }
  if (range === '30d') {
    const start = new Date();
    start.setDate(today.getDate() - 29);
    return { start: toDateString(start), end: toDateString(today) };
  }
  if (range === 'today') {
    const s = toDate(today);
    return { start: toDateString(s), end: toDateString(s) };
  }
  if (range === 'yesterday') {
    const s = toDate(today);
    s.setDate(s.getDate() - 1);
    return { start: toDateString(s), end: toDateString(s) };
  }
  if (range === 'thisWeek') {
    const s = startOfWeek(today);
    return { start: toDateString(s), end: toDateString(today) };
  }
  if (range === 'lastWeek') {
    const end = startOfWeek(today);
    const s = new Date(end);
    s.setDate(end.getDate() - 7);
    const e = new Date(end);
    e.setDate(end.getDate() - 1);
    return { start: toDateString(s), end: toDateString(e) };
  }
  if (range === 'lastMonth') {
    const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endLastMonth = new Date(firstThisMonth);
    endLastMonth.setDate(0); // last day previous month
    return { start: toDateString(firstLastMonth), end: toDateString(endLastMonth) };
  }
  if (range === 'thisYear') {
    const start = new Date(today.getFullYear(), 0, 1);
    return { start: toDateString(start), end: toDateString(today) };
  }
  // month
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: toDateString(start), end: toDateString(today) };
}

type OrderRow = {
  user_id: string;
  amount: number;
  menu_group: string;
  service_type: string;
  item_name: string;
  order_date: string;
};

export async function getOrders(userId: string, dr: DateRange): Promise<OrderRow[]> {
  if (!supabaseAdmin) throw new Error('SUPABASE_NOT_CONFIGURED');
  let q = supabaseAdmin.from('orders').select('user_id,amount,menu_group,service_type,item_name,order_date').eq('user_id', userId).limit(5000);
  if (dr.start) q = q.gte('order_date', dr.start);
  if (dr.end) q = q.lte('order_date', dr.end);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getSummary(userId: string, dr: DateRange) {
  const rows = await getOrders(userId, dr);
  const totalRevenue = rows.reduce((s: number, r: OrderRow) => s + Number(r.amount || 0), 0);
  const orderCount = rows.length;
  const averageOrder = orderCount ? totalRevenue / orderCount : 0;
  return { totalRevenue, orderCount, averageOrder };
}

export async function getTopItems(userId: string, dr: DateRange, limit = 5) {
  const rows = await getOrders(userId, dr);
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.item_name as string;
    map.set(key, (map.get(key) || 0) + Number(r.amount || 0));
  }
  return [...map.entries()].map(([item, revenue]) => ({ item, revenue }))
    .sort((a,b) => b.revenue - a.revenue).slice(0, limit);
}

export async function getMenuGroupTotals(userId: string, dr: DateRange) {
  const rows = await getOrders(userId, dr);
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.menu_group as string;
    map.set(key, (map.get(key) || 0) + Number(r.amount || 0));
  }
  return [...map.entries()].map(([menuGroup, revenue]) => ({ menuGroup, revenue }))
    .sort((a,b) => b.revenue - a.revenue);
}

export async function getServiceTypeTotals(userId: string, dr: DateRange) {
  const rows = await getOrders(userId, dr);
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.service_type as string;
    map.set(key, (map.get(key) || 0) + Number(r.amount || 0));
  }
  return [...map.entries()].map(([serviceType, revenue]) => ({ serviceType, revenue }));
}

// --- NL→Structured query (safe, server-side aggregation) ---
export type GroupBy = 'none' | 'day' | 'menu_group' | 'service_type' | 'item_name';
export type Metric = 'sum' | 'avg' | 'count';
export type QueryFilters = {
  menu_group?: string;
  item_name?: string;
  service_type?: string;
};
export type QuerySpec = {
  metric: Metric;
  field?: 'amount';
  groupBy?: GroupBy;
  limit?: number;
  range?: DateRange;
  filters?: QueryFilters;
};

export async function runQuerySpec(userId: string, spec: QuerySpec) {
  const groupBy: GroupBy = spec.groupBy ?? 'none';
  const metric: Metric = spec.metric;
  const field = spec.field ?? 'amount';
  const limit = Math.max(1, Math.min(100, spec.limit ?? 20));
  const dr: DateRange = spec.range ?? {};

  const rows = await getOrders(userId, dr);
  const filtered = rows.filter((r) => {
    if (spec.filters?.menu_group && r.menu_group !== spec.filters.menu_group) return false;
    if (spec.filters?.item_name && r.item_name !== spec.filters.item_name) return false;
    if (spec.filters?.service_type && r.service_type !== spec.filters.service_type) return false;
    return true;
  });

  const valueOf = (items: OrderRow[]) => {
    if (metric === 'count') return items.length;
    const total = items.reduce((s, it) => s + Number((it as any)[field] || 0), 0);
    if (metric === 'sum') return Number(total.toFixed(2));
    // avg
    const avg = items.length ? total / items.length : 0;
    return Number(avg.toFixed(2));
  };

  if (groupBy === 'none') {
    const value = valueOf(filtered);
    return { rows: [{ value }], unit: field, metric, groupBy };
  }

  type Key = string;
  const map = new Map<Key, OrderRow[]>();
  const keyOf = (r: OrderRow): Key => {
    if (groupBy === 'day') return r.order_date;
    return (r as any)[groupBy] as string;
  };
  for (const r of filtered) {
    const k = keyOf(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const entries = [...map.entries()].map(([k, arr]) => ({ key: k, value: valueOf(arr) }));
  entries.sort((a, b) => Number(b.value) - Number(a.value));
  const limited = entries.slice(0, limit);
  return { rows: limited, unit: field, metric, groupBy };
}

export async function getLastOrderStats(userId: string, dr: DateRange) {
  const rows = await getOrders(userId, dr);
  if (!rows.length) return null;
  // Find max date
  const dates = rows.map(r => r.order_date).sort();
  const lastDate = dates[dates.length - 1];
  const sameDay = rows.filter(r => r.order_date === lastDate);
  const count = sameDay.length;
  const totalRevenue = sameDay.reduce((s, r) => s + Number(r.amount || 0), 0);
  return { date: lastDate, count, totalRevenue: Number(totalRevenue.toFixed(2)) };
}

// --- SQL-based full context (richer grounding for LLM) ---
export type FullContext = {
  totalOrders: number;
  distinctMenuGroups: number;
  distinctItems: number;
  distinctServiceTypes: number;
  mostOrderedItem: { item_name: string; count: number } | null;
  lastMonthTopMenuGroup: { menu_group: string; count: number } | null;
  lastMonthTopItem: { item_name: string; count: number } | null;
  lastMonthOrderCount: number;
  hasHighVolumeLastMonth: boolean; // e.g., ≥450 orders in last month for this user
};

export async function getFullContext(userId: string): Promise<FullContext> {
  if (!supabaseAdmin) throw new Error('SUPABASE_NOT_CONFIGURED');

  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const oneMonthAgoStr = toDateString(oneMonthAgo);

  // Run multiple aggregations in parallel
  const [
    totalOrdersRes,
    distinctMenuGroupsRes,
    distinctItemsRes,
    distinctServiceTypesRes,
    mostOrderedItemRes,
    lastMonthTopMenuGroupRes,
    lastMonthTopItemRes,
    lastMonthOrderCountRes,
  ] = await Promise.all([
    // Total orders for user
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    // Distinct menu_group
    supabaseAdmin.from('orders').select('menu_group').eq('user_id', userId),
    // Distinct item_name
    supabaseAdmin.from('orders').select('item_name').eq('user_id', userId),
    // Distinct service_type
    supabaseAdmin.from('orders').select('service_type').eq('user_id', userId),
    // Most ordered item overall (all-time)
    supabaseAdmin.from('orders').select('item_name').eq('user_id', userId),
    // Last month top menu_group
    supabaseAdmin.from('orders').select('menu_group').eq('user_id', userId).gte('order_date', oneMonthAgoStr),
    // Last month top item_name
    supabaseAdmin.from('orders').select('item_name').eq('user_id', userId).gte('order_date', oneMonthAgoStr),
    // Last month order count
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('order_date', oneMonthAgoStr),
  ]);

  const totalOrders = totalOrdersRes.count ?? 0;

  const distinctMenuGroups = new Set((distinctMenuGroupsRes.data || []).map((r: any) => r.menu_group)).size;
  const distinctItems = new Set((distinctItemsRes.data || []).map((r: any) => r.item_name)).size;
  const distinctServiceTypes = new Set((distinctServiceTypesRes.data || []).map((r: any) => r.service_type)).size;

  // Most ordered item (all-time): count by item_name
  const itemCounts = new Map<string, number>();
  (mostOrderedItemRes.data || []).forEach((r: any) => {
    const name = r.item_name as string;
    itemCounts.set(name, (itemCounts.get(name) || 0) + 1);
  });
  const mostOrderedItem = itemCounts.size > 0
    ? [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    : null;

  // Last month top menu_group: count by menu_group
  const menuGroupCountsLastMonth = new Map<string, number>();
  (lastMonthTopMenuGroupRes.data || []).forEach((r: any) => {
    const name = r.menu_group as string;
    menuGroupCountsLastMonth.set(name, (menuGroupCountsLastMonth.get(name) || 0) + 1);
  });
  const lastMonthTopMenuGroup = menuGroupCountsLastMonth.size > 0
    ? [...menuGroupCountsLastMonth.entries()].sort((a, b) => b[1] - a[1])[0]
    : null;

  // Last month top item_name
  const itemCountsLastMonth = new Map<string, number>();
  (lastMonthTopItemRes.data || []).forEach((r: any) => {
    const name = r.item_name as string;
    itemCountsLastMonth.set(name, (itemCountsLastMonth.get(name) || 0) + 1);
  });
  const lastMonthTopItem = itemCountsLastMonth.size > 0
    ? [...itemCountsLastMonth.entries()].sort((a, b) => b[1] - a[1])[0]
    : null;

  const lastMonthOrderCount = lastMonthOrderCountRes.count ?? 0;
  const hasHighVolumeLastMonth = lastMonthOrderCount >= 450;

  return {
    totalOrders,
    distinctMenuGroups,
    distinctItems,
    distinctServiceTypes,
    mostOrderedItem: mostOrderedItem ? { item_name: mostOrderedItem[0], count: mostOrderedItem[1] } : null,
    lastMonthTopMenuGroup: lastMonthTopMenuGroup ? { menu_group: lastMonthTopMenuGroup[0], count: lastMonthTopMenuGroup[1] } : null,
    lastMonthTopItem: lastMonthTopItem ? { item_name: lastMonthTopItem[0], count: lastMonthTopItem[1] } : null,
    lastMonthOrderCount,
    hasHighVolumeLastMonth,
  };
}

// --- Window helper: min/max order_date for a user ---
export async function getWindow(userId: string): Promise<DateRange> {
  if (!supabaseAdmin) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('order_date')
    .eq('user_id', userId)
    .order('order_date', { ascending: true })
    .limit(1);
  if (error) throw error;
  const minDate = data?.[0]?.order_date;

  const { data: maxData, error: maxError } = await supabaseAdmin
    .from('orders')
    .select('order_date')
    .eq('user_id', userId)
    .order('order_date', { ascending: false })
    .limit(1);
  if (maxError) throw maxError;
  const maxDate = maxData?.[0]?.order_date;

  return {
    start: minDate ?? undefined,
    end: maxDate ?? undefined,
  };
}
