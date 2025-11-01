import { Paper, Typography, TextField, MenuItem, Button, Grid, Box } from '@mui/material';
import { Filter } from 'lucide-react';
import { FilterState } from '../../types';

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  menuGroups: string[];
}

export const FilterSection = ({ filters, onFilterChange, menuGroups }: FilterSectionProps) => {
  const handleApplyFilters = () => {
    onFilterChange({ ...filters });
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Filtreler
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={2.5}>
          <TextField
            label="Başlangıç Tarihi"
            type="date"
            fullWidth
            size="small"
            value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                startDate: e.target.value ? new Date(e.target.value) : null,
              })
            }
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.5}>
          <TextField
            label="Bitiş Tarihi"
            type="date"
            fullWidth
            size="small"
            value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                endDate: e.target.value ? new Date(e.target.value) : null,
              })
            }
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            label="Periyot"
            fullWidth
            size="small"
            value={filters.period}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                period: e.target.value as 'Gün' | 'Ay',
              })
            }
          >
            <MenuItem value="Gün">Günlük</MenuItem>
            <MenuItem value="Ay">Aylık</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            label="Menü Grubu"
            fullWidth
            size="small"
            value={filters.menuGroup}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                menuGroup: e.target.value,
              })
            }
          >
            <MenuItem value="">Tümü</MenuItem>
            {menuGroups.map((group) => (
              <MenuItem key={group} value={group}>
                {group}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={12} md={2}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Filter size={20} />}
            onClick={handleApplyFilters}
            sx={{ height: '40px' }}
          >
            Filtrele
          </Button>
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <Button
          variant="text"
          size="small"
          onClick={() =>
            onFilterChange({
              startDate: null,
              endDate: null,
              period: 'Gün',
              menuGroup: '',
            })
          }
        >
          Filtreleri Temizle
        </Button>
      </Box>
    </Paper>
  );
};
