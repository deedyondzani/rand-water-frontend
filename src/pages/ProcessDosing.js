import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Chip, CircularProgress,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { exportProcessDosingPDF } from '../utils/pdfExport';
import { getPlantLines } from '../config/plantConfig';
import {
  getActiveShift, getFirstTimeSlot,
  loadQualityData, loadProcessDosing, saveProcessDosing,
  lookupFreeCl2, formatVariance, varianceColor,
} from '../utils/shiftUtils';

const CELL_W = 78;
const BIG_W = 130;

export default function ProcessDosing() {
  const { plantId } = useParams();
  const { user, isReadOnly } = useAuth();
  const readOnly = isReadOnly();

  const lines = getPlantLines(plantId);
  const incoming = lines.incoming;

  const [shiftInfo, setShiftInfo] = useState(() => getActiveShift(plantId));
  const [rows, setRows] = useState({}); // key `${line}_${field}` → value
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const inputRefs = useRef({});

  const { date, shiftType, shift } = shiftInfo;
  const defaultTime = getFirstTimeSlot(shiftType, shift);

  // Reload active shift info whenever plant changes
  useEffect(() => {
    setShiftInfo(getActiveShift(plantId));
  }, [plantId]);

  // Load saved process dosing + populate from quality data
  useEffect(() => {
    const saved = loadProcessDosing(plantId, date, shiftType, shift);
    const quality = loadQualityData(plantId, date, shiftType, shift);

    const initial = {};

    incoming.forEach((line) => {
      // Auto-fill Free Cl₂ from Quality Data
      const freeCl2 = quality ? lookupFreeCl2(quality, line, defaultTime) : '';

      // Prefer saved values, else auto
      const savedRow = saved && saved.rows ? saved.rows : {};

      initial[`${line}_magflow`] = savedRow[`${line}_magflow`] || '';
      initial[`${line}_freeCl2`] = freeCl2 || savedRow[`${line}_freeCl2`] || '';
      initial[`${line}_time`]    = savedRow[`${line}_time`] || defaultTime;
      initial[`${line}_cl2Act`]  = savedRow[`${line}_cl2Act`] || '';
      initial[`${line}_nh3Act`]  = savedRow[`${line}_nh3Act`] || '';
      initial[`${line}_comments`]= savedRow[`${line}_comments`] || '';
      // computed (will be filled by Calculate)
      initial[`${line}_diffFree`] = savedRow[`${line}_diffFree`] || '';
      initial[`${line}_cl2Req`]   = savedRow[`${line}_cl2Req`] || '';
      initial[`${line}_diffCl2`]  = savedRow[`${line}_diffCl2`] || '';
      initial[`${line}_nh3Req`]   = savedRow[`${line}_nh3Req`] || '';
      initial[`${line}_diffNh3`]  = savedRow[`${line}_diffNh3`] || '';
    });

    setRows(initial);
  }, [plantId, date, shiftType, shift, defaultTime]); // eslint-disable-line

  const setField = (key, value) => {
    setRows((prev) => ({ ...prev, [key]: value }));
  };

  const getField = (key) => rows[key] || '';

  // Arrow navigation
  const fieldOrder = [];
  incoming.forEach((line) => {
    fieldOrder.push(`${line}_magflow`);
    fieldOrder.push(`${line}_freeCl2`);
    fieldOrder.push(`${line}_diffFree`);
    fieldOrder.push(`${line}_time`);
    fieldOrder.push(`${line}_cl2Req`);
    fieldOrder.push(`${line}_cl2Act`);
    fieldOrder.push(`${line}_diffCl2`);
    fieldOrder.push(`${line}_nh3Req`);
    fieldOrder.push(`${line}_nh3Act`);
    fieldOrder.push(`${line}_diffNh3`);
    fieldOrder.push(`${line}_comments`);
  });

  const handleKeyDown = (e, key) => {
    let target = null;
    const idx = fieldOrder.indexOf(key);
    if (idx < 0) return;
    if (e.key === 'ArrowRight') { target = fieldOrder[idx + 1]; e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { target = fieldOrder[idx - 1]; e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      // Jump down by columns-per-row = 11
      const targetIdx = idx + 11;
      if (targetIdx < fieldOrder.length) { target = fieldOrder[targetIdx]; e.preventDefault(); }
    } else if (e.key === 'ArrowUp') {
      const targetIdx = idx - 11;
      if (targetIdx >= 0) { target = fieldOrder[targetIdx]; e.preventDefault(); }
    }
    if (target && inputRefs.current[target]) {
      inputRefs.current[target].focus();
      inputRefs.current[target].select();
    }
  };

  // Calculate dosing — pulls from API for authoritative chart values
  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    const updated = { ...rows };
    let errors = 0;

    for (const line of incoming) {
      const magStr = String(updated[`${line}_magflow`] || '').trim();
      if (!magStr) continue;
      const flow = parseFloat(magStr);
      if (isNaN(flow) || flow < 10 || flow > 1000) continue;

      const freeStr = String(updated[`${line}_freeCl2`] || '').trim();
      let head = 1.2; // default
      if (freeStr) {
        const free = parseFloat(freeStr);
        if (!isNaN(free)) {
          const diff = Math.round((1.9 - free) * 100) / 100;
          updated[`${line}_diffFree`] = diff.toFixed(2);
          head = Math.round(Math.max(0.2, Math.min(2.4, diff)) * 10) / 10;
        }
      }

      updated[`${line}_time`] = updated[`${line}_time`] || defaultTime;

      try {
        const [cl2Res, nh3Res] = await Promise.all([
          api.get(`/api/dosing-chart/chlorine?flow=${flow}&head=${head}`),
          api.get(`/api/dosing-chart/ammonia?flow=${flow}`),
        ]);
        const cl2Req = Number(cl2Res.data.dose);
        const nh3Req = Number(nh3Res.data.dose);

        updated[`${line}_cl2Req`] = cl2Req.toFixed(2);
        updated[`${line}_nh3Req`] = nh3Req.toFixed(2);

        const cl2ActStr = String(updated[`${line}_cl2Act`] || '').trim();
        if (cl2ActStr) {
          const cl2Act = parseFloat(cl2ActStr);
          if (!isNaN(cl2Act)) {
            updated[`${line}_diffCl2`] = formatVariance(cl2Act - cl2Req);
          }
        }
        const nh3ActStr = String(updated[`${line}_nh3Act`] || '').trim();
        if (nh3ActStr) {
          const nh3Act = parseFloat(nh3ActStr);
          if (!isNaN(nh3Act)) {
            updated[`${line}_diffNh3`] = formatVariance(nh3Act - nh3Req);
          }
        }
      } catch (err) {
        console.warn('Dosing chart lookup failed for', line, err);
        errors++;
      }
    }

    setRows(updated);
    setLoading(false);
    if (errors > 0) {
      setStatus({ type: 'warning', text: `Calculation completed with ${errors} lookup error(s)` });
    } else {
      setStatus({ type: 'success', text: 'Dosing calculated successfully' });
    }
    setTimeout(() => setStatus(null), 3000);
  }, [rows, incoming, defaultTime]);

  // Save session
  const handleSave = useCallback(async () => {
    const payload = { rows, savedAt: new Date().toISOString() };
    saveProcessDosing(plantId, date, shiftType, shift, payload);

    try {
      await api.post('/api/audit-log', {
        eventType: 'PROCESS_DOSING_SAVE',
        plantName: plantId,
        username: user?.username || 'admin',
        details: `${plantId} Process Dosing saved for ${shiftType} ${shift} on ${date}`,
      });
    } catch (err) {
      console.warn('Audit log failed', err);
    }

    setStatus({ type: 'success', text: 'Session saved' });
    setTimeout(() => setStatus(null), 3000);
  }, [plantId, date, shiftType, shift, rows, user]);

  const handleReload = () => {
    const saved = loadProcessDosing(plantId, date, shiftType, shift);
    const quality = loadQualityData(plantId, date, shiftType, shift);
    const initial = {};
    incoming.forEach((line) => {
      const freeCl2 = quality ? lookupFreeCl2(quality, line, defaultTime) : '';
      const savedRow = saved && saved.rows ? saved.rows : {};
      initial[`${line}_magflow`] = savedRow[`${line}_magflow`] || '';
      initial[`${line}_freeCl2`] = freeCl2 || savedRow[`${line}_freeCl2`] || '';
      initial[`${line}_time`]    = savedRow[`${line}_time`] || defaultTime;
      initial[`${line}_cl2Act`]  = savedRow[`${line}_cl2Act`] || '';
      initial[`${line}_nh3Act`]  = savedRow[`${line}_nh3Act`] || '';
      initial[`${line}_comments`]= savedRow[`${line}_comments`] || '';
      initial[`${line}_diffFree`] = savedRow[`${line}_diffFree`] || '';
      initial[`${line}_cl2Req`]   = savedRow[`${line}_cl2Req`] || '';
      initial[`${line}_diffCl2`]  = savedRow[`${line}_diffCl2`] || '';
      initial[`${line}_nh3Req`]   = savedRow[`${line}_nh3Req`] || '';
      initial[`${line}_diffNh3`]  = savedRow[`${line}_diffNh3`] || '';
    });
    setRows(initial);
    setStatus({ type: 'info', text: 'Reloaded' });
    setTimeout(() => setStatus(null), 2000);
  };

  const inputStyle = (w = CELL_W, isAuto = false, isVariance = false) => ({
    width: w, textAlign: 'center', padding: '5px 2px',
    border: '1px solid #cfd8dc', borderRadius: 3, fontSize: 12,
    fontFamily: 'Consolas, monospace',
    background: isAuto ? '#EBF0F5' : 'white',
    color: isVariance ? varianceColor(getField('__dummy__')) : 'inherit',
  });

  const renderInput = (key, width, opts = {}) => {
    const { isAuto = false, isVariance = false } = opts;
    const color = isVariance && rows[key] ? varianceColor(rows[key]) : 'inherit';
    return (
      <input
        ref={(el) => { inputRefs.current[key] = el; }}
        value={getField(key)}
        onChange={(e) => setField(key, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, key)}
        disabled={readOnly || isAuto}
        style={{
          width, textAlign: 'center', padding: '5px 2px',
          border: '1px solid #cfd8dc', borderRadius: 3, fontSize: 12,
          fontFamily: 'Consolas, monospace',
          background: isAuto ? '#EBF0F5' : 'white',
          color: color,
          fontWeight: isVariance ? 600 : 'normal',
        }}
        onFocus={(e) => e.target.select()}
      />
    );
  };

  const handleExportPDF = () => {
    exportProcessDosingPDF({
      plantId,
      date,
      shiftType,
      shift,
      incomingLines: incoming,
      rows,
    });
    setStatus({ type: 'success', text: 'PDF exported' });
    setTimeout(() => setStatus(null), 3000);
  };

  const noLines = incoming.length === 0;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#003366', mb: 1 }}>
        {plantId} – Process Dosing Sheet
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Shift: <strong>{shiftType} / {shift}</strong> · Date: {date} · Target time slot:{' '}
        <strong>{defaultTime}</strong>
      </Typography>

      {readOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>Supervisor — read only</Alert>
      )}

      {status && (
        <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained" color="success" size="small"
            startIcon={loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <CalculateIcon />}
            onClick={handleCalculate}
            disabled={loading || readOnly}
          >
            Calculate Dosing
          </Button>
          <Button
            variant="contained" size="small" startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={readOnly}
            sx={{ bgcolor: '#003366' }}
          >
            Save Session
          </Button>
          <Button
            variant="outlined" size="small" startIcon={<RefreshIcon />}
            onClick={handleReload}
          >
            Reload
          </Button>

          <Button
            variant="outlined" size="small" color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
          <Box flex={1} />
          <Chip
            label="↔ ↑ ↓ Enter keys navigate"
            size="small" variant="outlined"
          />
        </Stack>
      </Paper>

      {noLines ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">No incoming lines for {plantId}.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#003366' }}>
                {[
                  'Lines', 'Magflow (m³/h)', 'Free Cl₂ (mg/L)', 'Diff (1.9 − Cl₂)',
                  'Time', 'Cl₂ Req (kg/h)', 'Cl₂ Act (kg/h)', 'Diff Cl₂',
                  'NH₃ Req (kg/h)', 'NH₃ Act (kg/h)', 'Diff NH₃', 'SPC Comments',
                ].map((h, i) => (
                  <TableCell
                    key={i}
                    align={i === 11 ? 'left' : 'center'}
                    sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: 12 }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {incoming.map((line) => (
                <TableRow key={line}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#003366', bgcolor: '#F5F7FA' }}>
                    {line}
                  </TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_magflow`, CELL_W)}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_freeCl2`, CELL_W, { isAuto: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_diffFree`, CELL_W, { isAuto: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_time`, CELL_W, { isAuto: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_cl2Req`, CELL_W, { isAuto: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_cl2Act`, CELL_W)}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_diffCl2`, BIG_W, { isAuto: true, isVariance: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_nh3Req`, CELL_W, { isAuto: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_nh3Act`, CELL_W)}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_diffNh3`, BIG_W, { isAuto: true, isVariance: true })}</TableCell>
                  <TableCell align="center" sx={{ p: 0.3 }}>{renderInput(`${line}_comments`, 180)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
        Grey columns are auto-computed. Free Cl₂ is pulled from the current Quality Data
        logsheet for this shift. Time slot is set from the active shift.
      </Typography>
    </Box>
  );
}
