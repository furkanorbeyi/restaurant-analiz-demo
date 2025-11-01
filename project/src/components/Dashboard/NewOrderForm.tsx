import { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MenuItem as MenuItemType } from '../../types';

interface NewOrderFormProps {
  onOrderAdded: () => void;
}

export const NewOrderForm = ({ onOrderAdded }: NewOrderFormProps) => {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [menuGroups, setMenuGroups] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    menuGroup: '',
    serviceType: '',
    itemName: '',
    amount: '',
    orderDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const serviceTypes = ['Paket Servis', 'Yerinde Tüketim', 'Online Sipariş'];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('menu_group', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
      return;
    }

    if (data) {
      setMenuItems(data);
      const groups = [...new Set(data.map((item) => item.menu_group))];
      setMenuGroups(groups);
    }
  };

  const filteredItems = formData.menuGroup
    ? menuItems.filter((item) => item.menu_group === formData.menuGroup)
    : menuItems;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.menuGroup || !formData.serviceType || !formData.itemName || !formData.amount) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Geçerli bir tutar girin');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Kullanıcı oturumu bulunamadı');
        return;
      }

      const menuItem = menuItems.find((item) => item.name === formData.itemName);

      const { error: insertError } = await supabase.from('orders').insert({
        user_id: user.id,
        menu_item_id: menuItem?.id || null,
        menu_group: formData.menuGroup,
        service_type: formData.serviceType,
        item_name: formData.itemName,
        amount: amount,
        order_date: formData.orderDate,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        menuGroup: '',
        serviceType: '',
        itemName: '',
        amount: '',
        orderDate: new Date().toISOString().split('T')[0],
      });

      onOrderAdded();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sipariş eklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Yeni Sipariş Ekle
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Sipariş başarıyla eklendi!
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            label="Menü Grubu"
            value={formData.menuGroup}
            onChange={(e) =>
              setFormData({ ...formData, menuGroup: e.target.value, itemName: '' })
            }
            required
            fullWidth
            size="small"
          >
            {menuGroups.map((group) => (
              <MenuItem key={group} value={group}>
                {group}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Servis Türü"
            value={formData.serviceType}
            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
            required
            fullWidth
            size="small"
          >
            {serviceTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Ürün Adı"
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            required
            fullWidth
            size="small"
            disabled={!formData.menuGroup}
          >
            {filteredItems.map((item) => (
              <MenuItem key={item.id} value={item.name}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tutar (₺)"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            fullWidth
            size="small"
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label="Sipariş Tarihi"
            type="date"
            value={formData.orderDate}
            onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
            required
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            startIcon={<Plus size={20} />}
            sx={{ mt: 1 }}
          >
            {loading ? 'Ekleniyor...' : 'Siparişi Kaydet'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};
