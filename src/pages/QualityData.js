import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';
import {
  Box, Typography, Paper, TextField, Select, MenuItem, FormControl,
  InputLabel, Button, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Divider, Alert, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { exportQualityPDF } from '../utils/pdfExport';
import { downloadCsv, timestampedFilename } from '../utils/csvExport';
import { getPlantLines } from '../config/plantConfig';
import {
  SHIFTS_FOR, getTimeSlots, todayStr,
  loadQualityData, saveQualityData, setActiveShift,
  loadProcessDosing,
} from '../utils/shiftUtils';

const CELL_W = 68;

export default function QualityData() {
  const { plantId } = useParams();
  useDocumentTitle(`${plantId} Quality Data`);
  const { user, isReadOnly } = useAuth();
  const readOnly = isReadOnly();

  const lines = getPlantLines(plantId);
  const [date] = useState(todayStr());
  const [shiftType, setShiftType] = useState('8-Hour');
  const [shift, setShift] = useState('Morning');

  const [readings, setReadings] = useState({});
  const [controllerName, setControllerName] = useState('');
  const [controllerNumber, setControllerNumber] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorNumber, setSupervisorNumber] = useState('');
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState(null);

  const inputRefs = useRef({});

  const timeSlots = getTimeSlots(shiftType, shift);

  // Editable field keys in reading order (readonly fields excluded)
  const editableKeys = [];
  lines.incoming.forEach((line) => {
    timeSlots.forEach((time) => editableKeys.push(`${line}_${time}_free`));
  });
  lines.outgoing.forEach((line) => {
    timeSlots.forEach((time) => {
      editableKeys.push(`${line}_${time}_free`);
      editableKeys.push(`${line}_${time}_mono`);
    });
  });

  // Load on mount / shift change
  useEffect(() => {
    const saved = loadQualityData(plantId, date, shiftType, shift);
    if (saved) {
      setReadings(saved.readings || {});
      setControllerName(saved.controllerName || '');
      setControllerNumber(saved.controllerNumber || '');
      setSupervisorName(saved.supervisorName || '');
      setSupervisorNumber(saved.supervisorNumber || '');
      setComments(saved.comments || '');
    } else {
      setReadings({});
      setControllerName('');
      setControllerNumber('');
      setSupervisorName('');
      setSupervisorNumber('');
      setComments('');
    }
    // Announce this as the active shift for other pages
    setActiveShift(plantId, { date, shiftType, shift });
  }, [plantId, date, shiftType, shift]);

  const handleShiftTypeChange = (e) => {
    const newType = e.target.value;
    setShiftType(newType);
    const firstShift = SHIFTS_FOR[newType][0];
    setShift(firstShift);
  };


  const getReading = (line, time, kind) => readings[`${line}_${time}_${kind}`] || '';

  const handleSave = useCallback(async () => {
    const payload = {
      date, shiftType, shift, readings,
      controllerName, controllerNumber,
      supervisorName, supervisorNumber,
      comments,
      savedAt: new Date().toISOString(),
    };
    saveQualityData(plantId, date, shiftType, shift, payload);

    try {
      await api.post('/api/audit-log', {
        eventType: 'QUALITY_SAVE',
        plantName: plantId,
        details: `${plantId} Quality Data saved for ${shiftType} ${shift} on ${date}`,
      });
    } catch (err) {
      console.warn('Audit log write failed', err);
    }

    setStatus({ type: 'success', text: 'Session saved successfully' });
    setTimeout(() => setStatus(null), 3000);
  }, [plantId, date, shiftType, shift, readings,
      controllerName, controllerNumber, supervisorName, supervisorNumber,
      comments, user]);

  const handleReload = () => {
    const saved = loadQualityData(plantId, date, shiftType, shift);
    if (saved) {
      setReadings(saved.readings || {});
      setControllerName(saved.controllerName || '');
      setControllerNumber(saved.controllerNumber || '');
      setSupervisorName(saved.supervisorName || '');
      setSupervisorNumber(saved.supervisorNumber || '');
      setComments(saved.comments || '');
      setStatus({ type: 'info', text: 'Reloaded from local storage' });
      setTimeout(() => setStatus(null), 2000);
    }
  };

  // Arrow-key navigation
  const handleCellKeyDown = (e, key) => {
    const NAV = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter'];
    if (!NAV.includes(e.key)) return;
    e.preventDefault();
    const idx = editableKeys.indexOf(key);
    if (idx < 0) return;
    const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') ? 1 : -1;
    for (let i = idx + dir; i >= 0 && i < editableKeys.length; i += dir) {
      const target = inputRefs.current[editableKeys[i]];
      if (target && !target.disabled && target.focus) {
        target.focus();
        if (target.select) target.select();
        return;
      }
    }
  };

  const renderRow = (line, kind, rowIdx) => {
    const isIncoming = kind === 'incoming';
    const monoDisabled = isIncoming; // Incoming Mono is lab data — locked
    let colIdx = 0;
    return (
      <TableRow key={`${kind}_${line}`}>
        <TableCell
          component="th" scope="row"
          sx={{ fontWeight: 'bold', bgcolor: '#F5F7FA', minWidth: 90 }}
        >
          {line}
        </TableCell>
        {timeSlots.map((time) => (
          <React.Fragment key={`${line}_${time}`}>
            <TableCell align="center" sx={{ p: 0.3 }}>
              <input
                ref={(el) => { inputRefs.current[`${line}_${time}_free`] = el; }}
                value={getReading(line, time, 'free')}
                onChange={(e) => setReadings((prev) => ({
                  ...prev,
                  [`${line}_${time}_free`]: e.target.value,
                }))}
                onKeyDown={(e) => handleCellKeyDown(e, `${line}_${time}_free`)}
                disabled={readOnly}
                style={{
                  width: CELL_W, textAlign: 'center', padding: '5px 2px',
                  border: '1px solid #cfd8dc', borderRadius: 3, fontSize: 13,
                  fontFamily: 'Consolas, monospace',
                }}
                onFocus={(e) => e.target.select()}
              />
              <span style={{ display: 'none' }}>{colIdx++}</span>
            </TableCell>
            <TableCell align="center" sx={{ p: 0.3, bgcolor: monoDisabled ? '#eeeeee' : 'transparent' }}>
              <input
                ref={(el) => { inputRefs.current[`${line}_${time}_mono`] = el; }}
                value={getReading(line, time, 'mono')}
                onChange={(e) => setReadings((prev) => ({
                  ...prev,
                  [`${line}_${time}_mono`]: e.target.value,
                }))}
                onKeyDown={(e) => handleCellKeyDown(e, `${line}_${time}_mono`)}
                disabled={readOnly || monoDisabled}
                style={{
                  width: CELL_W, textAlign: 'center', padding: '5px 2px',
                  border: '1px solid #cfd8dc', borderRadius: 3, fontSize: 13,
                  fontFamily: 'Consolas, monospace',
                  background: monoDisabled ? '#3a3a3a' : 'white',
                  color: monoDisabled ? '#999' : 'inherit',
                }}
                onFocus={(e) => e.target.select()}
              />
              <span style={{ display: 'none' }}>{colIdx++}</span>
            </TableCell>
          </React.Fragment>
        ))}
      </TableRow>
    );
  };

  const handleExportCsv = () => {
    const headers = ['Line', 'Time', 'Free Cl2', 'Mono'];
    const rows = [];
    const allLines = [...lines.incoming, ...lines.outgoing];
    allLines.forEach((line) => {
      timeSlots.forEach((time) => {
        rows.push([
          line,
          time,
          readings[`${line}_${time}_free`] || '',
          readings[`${line}_${time}_mono`] || '',
        ]);
      });
    });
    downloadCsv(
      timestampedFilename(`${plantId}_Quality_${shiftType.replace('-','')}_${shift}`),
      headers,
      rows
    );
    setStatus({ type: 'success', text: 'CSV exported' });
    setTimeout(() => setStatus(null), 2500);
  };

  const handleExportPDF = () => {
    const dosing = loadProcessDosing(plantId, date, shiftType, shift);

    exportQualityPDF({
      plantId,
      date,
      shiftType,
      shift,
      timeSlots,
      incomingLines: lines.incoming,
      outgoingLines: lines.outgoing,
      readings,
      controllerName,
      controllerNumber,
      supervisorName,
      supervisorNumber,
      comments,
      processDosingRows: dosing?.rows || null,
      processDosingIncomingLines: lines.incoming,
    });
    setStatus({ type: 'success', text: 'PDF exported (Quality + Process Dosing)' });
    setTimeout(() => setStatus(null), 3000);
  };

  const noLines = lines.incoming.length === 0 && lines.outgoing.length === 0;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
        {plantId} – Quality Data Logsheet
      </Typography>

      {readOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Supervisor mode — read only. Contact an operator to modify readings.
        </Alert>
      )}

      {status && (
        <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      {/* Config bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField size="small" label="Date" value={date} disabled sx={{ minWidth: 160 }} />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Shift Type</InputLabel>
            <Select value={shiftType} label="Shift Type" onChange={handleShiftTypeChange}>
              <MenuItem value="8-Hour">8-Hour</MenuItem>
              <MenuItem value="12-Hour">12-Hour</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Shift</InputLabel>
            <Select value={shift} label="Shift" onChange={(e) => setShift(e.target.value)}>
              {SHIFTS_FOR[shiftType].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box flex={1} />
          <Chip
            label={`${timeSlots.length} time slots`}
            size="small"
            variant="outlined"
          />
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={handleReload}>
            Reload
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={readOnly}
            sx={{ bgcolor: '#003366' }}
          >
            Save Session
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="secondary"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="primary"
            startIcon={<TableChartIcon />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </Stack>
      </Paper>

      {/* Grid */}
      {noLines ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No line configuration available for {plantId}.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
          <Table size="small" sx={{ borderCollapse: 'collapse' }}>
            <TableHead>
              <TableRow>
                <TableCell
                  rowSpan={2}
                  sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold', minWidth: 90 }}
                >
                  Lines
                </TableCell>
                {timeSlots.map((time) => (
                  <TableCell
                    key={time}
                    align="center"
                    colSpan={2}
                    sx={{
                      bgcolor: '#003366', color: 'white', fontWeight: 'bold',
                      borderLeft: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {time}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                {timeSlots.map((time, i) => (
                  <React.Fragment key={`sub_${time}_${i}`}>
                    <TableCell
                      align="center"
                      sx={{
                        bgcolor: '#1a4d80', color: 'white', fontSize: '0.75rem',
                        borderLeft: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      Free Cl₂
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ bgcolor: '#1a4d80', color: 'white', fontSize: '0.75rem' }}
                    >
                      Mono
                    </TableCell>
                  </React.Fragment>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* INCOMING banner */}
              {lines.incoming.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={1 + timeSlots.length * 2}
                    sx={{ bgcolor: '#e6fffa', fontWeight: 'bold', color: '#003366' }}
                  >
                    INCOMING LINES
                  </TableCell>
                </TableRow>
              )}
              {lines.incoming.map((line, idx) => renderRow(line, 'incoming', idx))}

              {/* OUTGOING banner */}
              {lines.outgoing.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={1 + timeSlots.length * 2}
                    sx={{ bgcolor: '#ebf8ff', fontWeight: 'bold', color: '#003366' }}
                  >
                    OUTGOING LINES
                  </TableCell>
                </TableRow>
              )}
              {lines.outgoing.map((line, idx) =>
                renderRow(line, 'outgoing', lines.incoming.length + idx)
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Sign-off */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366', mb: 1 }}>
          Shift Handover Signoffs & Comments
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Senior Process Controller
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Name" size="small" fullWidth
                value={controllerName}
                onChange={(e) => setControllerName(e.target.value)}
                disabled={readOnly}
              />
              <TextField
                label="ID" size="small" sx={{ width: 120 }}
                value={controllerNumber}
                onChange={(e) => setControllerNumber(e.target.value)}
                disabled={readOnly}
              />
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Senior Process Supervisor
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Name" size="small" fullWidth
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                disabled={readOnly}
              />
              <TextField
                label="ID" size="small" sx={{ width: 120 }}
                value={supervisorNumber}
                onChange={(e) => setSupervisorNumber(e.target.value)}
                disabled={readOnly}
              />
            </Stack>
          </Box>
        </Box>

        <TextField
          label="SPS Comments / Directives"
          multiline rows={3} fullWidth size="small"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={readOnly}
        />
      </Paper>
    </Box>
  );
}
