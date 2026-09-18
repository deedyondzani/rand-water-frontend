import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { downloadCsv, timestampedFilename } from '../utils/csvExport';
import {
  Box, Typography, Grid, Card, CardContent, Button, Divider,
  Chip, Tabs, Tab, LinearProgress, Paper, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, TextField, Stack, Tooltip,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import TableChartIcon from '@mui/icons-material/TableChart';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api from '../api/axios';

// ============================================================
// COLOUR SCHEME (SCADA-aligned)
// ============================================================
const CYL_COLORS = {
  FULL:   '#28A743',
  IN_USE: '#d32f2f',
  EMPTY:  '#FF7800',
  'O/C':  '#6C757D',
};
const cylColor = (s) => CYL_COLORS[s] || CYL_COLORS.EMPTY;

const TANK_COLORS = {
  'In Use':      '#d32f2f',
  'Standby':     '#28A743',
  'Empty':       '#FF7800',
  'Maintenance': '#6C757D',
};

const activeLimitFor = (plant) => {
  const p = (plant || '').toLowerCase();
  if (p === 'palmiet') return 2;
  if (p === 'zwartkopjes') return 1;
  return Infinity;
};

const bankMetaFor = (plant, room) => {
  const p = (plant || '').toLowerCase();
  if (p === 'eikenhof') {
    switch (room) {
      case 1: return { group: 'Plant 1 (Top Plant)',    name: 'East Bank',  slots: [1,2,3,4,5,6,7,8,9,10] };
      case 2: return { group: 'Plant 1 (Top Plant)',    name: 'West Bank',  slots: [11,12,13,14,15,16,17,18,19,20] };
      case 3: return { group: 'Plant 2 (Bottom Plant)', name: 'North Bank', slots: [1,2,3,4,5,6,7,8,9,10] };
      case 4: return { group: 'Plant 2 (Bottom Plant)', name: 'South Bank', slots: [11,12,13,14,15,16,17,18,19,20] };
      default: return { group: 'Unknown', name: `Bank ${room}`, slots: [] };
    }
  }
  switch (room) {
    case 1: return { group: 'Drum Room 1', name: 'Bank A', slots: [1,2,3,4,5] };
    case 2: return { group: 'Drum Room 1', name: 'Bank B', slots: [6,7,8,9,10] };
    case 3: return { group: 'Drum Room 2', name: 'Bank C', slots: [11,12,13,14,15] };
    case 4: return { group: 'Drum Room 2', name: 'Bank D', slots: [16,17,18,19,20] };
    default: return { group: 'Unknown', name: `Bank ${room}`, slots: [] };
  }
};

// ============================================================
// SVG — CHLORINE CYLINDER (realistic)
// ============================================================
function CylinderSVG({ number, status, size = 68 }) {
  const color = cylColor(status);
  const W = size;
  const H = size * 1.55;
  return (
    <svg width={W} height={H} viewBox="0 0 50 78" style={{ display: 'block' }}>
      {/* Drop shadow */}
      <defs>
        <linearGradient id={`cylShade-${number}-${status}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0.25)" />
          <stop offset="35%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
        </linearGradient>
        <linearGradient id={`cylHighlight-${number}-${status}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Valve stem */}
      <rect x="22" y="0" width="6" height="4" fill="#455A64" />
      {/* Valve body */}
      <rect x="20" y="4" width="10" height="5" rx="1" fill="#546E7A" />
      {/* Protective cap */}
      <rect x="17" y="9" width="16" height="5" rx="1.5" fill="#37474F" />
      {/* Neck */}
      <rect x="21" y="14" width="8" height="4" fill="#607D8B" />

      {/* Body — rounded shoulders */}
      <path
        d="M 10 21 Q 10 18 15 18 L 35 18 Q 40 18 40 21 L 40 68 Q 40 74 34 74 L 16 74 Q 10 74 10 68 Z"
        fill={color}
        stroke="#263238"
        strokeWidth="1.2"
      />
      {/* Shading overlay */}
      <path
        d="M 10 21 Q 10 18 15 18 L 35 18 Q 40 18 40 21 L 40 68 Q 40 74 34 74 L 16 74 Q 10 74 10 68 Z"
        fill={`url(#cylShade-${number}-${status})`}
      />
      {/* Left highlight */}
      <ellipse cx="16" cy="45" rx="3" ry="20" fill={`url(#cylHighlight-${number}-${status})`} opacity="0.6" />

      {/* Number badge */}
      <circle cx="25" cy="46" r="9" fill="white" stroke={color} strokeWidth="1.5" />
      <text
        x="25" y="50"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="#003366"
        fontFamily="Segoe UI, sans-serif"
      >
        {number}
      </text>

      {/* Base ring */}
      <ellipse cx="25" cy="74" rx="15" ry="2" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}

// ============================================================
// SVG — NH3 TANK (vertical, with liquid fill)
// ============================================================
function TankSVG({ level, maxLiters, status, width = 130 }) {
  const pct = maxLiters > 0 ? Math.max(0, Math.min(level / maxLiters, 1)) : 0;
  const color = TANK_COLORS[status] || '#003366';

  // Tank geometry within viewBox 0 0 100 180
  const tankTopY = 25;
  const tankBottomY = 145;
  const tankH = tankBottomY - tankTopY;     // 120
  const fillH = tankH * pct;
  const fillY = tankBottomY - fillH;

  const height = width * 1.6;

  return (
    <svg width={width} height={height} viewBox="0 0 100 180" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`tankShade-${status}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(0,0,0,0.25)" />
          <stop offset="30%"  stopColor="rgba(255,255,255,0.35)" />
          <stop offset="60%"  stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
        </linearGradient>
        <clipPath id={`tankClip-${status}`}>
          <rect x="20" y={tankTopY} width="60" height={tankH} />
        </clipPath>
      </defs>

      {/* Support legs */}
      <rect x="25" y={tankBottomY - 2} width="6" height="22" fill="#546E7A" />
      <rect x="69" y={tankBottomY - 2} width="6" height="22" fill="#546E7A" />
      <rect x="15" y="165" width="70" height="5" rx="1" fill="#37474F" />
      {/* Cross brace */}
      <rect x="25" y="157" width="50" height="3" fill="#455A64" />

      {/* Tank body background */}
      <rect x="20" y={tankTopY} width="60" height={tankH} fill="#ECEFF1" />

      {/* Liquid fill */}
      <g clipPath={`url(#tankClip-${status})`}>
        <rect x="20" y={fillY} width="60" height={fillH} fill={color} opacity="0.85" />
        {/* Liquid surface line */}
        {pct > 0.01 && pct < 0.99 && (
          <ellipse cx="50" cy={fillY} rx="30" ry="3" fill={color} opacity="0.9" />
        )}
      </g>

      {/* Shading overlay */}
      <rect x="20" y={tankTopY} width="60" height={tankH} fill={`url(#tankShade-${status})`} />

      {/* Top cap */}
      <ellipse cx="50" cy={tankTopY} rx="30" ry="9" fill="#B0BEC5" stroke="#607D8B" strokeWidth="1.2" />
      {/* Top nozzle */}
      <rect x="44" y="8" width="12" height="10" fill="#78909C" />
      <rect x="40" y="4" width="20" height="6" rx="1" fill="#546E7A" />

      {/* Bottom cap */}
      <ellipse cx="50" cy={tankBottomY} rx="30" ry="9" fill="#90A4AE" stroke="#607D8B" strokeWidth="1.2" />

      {/* Side walls */}
      <line x1="20" y1={tankTopY} x2="20" y2={tankBottomY} stroke="#607D8B" strokeWidth="1.2" />
      <line x1="80" y1={tankTopY} x2="80" y2={tankBottomY} stroke="#607D8B" strokeWidth="1.2" />

      {/* Level tick marks on right side */}
      {[0, 25, 50, 75, 100].map(p => {
        const y = tankBottomY - (tankH * p / 100);
        return (
          <g key={p}>
            <line x1="82" y1={y} x2="88" y2={y} stroke="#455A64" strokeWidth="0.8" />
            <text x="90" y={y + 3} fontSize="6" fill="#455A64">{p}%</text>
          </g>
        );
      })}

      {/* Percentage text (centre of tank) */}
      <text
        x="50"
        y={tankBottomY - tankH / 2 + 6}
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        fill={pct > 0.5 ? 'white' : '#263238'}
        fontFamily="Segoe UI, sans-serif"
      >
        {(pct * 100).toFixed(0)}%
      </text>

      {/* Status indicator light */}
      <circle cx="90" cy="15" r="4" fill={color} stroke="#263238" strokeWidth="0.8" />
    </svg>
  );
}

// ============================================================
// SVG — MINI CYLINDER (for bulk storage rack)
// ============================================================
function MiniCylinder({ status }) {
  const color = CYL_COLORS[status];
  return (
    <svg width="18" height="28" viewBox="0 0 30 46">
      <rect x="12" y="0" width="6" height="3" fill="#455A64" />
      <rect x="9" y="3" width="12" height="4" rx="1" fill="#37474F" />
      <path d="M 6 10 Q 6 8 9 8 L 21 8 Q 24 8 24 10 L 24 40 Q 24 44 20 44 L 10 44 Q 6 44 6 40 Z"
        fill={color} stroke="#263238" strokeWidth="0.8" />
      <ellipse cx="10" cy="25" rx="1.5" ry="12" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
// ---------- Tank Editor (local state, explicit save) ----------
function TankEditor({ tank, readOnly, onSave }) {
  const [editLevel, setEditLevel] = React.useState(tank.level);
  const [editStatus, setEditStatus] = React.useState(tank.status);

  // Sync when server-side value changes and we're not editing
  React.useEffect(() => {
    setEditLevel(tank.level);
  }, [tank.level]);
  React.useEffect(() => {
    setEditStatus(tank.status);
  }, [tank.status]);

  const levelChanged = parseInt(editLevel, 10) !== tank.level;
  const statusChanged = editStatus !== tank.status;
  const canSave = (levelChanged || statusChanged) && !readOnly;

  const handleSave = () => {
    const payload = {};
    if (levelChanged) payload.level = parseInt(editLevel, 10) || 0;
    if (statusChanged) payload.status = editStatus;
    onSave(payload);
  };

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        type="number"
        label="Level (L)"
        value={editLevel}
        disabled={readOnly}
        onChange={(e) => setEditLevel(e.target.value)}
        inputProps={{ min: 0, max: tank.maxLiters, step: 500 }}
        helperText={`Max ${tank.maxLiters.toLocaleString()} L · Saved: ${tank.level.toLocaleString()} L (${((tank.level / tank.maxLiters) * 100).toFixed(0)}%)`}
        fullWidth
      />
      <FormControl size="small" fullWidth>
        <InputLabel>Status</InputLabel>
        <Select
          value={editStatus}
          label="Status"
          disabled={readOnly}
          onChange={(e) => setEditStatus(e.target.value)}
        >
          <MenuItem value="In Use">In Use</MenuItem>
          <MenuItem value="Standby">Standby</MenuItem>
          <MenuItem value="Empty">Empty</MenuItem>
          <MenuItem value="Maintenance">Maintenance</MenuItem>
        </Select>
      </FormControl>
      {canSave && (
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={handleSave}
          sx={{ bgcolor: '#003366' }}
        >
          Save Changes
        </Button>
      )}
    </Stack>
  );
}

export default function ChemicalStorage() {
  const { isReadOnly } = useAuth();
  const readOnly = isReadOnly();

  const exportCylindersCsv = () => {
    const headers = ['Room', 'Cylinder #', 'Status'];
    const rows = cylinders.map((c) => [c.roomNumber, c.slotNumber, c.status]);
    downloadCsv(
      timestampedFilename(`${currentPlant}_Cylinders`),
      headers,
      rows
    );
  };

  const exportTanksCsv = () => {
    const headers = ['Tank #', 'Level (L)', 'Max (L)', 'Level %', 'Status'];
    const rows = tanks.map((t) => [
      t.tankNumber,
      t.level,
      t.maxLiters,
      t.maxLiters > 0 ? ((t.level / t.maxLiters) * 100).toFixed(1) : 0,
      t.status,
    ]);
    downloadCsv(
      timestampedFilename(`${currentPlant}_NH3_Tanks`),
      headers,
      rows
    );
  };

  const exportBulkCsv = () => {
    const headers = ['Category', 'Count'];
    const rows = [
      ['Full', bulk.fullCount || 0],
      ['Empty', bulk.emptyCount || 0],
      ['O/C', bulk.ocCount || 0],
      ['Total', (bulk.fullCount || 0) + (bulk.emptyCount || 0) + (bulk.ocCount || 0)],
    ];
    downloadCsv(
      timestampedFilename(`${currentPlant}_BulkStorage`),
      headers,
      rows
    );
  };

  const { plantId } = useParams();
  useDocumentTitle(`${plantId} Chemical Storage`);
  const currentPlant = plantId || 'Palmiet';
  const isEikenhof = currentPlant.toLowerCase() === 'eikenhof';
  const activeLimit = activeLimitFor(currentPlant);

  const [subTab, setSubTab] = useState(0);
  const [cylinders, setCylinders] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [bulk, setBulk] = useState({ fullCount: 0, emptyCount: 0, ocCount: 0 });
  const [tankEtas, setTankEtas] = useState({});
  const tankDebounceTimer = React.useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, tRes, bRes, eRes] = await Promise.all([
        api.get(`/api/chemical/cl2/${currentPlant}`),
        api.get(`/api/chemical/nh3/${currentPlant}`),
        api.get(`/api/chemical/bulk/${currentPlant}`),
        api.get('/api/joe/tank-etas').catch(() => ({ data: { items: [] } })),
      ]);
      setCylinders(cRes.data || []);
      setTanks(tRes.data || []);
      setBulk(bRes.data || { fullCount: 0, emptyCount: 0, ocCount: 0 });

      const etaMap = {};
      (eRes.data?.items || []).forEach((e) => {
        if (e.plantName === currentPlant) {
          etaMap[e.tankNumber] = e;
        }
      });
      setTankEtas(etaMap);
      setError(null);
    } catch (err) {
      console.warn('Chemical API unavailable', err);
      setError('Backend unreachable.');
    } finally {
      setLoading(false);
    }
  }, [currentPlant]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const setCylinderStatus = async (cylId, newStatus) => {
    if (newStatus === 'IN_USE' && !isEikenhof) {
      const currentActive = cylinders.filter(c => c.status === 'IN_USE' && c.id !== cylId).length;
      if (currentActive >= activeLimit) {
        alert(`Maximum ${activeLimit} active cylinder(s) allowed for ${currentPlant}.`);
        return;
      }
    }
    setCylinders(prev => prev.map(c => c.id === cylId ? { ...c, status: newStatus } : c));
    try {
      await api.put(`/api/chemical/cl2/${cylId}/status`, { status: newStatus });
    } catch (err) { console.warn(err); fetchAll(); }
  };

  const setBankStatus = async (roomNumber, newStatus) => {
    setCylinders(prev => prev.map(c => c.roomNumber === roomNumber ? { ...c, status: newStatus } : c));
    try {
      await api.put(`/api/chemical/cl2/plant/${currentPlant}/room/${roomNumber}/status`,
        { status: newStatus });
    } catch (err) { console.warn(err); fetchAll(); }
  };

  const resetBankToFull = (roomNumber) => setBankStatus(roomNumber, 'FULL');

  const resetDrumRoom = async (roomNumbers, drumRoomName) => {
    if (!window.confirm(`Reset all cylinders in ${drumRoomName} to FULL?`)) return;
    for (const r of roomNumbers) {
      await setBankStatus(r, 'FULL');
    }
  };

  const updateTank = async (tankId, payload) => {
    setTanks(prev => prev.map(t => t.id === tankId ? { ...t, ...payload } : t));
    try {
      await api.put(`/api/chemical/nh3/${tankId}`, payload);
    } catch (err) { console.warn(err); fetchAll(); }
  };

  const updateBulk = async (payload) => {
    const merged = { ...bulk, ...payload };
    const total = (merged.fullCount||0) + (merged.emptyCount||0) + (merged.ocCount||0);
    if (total > 80) { alert('Bulk storage max is 80 cylinders'); return; }
    setBulk(merged);
    try {
      await api.put(`/api/chemical/bulk/${currentPlant}`, merged);
    } catch (err) { console.warn(err); fetchAll(); }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  const bankCyls = (room) => cylinders
    .filter(c => c.roomNumber === room)
    .sort((a, b) => a.slotNumber - b.slotNumber);

  // ============================================================
  // CYLINDER CARD (with SVG)
  // ============================================================
  const renderCylinderCard = (cyl, disableEdit) => (
    <Grid item xs={6} sm={4} md={3} lg={2.4} key={cyl.id}>
      <Card sx={{
        transition: '0.2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
        height: '100%',
      }}>
        <CardContent sx={{
          p: 2, '&:last-child': { pb: 2 },
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <CylinderSVG number={cyl.slotNumber} status={cyl.status} size={68} />

          <Chip
            label={cyl.status}
            size="small"
            sx={{
              mt: 1.5, mb: 1,
              fontSize: '0.65rem', height: 20,
              bgcolor: cylColor(cyl.status), color: 'white', fontWeight: 'bold',
            }}
          />

          {disableEdit ? (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
              Bank-controlled
            </Typography>
          ) : (
            <FormControl size="small" fullWidth sx={{ mt: 1 }}>
              <Select value={cyl.status} onChange={(e) => setCylinderStatus(cyl.id, e.target.value)}
                disabled={readOnly}
                sx={{ fontSize: '0.75rem' }}>
                <MenuItem value="FULL">FULL</MenuItem>
                <MenuItem value="IN_USE">IN USE</MenuItem>
                <MenuItem value="EMPTY">EMPTY</MenuItem>
                <MenuItem value="O/C">O/C</MenuItem>
              </Select>
            </FormControl>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  // ============================================================
  // BANK
  // ============================================================
  const renderBank = (room) => {
    const cyls = bankCyls(room);
    if (cyls.length === 0) return null;
    const meta = bankMetaFor(currentPlant, room);
    const bankStatuses = cyls.map(c => c.status);
    const allSame = bankStatuses.every(s => s === bankStatuses[0]);
    const bankValue = allSame ? bankStatuses[0] : 'MIXED';

    return (
      <Card key={room} sx={{ mb: 2, borderLeft: `4px solid ${isEikenhof ? '#003366' : cylColor(bankValue)}` }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#003366' }}>
              {meta.name} <Typography component="span" variant="caption" color="textSecondary">
                (Cylinders {cyls[0]?.slotNumber}–{cyls[cyls.length-1]?.slotNumber})
              </Typography>
            </Typography>
            {isEikenhof && (
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Bank Status</InputLabel>
                  <Select value={bankValue} label="Bank Status"
                    onChange={(e) => setBankStatus(room, e.target.value)}>
                    <MenuItem value="FULL">FULL</MenuItem>
                    <MenuItem value="IN_USE">IN USE</MenuItem>
                    <MenuItem value="EMPTY">EMPTY</MenuItem>
                    <MenuItem value="O/C">O/C</MenuItem>
                    {bankValue === 'MIXED' && <MenuItem value="MIXED" disabled>MIXED</MenuItem>}
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" color="success"
                  startIcon={<RestartAltIcon />}
                  onClick={() => resetBankToFull(room)}>
                  Reset to Full
                </Button>
              </Stack>
            )}
          </Box>
          <Grid container spacing={2}>
            {cyls.map(c => renderCylinderCard(c, isEikenhof))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // ============================================================
  // BULK STORAGE
  // ============================================================
  const renderBulkStorage = () => {
    const total = (bulk.fullCount||0) + (bulk.emptyCount||0) + (bulk.ocCount||0);
    const rack = [];
    for (let i = 0; i < 80; i++) {
      let status = null;
      if (i < bulk.fullCount) status = 'FULL';
      else if (i < bulk.fullCount + bulk.emptyCount) status = 'EMPTY';
      else if (i < bulk.fullCount + bulk.emptyCount + bulk.ocCount) status = 'O/C';
      rack.push(
        <Box key={i} sx={{ p: 0.25 }}>
          {status ? <MiniCylinder status={status} /> : (
            <Box sx={{
              width: 18, height: 28, borderRadius: 1,
              border: '1px dashed #B0BEC5', bgcolor: '#F5F7FA',
            }} />
          )}
        </Box>
      );
    }

    return (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Card sx={{ minWidth: 320 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: '#003366' }}>
              Inventory Input
            </Typography>
            <Stack spacing={2.5}>
              <TextField size="small" type="number" label="Full (Ready)" value={bulk.fullCount}
                disabled={readOnly}
                onChange={(e) => updateBulk({ fullCount: parseInt(e.target.value||'0',10) })}
                inputProps={{ min: 0, max: 80 }} fullWidth />
              <TextField size="small" type="number" label="Empty" value={bulk.emptyCount}
                disabled={readOnly}
                onChange={(e) => updateBulk({ emptyCount: parseInt(e.target.value||'0',10) })}
                inputProps={{ min: 0, max: 80 }} fullWidth />
              <TextField size="small" type="number" label="Out of Commission (O/C)" value={bulk.ocCount}
                disabled={readOnly}
                onChange={(e) => updateBulk({ ocCount: parseInt(e.target.value||'0',10) })}
                inputProps={{ min: 0, max: 80 }} fullWidth />
              <Box sx={{ p: 2, bgcolor: total > 80 ? '#ffebee' : '#e8f5e9', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Total: {total} / 80
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Available slots: {80 - total}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Box flex={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: '#003366' }}>
            Warehouse Rack View (max 80)
          </Typography>
          <Paper sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {rack}
            </Box>
            <Stack direction="row" spacing={3} mt={2}>
              {['FULL','EMPTY','O/C'].map(k => (
                <Box key={k} display="flex" alignItems="center" gap={0.5}>
                  <MiniCylinder status={k} />
                  <Typography variant="caption" sx={{ ml: 0.5 }}>{k}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      </Stack>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  const groups = {};
  cylinders.forEach(c => {
    const meta = bankMetaFor(currentPlant, c.roomNumber);
    if (!groups[meta.group]) groups[meta.group] = [];
    if (!groups[meta.group].includes(c.roomNumber)) groups[meta.group].push(c.roomNumber);
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
        {currentPlant} – Chemical Storage Management
      </Typography>

      {error && <Typography color="warning.main" sx={{ mb: 2 }}>⚠️ {error}</Typography>}

      <Paper sx={{ mb: 3, bgcolor: '#d6eaf8' }}>
        <Tabs value={subTab} onChange={(e, v) => setSubTab(v)}>
          <Tab label={isEikenhof ? 'Chlorine Plants (Top & Bottom)' : 'Chlorine Cylinders'} />
          <Tab label="NH₃ Storage Tanks" />
          <Tab label="Bulk Storage Warehouse" />
        </Tabs>
      </Paper>

      {/* ================= CHLORINE ================= */}
      {subTab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <ScienceIcon color="primary" />
              <Typography variant="h6" sx={{ color: '#003366', fontWeight: 'bold' }}>
                Chlorine (Cl₂) Cylinder Banks
              </Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<TableChartIcon />}
              onClick={exportCylindersCsv}>
              Export CSV
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          {Object.entries(groups).map(([groupName, rooms]) => (
            <Box key={groupName} mb={4}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366' }}>
                  {groupName}
                </Typography>
                {!isEikenhof && (
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<RestartAltIcon />}
                    disabled={readOnly}
                    onClick={() => resetDrumRoom(rooms, groupName)}
                  >
                    Reset {groupName}
                  </Button>
                )}
              </Box>
              {rooms.sort().map(room => renderBank(room))}
            </Box>
          ))}

          {!isEikenhof && activeLimit < Infinity && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
              Active limit for {currentPlant}: {activeLimit} cylinder(s) allowed IN USE simultaneously
            </Typography>
          )}
        </Box>
      )}

      {/* ================= NH3 TANKS ================= */}
      {subTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocalShippingIcon color="primary" />
              <Typography variant="h6" sx={{ color: '#003366', fontWeight: 'bold' }}>
                Ammonia (NH₃) Bulk Storage Vessels
              </Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<TableChartIcon />}
              onClick={exportTanksCsv}>
              Export CSV
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            {tanks.map((tank) => {
              const color = TANK_COLORS[tank.status] || '#003366';
              return (
                <Grid item xs={12} sm={6} md={4} key={tank.id}>
                  <Card sx={{ borderTop: `5px solid ${color}`, height: '100%' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          NH₃ Tank {tank.tankNumber}
                        </Typography>
                        <Chip label={tank.status} size="small"
                          sx={{ bgcolor: color, color: 'white', fontWeight: 'bold' }} />
                      </Box>

                      {tankEtas[tank.tankNumber] && (
                        <Chip
                          label={`⚠️ Empty in ~${tankEtas[tank.tankNumber].hoursRemaining}h`}
                          size="small"
                          sx={{
                            mb: 1.5,
                            fontSize: 11,
                            fontWeight: 'bold',
                            bgcolor:
                              tankEtas[tank.tankNumber].severity === 'CRITICAL' ? '#d32f2f' :
                              tankEtas[tank.tankNumber].severity === 'HIGH' ? '#FF9800' :
                              tankEtas[tank.tankNumber].severity === 'WARN' ? '#ffc107' : '#e8f5e9',
                            color: tankEtas[tank.tankNumber].severity === 'OK' ? '#28A743' : 'white',
                          }}
                        />
                      )}

                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Capacity: {tank.maxLiters.toLocaleString()} L
                      </Typography>

                      <Divider sx={{ my: 2.5 }} />

                      {/* Tank graphic */}
                      <Box display="flex" justifyContent="center" my={2}>
                        <TankSVG
                          level={tank.level}
                          maxLiters={tank.maxLiters}
                          status={tank.status}
                          width={140}
                        />
                      </Box>

                      <Divider sx={{ my: 2.5 }} />

                      {/* Controls — local edit + explicit Save */}
                      <TankEditor
                        tank={tank}
                        readOnly={readOnly}
                        onSave={(payload) => updateTank(tank.id, payload)}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ================= BULK ================= */}
      {subTab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <WarehouseIcon color="primary" />
              <Typography variant="h6" sx={{ color: '#003366', fontWeight: 'bold' }}>
                Cl₂ Bulk Storage Warehouse
              </Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<TableChartIcon />}
              onClick={exportBulkCsv}>
              Export CSV
            </Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          {renderBulkStorage()}
        </Box>
      )}
    </Box>
  );
}
