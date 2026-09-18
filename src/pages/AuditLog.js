import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, Button,
  Chip, Stack, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, IconButton, Tooltip, TablePagination, Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import api from '../api/axios';

const EVENT_COLORS = {
  LOGIN: '#e8f5e9', LOGOUT: '#eceff1', PASSWORD_CHANGED: '#e1bee7',
  PUMP_START: '#ffebee', PUMP_RUNNING: '#ffebee', PUMP_STOP: '#e8f5e9',
  STATUS_CHANGE: '#e3f2fd', DESTINATION: '#f3e5f5', MAINTENANCE: '#f5f5f5',
  CL2_CYLINDER: '#fff3e0', CL2_STORAGE: '#fff8e1', NH3_TANK: '#e0f7fa',
  ALARM: '#ffebee', SAVE: '#e8eaf6', USER_CREATE: '#c8e6c9',
  USER_UPDATE: '#b3e5fc', USER_DELETE: '#ffcdd2', USER_RESET_PASSWORD: '#ffe0b2',
  ACCESS_REQUESTED: '#d1c4e9', ACCESS_APPROVED: '#c5e1a5', ACCESS_DENIED: '#ef9a9a',
  JOE_HEAL: '#f8bbd0', JOE_BACKUP: '#b2dfdb', JOE_RESTORE: '#80cbc4',
  DOSING_SESSION: '#d7ccc8', QUALITY_SAVE: '#dcedc8', PROCESS_DOSING_SAVE: '#fff9c4',
};
const eventBg = (t) => EVENT_COLORS[t] || '#f5f5f5';

const EVENT_TYPES = ['', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGED', 'PUMP_START',
  'PUMP_RUNNING', 'PUMP_STOP', 'STATUS_CHANGE', 'DESTINATION', 'MAINTENANCE',
  'CL2_CYLINDER', 'CL2_STORAGE', 'NH3_TANK', 'ALARM', 'SAVE', 'USER_CREATE',
  'USER_UPDATE', 'USER_DELETE', 'USER_RESET_PASSWORD', 'ACCESS_REQUESTED',
  'ACCESS_APPROVED', 'ACCESS_DENIED', 'JOE_HEAL', 'JOE_BACKUP', 'JOE_RESTORE',
  'DOSING_SESSION', 'QUALITY_SAVE', 'PROCESS_DOSING_SAVE'];

const PLANTS = ['', 'Palmiet', 'Eikenhof', 'Zwartkopjes', 'Mapleton'];

const toDateInputValue = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const addDays = (dateStr, delta) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toDateInputValue(d);
};
const todayStr = () => toDateInputValue(new Date());
const isToday = (d) => d === todayStr();

const fmtTime = (ts) => {
  if (!ts) return '--';
  try {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  } catch { return ts; }
};

const fmtFull = (ts) => {
  if (!ts) return '--';
  try { return new Date(ts).toLocaleString('en-ZA'); }
  catch { return ts; }
};

export default function AuditLog() {
  const { plantId } = useParams();
  useDocumentTitle(`${plantId} Audit Log`);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPlant, setFilterPlant] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [totalElements, setTotalElements] = useState(0);
  const [newDayAlert, setNewDayAlert] = useState(false);
  const lastFetchDate = useRef(selectedDate);

  useEffect(() => {
    const check = () => {
      const now = todayStr();
      if (isToday(selectedDate) && now !== lastFetchDate.current) {
        setSelectedDate(now);
        setNewDayAlert(true);
        setTimeout(() => setNewDayAlert(false), 8000);
      }
    };
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('from', `${selectedDate}T00:00:00`);
      params.append('to', `${selectedDate}T23:59:59`);
      if (filterPlant) params.append('plant', filterPlant);
      else if (plantId && plantId !== 'ALL') params.append('plant', plantId);
      if (filterUser) params.append('username', filterUser);
      if (filterType) params.append('eventType', filterType);
      params.append('page', page);
      params.append('size', size);

      const res = await api.get(`/api/audit-log?${params.toString()}`);
      setRows(res.data.content || []);
      setTotalElements(res.data.totalElements || 0);
      lastFetchDate.current = todayStr();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load audit log');
      setRows([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterPlant, filterUser, filterType, page, size, plantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goPrev = () => { setSelectedDate(addDays(selectedDate, -1)); setPage(0); };
  const goNext = () => {
    const next = addDays(selectedDate, 1);
    if (next > todayStr()) return;
    setSelectedDate(next);
    setPage(0);
  };
  const goToday = () => { setSelectedDate(todayStr()); setPage(0); };

  const handleExport = () => {
    const header = 'Timestamp,Username,Plant,Event,Details,IP\n';
    const csv = rows.map((r) =>
      [fmtFull(r.eventTimestamp), r.username, r.plantName, r.eventType,
       `"${(r.details || '').replace(/"/g, '""')}"`, r.ipAddress].join(',')
    ).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#003366' }}>
          {plantId && plantId !== 'ALL' ? `${plantId} – ` : ''}Audit Log
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} color="primary"><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}
            disabled={rows.length === 0}>
            Export CSV
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 2, bgcolor: '#003366', color: 'white' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <IconButton onClick={goPrev} sx={{ color: 'white' }}><ChevronLeftIcon /></IconButton>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {isToday(selectedDate) ? 'TODAY' : new Date(selectedDate + 'T00:00:00')
                .toLocaleDateString('en-ZA', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              {selectedDate} · {isToday(selectedDate) ? '00:00 → now' : '00:00 → 23:59'}
            </Typography>
          </Box>
          <TextField
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setPage(0); }}
            size="small"
            inputProps={{ max: todayStr() }}
            sx={{ bgcolor: 'white', borderRadius: 1, '& input': { color: '#003366', fontWeight: 'bold' } }}
          />
          <IconButton onClick={goNext} sx={{ color: 'white' }} disabled={isToday(selectedDate)}>
            <ChevronRightIcon />
          </IconButton>
          <Button variant="contained" startIcon={<TodayIcon />} onClick={goToday}
            disabled={isToday(selectedDate)}
            sx={{ bgcolor: '#DC6400', '&:hover': { bgcolor: '#a04a00' } }}>
            Today
          </Button>
        </Stack>
      </Paper>

      {newDayAlert && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNewDayAlert(false)}>
          🌙 New day started — log rolled over to {todayStr()}.
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Plant</InputLabel>
              <Select value={filterPlant} label="Plant"
                onChange={(e) => { setFilterPlant(e.target.value); setPage(0); }}>
                {PLANTS.map((p) => <MenuItem key={p} value={p}>{p || 'All plants'}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Event Type</InputLabel>
              <Select value={filterType} label="Event Type"
                onChange={(e) => { setFilterType(e.target.value); setPage(0); }}>
                {EVENT_TYPES.map((t) => <MenuItem key={t} value={t}>{t || 'All types'}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Username" value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
              sx={{ minWidth: 160 }} />
            <Box flex={1} />
            <Typography variant="body2" color="textSecondary">
              {totalElements} record{totalElements === 1 ? '' : 's'} on {selectedDate}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
        ) : rows.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography color="textSecondary">
              No entries for {selectedDate}. Use ◀ ▶ or the date picker to browse other days.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 560 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', bgcolor: '#003366' }}>Time</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', bgcolor: '#003366' }}>User</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', bgcolor: '#003366' }}>Plant</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', bgcolor: '#003366' }}>Event</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', bgcolor: '#003366' }}>Details</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', bgcolor: '#003366' }}>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.logId} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {fmtTime(row.eventTimestamp)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{row.username || '--'}</TableCell>
                      <TableCell>{row.plantName || '--'}</TableCell>
                      <TableCell>
                        <Chip label={row.eventType || '--'} size="small"
                          sx={{ bgcolor: eventBg(row.eventType), fontWeight: 'bold', fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{row.details || '--'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#666' }}>
                        {row.ipAddress || '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div" count={totalElements} page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={size}
              onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100, 200]}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
