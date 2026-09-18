import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Divider,
  Tabs, Tab, Paper, TextField, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Stack, Alert, Chip,
  IconButton, Tooltip,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import ScienceIcon from '@mui/icons-material/Science';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CalculatorIcon from '@mui/icons-material/Calculate';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../utils/useDocumentTitle';

const CALC_STORAGE_KEY = 'rw_calc_session';

export default function DosingChart() {
  useDocumentTitle('Dosing Chart');
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [meta, setMeta] = useState({ flows: [], heads: [] });

  // ---------- Chlorine interactive ----------
  const [chlorineFlow, setChlorineFlow] = useState(380);
  const [chlorineHead, setChlorineHead] = useState(1.4);
  const [chlorineResult, setChlorineResult] = useState(null);

  // ---------- Chlorine reference column ----------
  const [columnHead, setColumnHead] = useState(1.2);
  const [columnRows, setColumnRows] = useState([]);
  const [loadingColumn, setLoadingColumn] = useState(false);

  // ---------- Ammonia interactive ----------
  const [ammoniaFlow, setAmmoniaFlow] = useState(500);
  const [ammoniaResult, setAmmoniaResult] = useState(null);
  const [ammoniaRows, setAmmoniaRows] = useState([]);
  const [loadingAmmonia, setLoadingAmmonia] = useState(false);

  // ---------- Calculator Session (Pattern C) ----------
  const [calcFlow, setCalcFlow] = useState('');
  const [calcFreeCl2, setCalcFreeCl2] = useState('');
  const [calcHead, setCalcHead] = useState(null);
  const [calcChartValue, setCalcChartValue] = useState(null);
  const [calcActual, setCalcActual] = useState('');
  const [calcReadings, setCalcReadings] = useState([]);
  const [calcStatus, setCalcStatus] = useState(null);

  // Meta on mount
  useEffect(() => {
    api.get('/api/dosing-chart/meta')
      .then((r) => setMeta(r.data))
      .catch(() => {})
      .finally(() => {});
    // Load calculator session from localStorage
    try {
      const saved = localStorage.getItem(CALC_STORAGE_KEY);
      if (saved) setCalcReadings(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Column refresh on head change
  const loadColumn = useCallback(async () => {
    setLoadingColumn(true);
    try {
      const r = await api.get(`/api/dosing-chart/chlorine/column?head=${columnHead}`);
      setColumnRows(r.data.rows || []);
    } catch {
      setColumnRows([]);
    } finally {
      setLoadingColumn(false);
    }
  }, [columnHead]);

  useEffect(() => { loadColumn(); }, [loadColumn]);

  // Ammonia table
  const loadAmmoniaTable = useCallback(async () => {
    setLoadingAmmonia(true);
    try {
      const r = await api.get('/api/dosing-chart/ammonia/table');
      setAmmoniaRows(r.data || []);
    } catch {
      setAmmoniaRows([]);
    } finally {
      setLoadingAmmonia(false);
    }
  }, []);

  useEffect(() => { loadAmmoniaTable(); }, [loadAmmoniaTable]);

  const lookupChlorine = async () => {
    try {
      const r = await api.get(`/api/dosing-chart/chlorine?flow=${chlorineFlow}&head=${chlorineHead}`);
      setChlorineResult(r.data);
    } catch {
      setChlorineResult(null);
    }
  };

  const lookupAmmonia = async () => {
    try {
      const r = await api.get(`/api/dosing-chart/ammonia?flow=${ammoniaFlow}`);
      setAmmoniaResult(r.data);
    } catch {
      setAmmoniaResult(null);
    }
  };

  // ---------- Calculator handlers ----------
  const calculateHead = () => {
    const flow = parseFloat(calcFlow);
    const freeCl2 = parseFloat(calcFreeCl2);
    if (isNaN(flow) || flow < 10 || flow > 1000) {
      setCalcStatus({ type: 'error', text: 'Flow must be between 10 and 1000' });
      return;
    }
    if (isNaN(freeCl2)) {
      setCalcStatus({ type: 'error', text: 'Enter Free Cl₂ value' });
      return;
    }
    const exact = 1.90 - freeCl2;
    const rounded = Math.round(exact * 10) / 10;
    const clamped = Math.max(0.2, Math.min(2.4, rounded));
    setCalcHead(clamped);
    setCalcStatus(null);

    // Fetch chart value from API
    api.get(`/api/dosing-chart/chlorine?flow=${flow}&head=${clamped}`)
      .then((r) => setCalcChartValue(Number(r.data.dose)))
      .catch(() => setCalcChartValue(null));
  };

  const addReading = () => {
    if (calcChartValue === null || calcHead === null) {
      setCalcStatus({ type: 'error', text: 'Calculate head first' });
      return;
    }
    const actual = parseFloat(calcActual);
    if (isNaN(actual)) {
      setCalcStatus({ type: 'error', text: 'Enter actual chlorine value' });
      return;
    }
    const diff = Math.round((actual - calcChartValue) * 100) / 100;
    let statusText, statusColor;
    if (diff > 0.01) { statusText = 'Above Chart'; statusColor = '#DC6400'; }
    else if (diff < -0.01) { statusText = 'Below Chart'; statusColor = '#1976d2'; }
    else { statusText = 'On Target'; statusColor = '#28A743'; }

    const row = {
      head: calcHead,
      flow: parseFloat(calcFlow),
      chart: calcChartValue,
      actual,
      diff,
      status: statusText,
      statusColor,
      ts: new Date().toISOString(),
    };
    const updated = [...calcReadings, row];
    setCalcReadings(updated);
    try { localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(updated)); } catch { /* */ }

    setCalcActual('');
    setCalcStatus({ type: 'success', text: 'Reading added' });
    setTimeout(() => setCalcStatus(null), 2000);
  };

  const removeReading = (idx) => {
    const updated = calcReadings.filter((_, i) => i !== idx);
    setCalcReadings(updated);
    try { localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(updated)); } catch { /* */ }
  };

  const clearAll = () => {
    if (!window.confirm('Clear all readings?')) return;
    setCalcReadings([]);
    try { localStorage.removeItem(CALC_STORAGE_KEY); } catch { /* */ }
  };

  const saveSession = async () => {
    if (calcReadings.length === 0) {
      setCalcStatus({ type: 'error', text: 'No readings to save' });
      return;
    }
    try {
      await api.post('/api/audit-log', {
        eventType: 'DOSING_SESSION',
        plantName: 'Dosing Chart',
        username: user?.username || 'admin',
        details: `Calculator session saved with ${calcReadings.length} reading(s)`,
      });
      setCalcStatus({ type: 'success', text: 'Session saved to audit log' });
      setTimeout(() => setCalcStatus(null), 3000);
    } catch {
      setCalcStatus({ type: 'error', text: 'Failed to save' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
        Dosing Reference Charts
      </Typography>

      <Paper sx={{ mb: 3, bgcolor: '#d6eaf8' }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 'bold', color: '#003366', textTransform: 'none' },
            '& .MuiTabs-indicator': { backgroundColor: '#DC6400', height: 3 },
          }}
        >
          <Tab icon={<ScienceIcon />} iconPosition="start" label="Chlorine Chart" />
          <Tab icon={<LocalShippingIcon />} iconPosition="start" label="Ammonia Chart" />
          <Tab icon={<CalculatorIcon />} iconPosition="start" label="Calculator Session" />
        </Tabs>
      </Paper>

      {/* ============================== CHLORINE ============================== */}
      {tab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Chlorine dose = Flow × Head ÷ 24 (exact). Head = 1.90 − Free Cl₂, rounded to 0.1.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
                    Interactive Lookup
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Flow (ML/d)</InputLabel>
                      <Select value={chlorineFlow} label="Flow (ML/d)"
                        onChange={(e) => setChlorineFlow(e.target.value)}>
                        {meta.flows.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel>Head</InputLabel>
                      <Select value={chlorineHead} label="Head"
                        onChange={(e) => setChlorineHead(e.target.value)}>
                        {meta.heads.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<CalculateIcon />}
                      onClick={lookupChlorine} sx={{ bgcolor: '#003366' }}>
                      Calculate
                    </Button>
                    {chlorineResult && (
                      <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #28A743' }}>
                        <CardContent>
                          <Typography variant="caption" color="textSecondary">Result</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#003366' }}>
                            {chlorineResult.dose} kg/h
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {chlorineResult.formula}
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366' }}>
                      Reference Table
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Head</InputLabel>
                      <Select value={columnHead} label="Head"
                        onChange={(e) => setColumnHead(e.target.value)}>
                        {meta.heads.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  {loadingColumn ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 520 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Flow (ML/d)</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Cl₂ Dose (kg/h)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {columnRows.map((r) => (
                            <TableRow key={r.flow} hover>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{r.flow}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{r.dose}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ============================== AMMONIA ============================== */}
      {tab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Ammonia dose is empirical per flow rate (non-linear).
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
                    Interactive Lookup
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Flow (ML/d)</InputLabel>
                      <Select value={ammoniaFlow} label="Flow (ML/d)"
                        onChange={(e) => setAmmoniaFlow(e.target.value)}>
                        {meta.flows.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <Button variant="contained" startIcon={<CalculateIcon />}
                      onClick={lookupAmmonia} sx={{ bgcolor: '#003366' }}>
                      Lookup
                    </Button>
                    {ammoniaResult && (
                      <Card sx={{ bgcolor: '#e0f7fa', borderLeft: '4px solid #00838F' }}>
                        <CardContent>
                          <Typography variant="caption" color="textSecondary">Ammonia Dose</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#003366' }}>
                            {ammoniaResult.dose} kg/h
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            at {ammoniaResult.flow} ML/d
                          </Typography>
                        </CardContent>
                      </Card>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
                    Full Ammonia Chart
                  </Typography>
                  {loadingAmmonia ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 520 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Flow (ML/d)</TableCell>
                            <TableCell align="right" sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>NH₃ Dose (kg/h)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ammoniaRows.map((r) => (
                            <TableRow key={r.flow} hover>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{r.flow}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{r.dose}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ============================== CALCULATOR (Pattern C) ============================== */}
      {tab === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Desktop-style dosing session. Enter flow + free Cl₂ → calculate head → add multiple
            readings → compare against chart values.
          </Alert>

          {calcStatus && (
            <Alert severity={calcStatus.type} sx={{ mb: 2 }} onClose={() => setCalcStatus(null)}>
              {calcStatus.text}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
                    Dosing Input
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Flow Rate (ML/d)" size="small" fullWidth
                      value={calcFlow}
                      onChange={(e) => setCalcFlow(e.target.value)}
                      inputProps={{ inputMode: 'numeric' }}
                    />
                    <TextField
                      label="Free Cl₂ (mg/L)" size="small" fullWidth
                      value={calcFreeCl2}
                      onChange={(e) => setCalcFreeCl2(e.target.value)}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <Button variant="contained" startIcon={<CalculateIcon />}
                      onClick={calculateHead} sx={{ bgcolor: '#003366' }}>
                      Calculate Head
                    </Button>

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="textSecondary">Calculated Head</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0d47a1' }}>
                        {calcHead !== null ? calcHead.toFixed(1) : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">Chart Value (kg/h)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#DC6400' }}>
                        {calcChartValue !== null ? calcChartValue.toFixed(2) : '—'}
                      </Typography>
                    </Box>

                    <TextField
                      label="Actual Cl₂ (kg/h)" size="small" fullWidth
                      value={calcActual}
                      onChange={(e) => setCalcActual(e.target.value)}
                      inputProps={{ inputMode: 'decimal' }}
                    />
                    <Button variant="outlined" startIcon={<AddIcon />}
                      onClick={addReading}
                      disabled={calcHead === null || calcChartValue === null}>
                      Add Reading
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366' }}>
                      Session Readings ({calcReadings.length})
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" color="error" onClick={clearAll}
                        disabled={calcReadings.length === 0}>
                        Clear All
                      </Button>
                      <Button size="small" variant="contained" startIcon={<SaveIcon />}
                        onClick={saveSession}
                        disabled={calcReadings.length === 0}
                        sx={{ bgcolor: '#003366' }}>
                        Save Session
                      </Button>
                    </Stack>
                  </Box>

                  {calcReadings.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography color="textSecondary">
                        No readings yet. Enter flow + Free Cl₂, calculate head, then add readings.
                      </Typography>
                    </Paper>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#003366' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>#</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Head</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Flow</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Chart</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Actual</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Diff</TableCell>
                            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {calcReadings.map((r, i) => (
                            <TableRow key={i} hover>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{r.head.toFixed(1)}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{r.flow}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{r.chart.toFixed(2)}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{r.actual.toFixed(2)}</TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace', color: r.statusColor, fontWeight: 'bold' }}>
                                {r.diff > 0 ? '+' : ''}{r.diff.toFixed(2)}
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={r.status} size="small"
                                  sx={{ bgcolor: r.statusColor, color: 'white', fontWeight: 'bold', fontSize: 11 }} />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Remove">
                                  <IconButton size="small" onClick={() => removeReading(i)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                    Readings persist in your browser. Click "Save Session" to write an entry into the audit log.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
