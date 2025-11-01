import { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type MenuItemRow = { id: string; name: string; menu_group: string };

const SERVICE_TYPES = ['Paket Servis', 'Yerinde Tüketim'];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SeedDemoDataButton({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    if (!user) return alert('Önce giriş yapmalısınız.');
    setLoading(true);
    try {
      // 1) Read menu items to denormalize name/group and (optionally) link menu_item_id
      const { data: items, error: itemsErr } = await supabase
        .from('menu_items')
        .select('id,name,menu_group')
        .limit(1000);
      if (itemsErr) throw itemsErr;
      if (!items || items.length === 0) throw new Error('Önce menu_items tablosuna veri ekleyin.');

      // 2) Create random orders across last 30 days
      const today = new Date();
      const ordersToInsert = [] as any[];
      const COUNT = 120; // change as you like

      for (let i = 0; i < COUNT; i++) {
        const dayOffset = Math.floor(Math.random() * 30); // last 30 days
        const date = new Date(today);
        date.setDate(today.getDate() - dayOffset);

        const item = pick(items as MenuItemRow[]);
        const serviceType = pick(SERVICE_TYPES);
        const base = item.menu_group === 'İçecek' ? 2 : item.menu_group === 'Tatlı' ? 5 : 8;
        const amount = Number(randomBetween(base, base + 12).toFixed(2));

        ordersToInsert.push({
          user_id: user.id,
          menu_item_id: item.id,
          menu_group: item.menu_group,
          service_type: serviceType,
          item_name: item.name,
          amount,
          order_date: toDateString(date),
        });
      }

      // 3) Insert in batches to avoid payload limits
      const chunkSize = 100;
      for (let i = 0; i < ordersToInsert.length; i += chunkSize) {
        const chunk = ordersToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('orders').insert(chunk);
        if (error) throw error;
      }

      alert(`${ordersToInsert.length} adet demo sipariş eklendi.`);
      onDone();
    } catch (err) {
      console.error('Seed error:', err);
      alert('Veri eklenirken hata oluştu. Konsolu kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Grafiklerin dolu görünmesi için son 30 güne rastgele siparişler ekler.">
      <span>
        <Button variant="outlined" onClick={handleSeed} disabled={loading}>
          {loading ? 'Ekleniyor…' : 'Demo Verisi Ekle (120)'}
        </Button>
      </span>
    </Tooltip>
  );
}
