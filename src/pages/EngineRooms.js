import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { downloadCsv, timestampedFilename } from '../utils/csvExport';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import api from '../api/axios';
import TableChartIcon from '@mui/icons-material/TableChart';

// ---------------------------------------------------------------
// Plant design capacities (ML/d)
// ---------------------------------------------------------------
const plantDesignCapacity = {
  Palmiet: 2050,
  Eikenhof: 1200,
  Zwartkopjes: 700,
  Mapleton: 0,
};

// ---------------------------------------------------------------
// Plant themes
// ---------------------------------------------------------------
const plantThemes = {
  palmiet: { background: '#E8F4FD', cardBackground: '#FFFFFF', accent: '#2E86C1' },
  zwartkopje: { background: '#E1F5F5', cardBackground: '#FFFFFF', accent: '#1ABC9C' },
  eikenhof: { background: '#F0EBFA', cardBackground: '#FFFFFF', accent: '#8E44AD' },
  mapleton: { background: '#FAF5EB', cardBackground: '#FFFFFF', accent: '#D35400' },
};

const getPlantTheme = (plantName) => {
  if (!plantName) return plantThemes.palmiet;
  const key = plantName.toLowerCase();
  for (const [k, v] of Object.entries(plantThemes)) {
    if (key.includes(k)) return v;
  }
  return plantThemes.palmiet;
};

const resolveDesignCapacity = (plantId) => {
  if (!plantId) return 0;
  if (plantDesignCapacity[plantId] !== undefined) return plantDesignCapacity[plantId];
  const key = plantId.toLowerCase();
  const match = Object.keys(plantDesignCapacity).find(k => k.toLowerCase() === key);
  return match ? plantDesignCapacity[match] : 0;
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const parseRunningTime = (str) => {
  if (!str || str === '0h 0m 0s') return 0;
  const parts = str.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
  if (!parts) return 0;
  return parseInt(parts[1]) * 3600 + parseInt(parts[2]) * 60 + parseInt(parts[3]);
};

const formatRunningTime = (seconds) => {
  if (!seconds || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
};

// ---------------------------------------------------------------
// Mock data — fallback when backend is unreachable
// IDs match the Neon seed data so PUTs work even in fallback mode
// ---------------------------------------------------------------
const mockPumps = {
  Palmiet: [
    // ER1: 1-7 @ 90 ML/d (IDs 1-7)
    { id: 1,  number: 1,  engineRoom: 'ER1', status: 'Running', flowRate: 90,  runningTime: '3h 15m 30s' },
    { id: 2,  number: 2,  engineRoom: 'ER1', status: 'Running', flowRate: 90,  runningTime: '1h 45m 12s' },
    { id: 3,  number: 3,  engineRoom: 'ER1', status: 'Running', flowRate: 90,  runningTime: '5h 20m 45s' },
    { id: 4,  number: 4,  engineRoom: 'ER1', status: 'Running', flowRate: 90,  runningTime: '2h 10m 8s' },
    { id: 5,  number: 5,  engineRoom: 'ER1', status: 'Standby', flowRate: 90,  runningTime: '0h 0m 0s' },
    { id: 6,  number: 6,  engineRoom: 'ER1', status: 'Standby', flowRate: 90,  runningTime: '0h 0m 0s' },
    { id: 7,  number: 7,  engineRoom: 'ER1', status: 'Standby', flowRate: 90,  runningTime: '0h 0m 0s' },
    // ER2: 8-12 @ 180 (IDs 8-12), 13/15/17/18 @ 25, 16 @ 50
    { id: 8,  number: 8,  engineRoom: 'ER2', status: 'Running', flowRate: 180, runningTime: '4h 30m 22s' },
    { id: 9,  number: 9,  engineRoom: 'ER2', status: 'Running', flowRate: 180, runningTime: '6h 0m 15s' },
    { id: 10, number: 10, engineRoom: 'ER2', status: 'Running', flowRate: 180, runningTime: '2h 45m 50s' },
    { id: 11, number: 11, engineRoom: 'ER2', status: 'Standby', flowRate: 180, runningTime: '0h 0m 0s' },
    { id: 12, number: 12, engineRoom: 'ER2', status: 'Standby', flowRate: 180, runningTime: '0h 0m 0s' },
    { id: 13, number: 13, engineRoom: 'ER2', status: 'Running', flowRate: 25,  runningTime: '1h 20m 10s' },
    { id: 14, number: 15, engineRoom: 'ER2', status: 'Running', flowRate: 25,  runningTime: '3h 0m 5s' },
    { id: 15, number: 16, engineRoom: 'ER2', status: 'Running', flowRate: 50,  runningTime: '7h 15m 33s' },
    { id: 16, number: 17, engineRoom: 'ER2', status: 'Standby', flowRate: 25,  runningTime: '0h 0m 0s' },
    { id: 17, number: 18, engineRoom: 'ER2', status: 'Standby', flowRate: 25,  runningTime: '0h 0m 0s' },
    // ER3: 19-26 @ 200 (IDs 18-25)
    { id: 18, number: 19, engineRoom: 'ER3', status: 'Running', flowRate: 200, runningTime: '2h 10m 12s' },
    { id: 19, number: 20, engineRoom: 'ER3', status: 'Running', flowRate: 200, runningTime: '5h 40m 9s' },
    { id: 20, number: 21, engineRoom: 'ER3', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s' },
    { id: 21, number: 22, engineRoom: 'ER3', status: 'Running', flowRate: 200, runningTime: '1h 30m 44s' },
    { id: 22, number: 23, engineRoom: 'ER3', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s' },
    { id: 23, number: 24, engineRoom: 'ER3', status: 'Running', flowRate: 200, runningTime: '4h 15m 18s' },
    { id: 24, number: 25, engineRoom: 'ER3', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s' },
    { id: 25, number: 26, engineRoom: 'ER3', status: 'Running', flowRate: 200, runningTime: '8h 0m 1s' },
  ],
  Eikenhof: [
    // ER1: 1-8 @ 100 (IDs 26-33)
    { id: 26, number: 1,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '2h 20m 10s', destination: 'Whiteridge' },
    { id: 27, number: 2,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '6h 10m 5s',  destination: 'Whiteridge' },
    { id: 28, number: 3,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '3h 45m 22s', destination: 'Whiteridge' },
    { id: 29, number: 4,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '4h 30m 0s',  destination: 'Whiteridge' },
    { id: 30, number: 5,  engineRoom: 'ER1', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    { id: 31, number: 6,  engineRoom: 'ER1', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    { id: 32, number: 7,  engineRoom: 'ER1', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    { id: 33, number: 8,  engineRoom: 'ER1', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    // ER2: 9-13 @ 200 (IDs 34-38)
    { id: 34, number: 9,  engineRoom: 'ER2', status: 'Running', flowRate: 200, runningTime: '5h 15m 30s', destination: 'Whiteridge' },
    { id: 35, number: 10, engineRoom: 'ER2', status: 'Running', flowRate: 200, runningTime: '2h 40m 15s', destination: 'Whiteridge' },
    { id: 36, number: 11, engineRoom: 'ER2', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    { id: 37, number: 12, engineRoom: 'ER2', status: 'Running', flowRate: 200, runningTime: '7h 0m 5s',   destination: 'Whiteridge' },
    { id: 38, number: 13, engineRoom: 'ER2', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    // ER3: 14-17 @ 200 (IDs 39-42)
    { id: 39, number: 14, engineRoom: 'ER3', status: 'Running', flowRate: 200, runningTime: '3h 20m 50s', destination: 'Whiteridge' },
    { id: 40, number: 15, engineRoom: 'ER3', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    { id: 41, number: 16, engineRoom: 'ER3', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
    { id: 42, number: 17, engineRoom: 'ER3', status: 'Standby', flowRate: 200, runningTime: '0h 0m 0s',   destination: 'Whiteridge' },
  ],
  Zwartkopjes: [
    // ER1: 1-4 @ 100 (IDs 43-46)
    { id: 43, number: 1,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '6h 0m 30s' },
    { id: 44, number: 2,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '2h 30m 15s' },
    { id: 45, number: 3,  engineRoom: 'ER1', status: 'Running', flowRate: 100, runningTime: '5h 20m 5s' },
    { id: 46, number: 4,  engineRoom: 'ER1', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s' },
    // ER3: 14,15,16,18,19,20,21,22 @ 100 (IDs 47-54)
    { id: 47, number: 14, engineRoom: 'ER3', status: 'Running', flowRate: 100, runningTime: '3h 10m 20s' },
    { id: 48, number: 15, engineRoom: 'ER3', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s' },
    { id: 49, number: 16, engineRoom: 'ER3', status: 'Running', flowRate: 100, runningTime: '1h 40m 0s' },
    { id: 50, number: 18, engineRoom: 'ER3', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s' },
    { id: 51, number: 19, engineRoom: 'ER3', status: 'Running', flowRate: 100, runningTime: '4h 50m 45s' },
    { id: 52, number: 20, engineRoom: 'ER3', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s' },
    { id: 53, number: 21, engineRoom: 'ER3', status: 'Running', flowRate: 100, runningTime: '7h 15m 10s' },
    { id: 54, number: 22, engineRoom: 'ER3', status: 'Standby', flowRate: 100, runningTime: '0h 0m 0s' },
  ],
  Mapleton: [],
};

const getEngineRoomDisplayName = (erCode) => {
  const num = erCode.replace('ER', '');
  return `Engine Room ${num}`;
};

const EIKENHOF_SELECTABLE_PUMPS = [1, 3, 5, 7, 9, 10, 11];

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
export default function EngineRooms() {
  const { isReadOnly } = useAuth();
  const readOnly = isReadOnly();

  const handleExportCsv = () => {
    const headers = [
      'Engine Room', 'Pump #', 'Status', 'Flow Rate (ML/d)',
      'Running Time', 'Destination',
    ];
    const rows = pumps.map((p) => [
      p.engineRoom || '',
      p.number,
      p.status || '',
      p.flowRate || 0,
      p.runningTime || '0h 0m 0s',
      p.destination || '',
    ]);
    downloadCsv(
      timestampedFilename(`${plantId}_EngineRooms`),
      headers,
      rows
    );
  };

  const { plantId } = useParams();
  const plantKey = (plantId || '').toLowerCase();
  const isEikenhof = plantKey === 'eikenhof';
  const designCapacity = resolveDesignCapacity(plantId);

  const [pumps, setPumps] = useState([]);
  const [pumpHealthMap, setPumpHealthMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('');
  const [maintenanceMap, setMaintenanceMap] = useState({});
  const [trippedMap, setTrippedMap] = useState({});
  const [pumpSeconds, setPumpSeconds] = useState({});
  const [destinationMap, setDestinationMap] = useState({});
  const timerRef = useRef(null);

  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [pendingPumpId, setPendingPumpId] = useState(null);

  const plantTheme = getPlantTheme(plantId);

  // ---------------------------------------------------------------
  // Fetch pumps — backend is authoritative for status; maps are a cache
  // ---------------------------------------------------------------
  const fetchPumps = useCallback(async () => {
    try {
      const response = await api.get(`/api/engine-rooms/${plantId}`);

      const fetched = response.data;

      // Sync tripped / maintenance maps from backend truth
      const newTripped = {};
      const newMaint = {};
      fetched.forEach((p) => {
        newTripped[p.id] = p.status === 'Tripped';
        newMaint[p.id] = p.status === 'Maintenance';
      });
      setTrippedMap(newTripped);
      setMaintenanceMap(newMaint);

      // Apply destination override for any in-flight PUT
      const data = fetched.map((p) => ({
        ...p,
        destination: destinationMap[p.id] || p.destination || 'Whiteridge',
      }));

      setPumps(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.warn('API not available, using mock data for', plantId);
      const mockData = mockPumps[plantId] || [];
      const data = mockData.map((p) => ({
        ...p,
        destination: destinationMap[p.id] || p.destination || 'Whiteridge',
      }));
      setPumps(data);
      setLoading(false);
      setError(null);
    }
  }, [plantId, destinationMap]);

  // ---------------------------------------------------------------
  // Seed pumpSeconds once when pumps first load
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!pumps.length) return;
    setPumpSeconds((prev) => {
      const next = { ...prev };
      pumps.forEach((p) => {
        if (next[p.id] === undefined) {
          next[p.id] = p.status === 'Running' ? parseRunningTime(p.runningTime) : 0;
        }
      });
      return next;
    });
  }, [pumps]);

  // ---------------------------------------------------------------
  // Local 1-second ticker for smooth running time
  // ---------------------------------------------------------------
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPumpSeconds((prev) => {
        const next = { ...prev };
        pumps.forEach((p) => {
          if (p.status === 'Running') {
            next[p.id] = (next[p.id] || 0) + 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [pumps]);

  // ---------------------------------------------------------------
  // Poll every 5s
  // ---------------------------------------------------------------
  useEffect(() => {
    fetchPumps();
    const interval = setInterval(fetchPumps, 5000);
    return () => clearInterval(interval);
  }, [fetchPumps]);

  // ---------------------------------------------------------------
  // Total running flow (uses maps for trip/maintenance exclusion)
  // ---------------------------------------------------------------
  const getRunningFlow = useCallback(() => {
    return pumps.reduce((sum, p) => {
      const isTripped = trippedMap[p.id] || false;
      const isMaintenance = maintenanceMap[p.id] || false;
      if (p.status === 'Running' && !isTripped && !isMaintenance) {
        return sum + (p.flowRate || 0);
      }
      return sum;
    }, 0);
  }, [pumps, trippedMap, maintenanceMap]);

  // ---------------------------------------------------------------
  // Start pump — with capacity warning
  // ---------------------------------------------------------------
  const handleStartPump = (pumpId) => {
    const pump = pumps.find((p) => p.id === pumpId);
    if (!pump) return;
    if (pump.status === 'Running') {
      togglePump(pumpId, pump.status);
      return;
    }
    if (designCapacity === 0) {
      togglePump(pumpId, pump.status);
      return;
    }
    const currentFlow = getRunningFlow();
    const newFlow = currentFlow + (pump.flowRate || 0);
    if (newFlow > designCapacity) {
      setWarningMessage(
        `Starting Pump ${pump.number} would increase plant flow to ${newFlow.toFixed(1)} ML/d, which exceeds the design capacity of ${designCapacity} ML/d.\n\nDo you want to proceed anyway?`
      );
      setPendingPumpId(pumpId);
      setWarningDialogOpen(true);
    } else {
      togglePump(pumpId, pump.status);
    }
  };

  // ---------------------------------------------------------------
  // Toggle start / stop — optimistically update + persist
  // ---------------------------------------------------------------
  const togglePump = async (pumpId, currentStatus) => {
    let newStatus, flow;
    if (trippedMap[pumpId]) {
      setTrippedMap((t) => ({ ...t, [pumpId]: false }));
      newStatus = 'Running';
      flow = pumps.find((p) => p.id === pumpId)?.flowRate || 100;
    } else if (currentStatus === 'Running') {
      newStatus = 'Standby';
      flow = 0;
    } else {
      newStatus = 'Running';
      flow = pumps.find((p) => p.id === pumpId)?.flowRate || 100;
    }

    setPumps((prev) =>
      prev.map((p) =>
        p.id === pumpId ? { ...p, status: newStatus, flowRate: flow, runningTime: '0h 0m 0s' } : p
      )
    );
    setPumpSeconds((prev) => ({ ...prev, [pumpId]: 0 }));

    try {
      await api.put(`/api/pumps/${pumpId}/status`, { status: newStatus });
    } catch (err) {
      console.warn('Pump status persist failed', err);
    }
  };

  const handleWarningConfirm = () => {
    if (pendingPumpId !== null) {
      const pump = pumps.find((p) => p.id === pendingPumpId);
      if (pump) togglePump(pump.id, pump.status);
    }
    setWarningDialogOpen(false);
    setPendingPumpId(null);
  };

  const handleWarningCancel = () => {
    setWarningDialogOpen(false);
    setPendingPumpId(null);
  };

  // ---------------------------------------------------------------
  // Trip / reset
  // ---------------------------------------------------------------
  const handleTripToggle = async (pumpId) => {
    const pump = pumps.find((p) => p.id === pumpId);
    if (!pump) return;
    const wasTripped = trippedMap[pumpId] || false;
    const newStatus = wasTripped ? 'Standby' : 'Tripped';

    setTrippedMap((t) => ({ ...t, [pumpId]: !wasTripped }));
    setPumps((prev) =>
      prev.map((p) =>
        p.id === pumpId ? { ...p, status: newStatus, flowRate: 0, runningTime: '0h 0m 0s' } : p
      )
    );
    setPumpSeconds((s) => ({ ...s, [pumpId]: 0 }));

    try {
      await api.put(`/api/pumps/${pumpId}/status`, { status: newStatus });
    } catch (err) {
      console.warn('Trip persist failed', err);
    }
  };

  // ---------------------------------------------------------------
  // Maintenance toggle
  // ---------------------------------------------------------------
  const toggleMaintenance = async (pumpId) => {
    const pump = pumps.find((p) => p.id === pumpId);
    if (!pump) return;
    const wasMaint = maintenanceMap[pumpId] || false;
    const newStatus = wasMaint ? 'Standby' : 'Maintenance';

    setMaintenanceMap((prev) => ({ ...prev, [pumpId]: !wasMaint }));
    setTrippedMap((t) => ({ ...t, [pumpId]: false }));
    setPumps((prev) =>
      prev.map((p) =>
        p.id === pumpId ? { ...p, status: newStatus, flowRate: 0, runningTime: '0h 0m 0s' } : p
      )
    );
    setPumpSeconds((s) => ({ ...s, [pumpId]: 0 }));

    try {
      await api.put(`/api/pumps/${pumpId}/status`, { status: newStatus });
    } catch (err) {
      console.warn('Maintenance persist failed', err);
    }
  };

  // ---------------------------------------------------------------
  // Destination change (Eikenhof only)
  // ---------------------------------------------------------------
  const handleDestinationChange = async (pumpId, value) => {
    setDestinationMap((prev) => ({ ...prev, [pumpId]: value }));
    setPumps((prev) =>
      prev.map((p) => (p.id === pumpId ? { ...p, destination: value } : p))
    );

    try {
      await api.put(
        `/api/pumps/${pumpId}/destination`,
        { destination: value }
      );
    } catch (err) {
      console.warn('Destination persist failed', err);
    }
  };

  // ---------------------------------------------------------------
  // Aggregations
  // ---------------------------------------------------------------
  const grouped = pumps.reduce((acc, pump) => {
    const er = pump.engineRoom || 'Unknown';
    if (!acc[er]) acc[er] = [];
    acc[er].push(pump);
    return acc;
  }, {});
  const roomCodes = Object.keys(grouped);

  const roomSummaries = roomCodes.map((room) => {
    const pumpsInRoom = pumps.filter((p) => p.engineRoom === room);
    const runningPumps = pumpsInRoom.filter((p) => {
      const isTripped = trippedMap[p.id] || false;
      const isMaintenance = maintenanceMap[p.id] || false;
      return p.status === 'Running' && !isTripped && !isMaintenance;
    });
    const totalFlow = runningPumps.reduce((sum, p) => sum + (p.flowRate || 0), 0);
    return { room, totalFlow, running: runningPumps.length, total: pumpsInRoom.length };
  });

  const totalPlantFlow = roomSummaries.reduce((sum, r) => sum + r.totalFlow, 0);
  const plantLoadPercent = designCapacity > 0 ? (totalPlantFlow / designCapacity) * 100 : 0;

  const destinationTotals = isEikenhof
    ? ['Whiteridge', 'Meyerdale'].map((dest) => {
        const total = pumps
          .filter((p) => {
            const isTripped = trippedMap[p.id] || false;
            const isMaintenance = maintenanceMap[p.id] || false;
            return (
              p.status === 'Running' &&
              !isTripped &&
              !isMaintenance &&
              (p.destination || 'Whiteridge') === dest
            );
          })
          .reduce((sum, p) => sum + (p.flowRate || 0), 0);
        return { destination: dest, totalFlow: total };
      })
    : [];

  useEffect(() => {
    if (roomCodes.length > 0 && !selectedTab) {
      setSelectedTab('total');
    }
  }, [roomCodes, selectedTab]);

  const handleTabChange = (event, newValue) => {
    if (newValue !== null) setSelectedTab(newValue);
  };

  const isTotalTab = selectedTab === 'total';
  const currentRoom = isTotalTab ? null : selectedTab;
  const currentPumps = currentRoom ? grouped[currentRoom] || [] : [];

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (roomCodes.length === 0) {
    return (
      <Box p={4}>
        <Typography>No engine rooms configured for this plant.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: plantTheme.background, minHeight: '100vh', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        {plantId} – Engine Rooms
      </Typography>

      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TableChartIcon />}
          onClick={handleExportCsv}
        >
          Export CSV
        </Button>
      </Box>

      {designCapacity > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: plantLoadPercent > 100 ? '#fff3e0' : '#e8f5e9' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" fontWeight="bold">
              Design Capacity: {designCapacity} ML/d
            </Typography>
            <Box flex={1}>
              <LinearProgress
                variant="determinate"
                value={Math.min(plantLoadPercent, 100)}
                sx={{ height: 10, borderRadius: 5 }}
                color={plantLoadPercent > 100 ? 'error' : 'primary'}
              />
            </Box>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={plantLoadPercent > 100 ? 'error' : 'text.primary'}
            >
              {plantLoadPercent.toFixed(1)}%
            </Typography>
            {plantLoadPercent > 100 && (
              <Chip label="CAPACITY EXCEEDED" color="error" size="small" />
            )}
          </Box>
        </Paper>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontSize: '1.1rem', mb: 1 }}>
          Engine Room Flow Summary
        </Typography>
        <Grid container spacing={1}>
          {roomSummaries.map((item) => (
            <Grid item xs={6} sm={4} md={2} key={item.room}>
              <Card sx={{ bgcolor: plantTheme.cardBackground, borderLeft: '4px solid #003366', py: 0.5, px: 1 }}>
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#003366' }}>
                    {getEngineRoomDisplayName(item.room)}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                    {item.totalFlow.toFixed(1)} ML/d
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.running}/{item.total} pumps
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ bgcolor: '#003366', color: 'white', py: 0.5, px: 1 }}>
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
                  Plant Total
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                  {totalPlantFlow.toFixed(1)} ML/d
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {isEikenhof && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontSize: '1rem', mb: 1 }}>
            Destination Flow Summary
          </Typography>
          <Grid container spacing={1}>
            {destinationTotals.map((item) => (
              <Grid item xs={6} sm={4} md={2} key={item.destination}>
                <Card
                  sx={{
                    bgcolor: item.destination === 'Whiteridge' ? '#e3f2fd' : '#fce4ec',
                    borderLeft: '4px solid #003366',
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      {item.destination}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                      {item.totalFlow.toFixed(1)} ML/d
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Paper sx={{ mb: 2, borderRadius: 1, overflow: 'hidden' }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            bgcolor: 'white',
            '& .Mui-selected': { color: '#003366', fontWeight: 'bold' },
            '& .MuiTabs-indicator': { backgroundColor: plantTheme.accent },
          }}
        >
          <Tab label="Total Flow" value="total" />
          {roomCodes.map((room) => (
            <Tab key={room} label={getEngineRoomDisplayName(room)} value={room} />
          ))}
        </Tabs>
      </Paper>

      {isTotalTab ? (
        <Box>
          <Typography variant="h5" gutterBottom>
            Total Plant Flow: {totalPlantFlow.toFixed(1)} ML/d
            {designCapacity > 0 && ` (Design Capacity: ${designCapacity} ML/d)`}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#003366' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Engine Room</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Running Pumps</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Total Pumps</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Flow (ML/d)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">% of Plant</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">% of Capacity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roomSummaries.map((item) => (
                  <TableRow key={item.room}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      {getEngineRoomDisplayName(item.room)}
                    </TableCell>
                    <TableCell align="right">{item.running}</TableCell>
                    <TableCell align="right">{item.total}</TableCell>
                    <TableCell align="right">{item.totalFlow.toFixed(1)}</TableCell>
                    <TableCell align="right">
                      {totalPlantFlow > 0 ? ((item.totalFlow / totalPlantFlow) * 100).toFixed(1) : 0}%
                    </TableCell>
                    <TableCell align="right">
                      {designCapacity > 0 ? ((item.totalFlow / designCapacity) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#f5f5f5', fontWeight: 'bold' }}>
                  <TableCell>Plant Total</TableCell>
                  <TableCell align="right">
                    {roomSummaries.reduce((s, r) => s + r.running, 0)}
                  </TableCell>
                  <TableCell align="right">
                    {roomSummaries.reduce((s, r) => s + r.total, 0)}
                  </TableCell>
                  <TableCell align="right">{totalPlantFlow.toFixed(1)}</TableCell>
                  <TableCell align="right">100%</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: plantLoadPercent > 100 ? 'error' : 'inherit' }}
                  >
                    {plantLoadPercent.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Box>
          <Typography variant="h5" gutterBottom>
            {getEngineRoomDisplayName(currentRoom)} ({currentPumps.length} pumps)
          </Typography>
          <Grid container spacing={2}>
            {currentPumps.map((pump) => {
              const isMaintenance = maintenanceMap[pump.id] || false;
              const isTripped = trippedMap[pump.id] || false;
              const isRunning = pump.status === 'Running' && !isTripped && !isMaintenance;

              let statusColor = '#28A743';
              let statusLabel = 'Standby';
              let chipColor = 'success';

              if (isMaintenance) {
                statusColor = '#9e9e9e';
                statusLabel = 'Maintenance';
                chipColor = 'default';
              } else if (isTripped) {
                statusColor = '#FFA500';
                statusLabel = 'Tripped';
                chipColor = 'warning';
              } else if (isRunning) {
                statusColor = '#d32f2f';
                statusLabel = 'Running';
                chipColor = 'error';
              }

              const seconds = pumpSeconds[pump.id] || 0;
              const displayTime = formatRunningTime(seconds);
              const tooltipTitle = isMaintenance
                ? 'Pump is under maintenance – start/stop disabled'
                : isTripped
                ? 'Pump has tripped – press Reset or Start to recover'
                : isRunning
                ? 'Pump is running'
                : 'Pump is on standby';

              const PumpSvg = () => (
                <svg width="150" height="90" viewBox="0 0 150 90"
                     style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}>
                  {/* === BASE PLATE === */}
                  <rect x="10" y="76" width="130" height="6" rx="1" fill="#37474F" />
                  <rect x="15" y="82" width="120" height="3" rx="1" fill="#263238" />

                  {/* === SUCTION PIPE (coming from left, going into volute) === */}
                  <rect x="0" y="46" width="22" height="10" fill="#B0BEC5" stroke="#607D8B" strokeWidth="1" />
                  <rect x="18" y="41" width="6" height="20" fill="#90A4AE" stroke="#546E7A" strokeWidth="1" />
                  {/* Flange bolts */}
                  <circle cx="21" cy="43" r="1" fill="#37474F" />
                  <circle cx="21" cy="59" r="1" fill="#37474F" />

                  {/* === DISCHARGE PIPE (going up out of volute) === */}
                  <rect x="82" y="0" width="14" height="30" fill="#B0BEC5" stroke="#607D8B" strokeWidth="1" />
                  <rect x="78" y="26" width="22" height="6" fill="#90A4AE" stroke="#546E7A" strokeWidth="1" />
                  <circle cx="82" cy="29" r="1" fill="#37474F" />
                  <circle cx="96" cy="29" r="1" fill="#37474F" />

                  {/* === MOTOR (left block with cooling fins) === */}
                  <rect x="20" y="35" width="60" height="32" rx="3"
                        fill="#78909C" stroke="#455A64" strokeWidth="1.5" />
                  {/* Cooling fins */}
                  {[24, 30, 36, 42, 48, 54, 60, 66, 72].map((x) => (
                    <line key={x} x1={x} y1="37" x2={x} y2="65"
                          stroke="#546E7A" strokeWidth="1" />
                  ))}
                  {/* Terminal box on top */}
                  <rect x="42" y="28" width="16" height="10" rx="2"
                        fill="#455A64" stroke="#263238" strokeWidth="1" />
                  {/* End cap */}
                  <ellipse cx="80" cy="51" rx="3" ry="16" fill="#607D8B" />
                  {/* Motor shaft stub */}
                  <rect x="78" y="48" width="6" height="6" fill="#37474F" />

                  {/* === COUPLING GUARD (between motor and pump) === */}
                  <rect x="84" y="42" width="10" height="18" rx="1"
                        fill="#FFC107" stroke="#F57C00" strokeWidth="1" />
                  {/* Warning stripes */}
                  <line x1="84" y1="46" x2="94" y2="46" stroke="#F57C00" strokeWidth="0.8" />
                  <line x1="84" y1="52" x2="94" y2="52" stroke="#F57C00" strokeWidth="0.8" />
                  <line x1="84" y1="58" x2="94" y2="58" stroke="#F57C00" strokeWidth="0.8" />

                  {/* === VOLUTE / PUMP HOUSING (status-coloured) === */}
                  <circle cx="102" cy="51" r="20" fill={statusColor}
                          stroke="#263238" strokeWidth="1.5" />
                  {/* Spiral highlight */}
                  <path d="M 102 31 A 20 20 0 0 1 122 51"
                        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                  {/* Inner ring */}
                  <circle cx="102" cy="51" r="14" fill="none"
                          stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
                  {/* Impeller centre */}
                  <circle cx="102" cy="51" r="6" fill="#FFFFFF"
                          stroke="#003366" strokeWidth="1.5" />
                  {/* Impeller vanes (rotating suggestion) */}
                  <line x1="102" y1="46" x2="102" y2="50" stroke="#003366" strokeWidth="1" />
                  <line x1="106" y1="51" x2="103" y2="51" stroke="#003366" strokeWidth="1" />
                  <line x1="100" y1="55" x2="101" y2="52" stroke="#003366" strokeWidth="1" />

                  {/* === BEARING HOUSING (between coupling and volute) === */}
                  <rect x="94" y="40" width="8" height="22" rx="2"
                        fill="#90A4AE" stroke="#546E7A" strokeWidth="1" />

                  {/* === STATUS RING (visual pulse for running) === */}
                  {statusColor === '#d32f2f' && (
                    <>
                      <circle cx="102" cy="51" r="24" fill="none"
                              stroke="#d32f2f" strokeWidth="1.5"
                              strokeDasharray="4 3" opacity="0.7" />
                      {/* Rotation arrows */}
                      <path d="M 120 42 L 124 44 L 120 46" fill="none"
                            stroke="#d32f2f" strokeWidth="1.2" />
                    </>
                  )}
                  {isTripped && (
                    <circle cx="102" cy="51" r="24" fill="none"
                            stroke="#FFA500" strokeWidth="2"
                            strokeDasharray="5 4" />
                  )}
                  {isMaintenance && (
                    <circle cx="102" cy="51" r="24" fill="none"
                            stroke="#9e9e9e" strokeWidth="1.5" />
                  )}

                  {/* === PUMP NUMBER BADGE === */}
                  <rect x="95" y="44" width="14" height="14" rx="2"
                        fill="white" stroke="#003366" strokeWidth="1.2" />
                  <text
                    x="102"
                    y="55"
                    textAnchor="middle"
                    fill="#003366"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="Segoe UI, sans-serif"
                  >
                    {pump.number}
                  </text>

                  {/* === LABELS === */}
                  <text x="35" y="88" textAnchor="middle" fill="#546E7A"
                        fontSize="6" fontWeight="bold">MOTOR</text>
                  <text x="102" y="88" textAnchor="middle" fill="#546E7A"
                        fontSize="6" fontWeight="bold">PUMP</text>
                </svg>
              );

              let buttonLabel = 'Start';
              let buttonColor = 'primary';
              let onClickAction = () => handleStartPump(pump.id);

              if (isMaintenance) {
                buttonLabel = 'Disabled';
                onClickAction = null;
              } else if (isRunning) {
                buttonLabel = 'Stop';
                buttonColor = 'error';
                onClickAction = () => togglePump(pump.id, pump.status);
              } else if (isTripped) {
                buttonLabel = 'Reset & Start';
                onClickAction = () => handleStartPump(pump.id);
              }

              const isSelectable = isEikenhof && EIKENHOF_SELECTABLE_PUMPS.includes(pump.number);
              const currentDestination = pump.destination || 'Whiteridge';

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={pump.id}>
                  <Card
                    sx={{
                      bgcolor: plantTheme.cardBackground,
                      borderLeft: isTripped ? '5px solid #FFA500' : 'none',
                    }}
                  >
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                        mb={1}
                      >
                        <Tooltip title={tooltipTitle} arrow>
                          <Box>
                            <PumpSvg />
                          </Box>
                        </Tooltip>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="h6">Pump {pump.number}</Typography>
                          {pumpHealthMap[pump.number] && (
                            <Tooltip title={`Health ${pumpHealthMap[pump.number].score}/100${
                              pumpHealthMap[pump.number].reasons?.length > 0
                                ? ' — ' + pumpHealthMap[pump.number].reasons.join(', ')
                                : ''
                            }`}>
                              <Chip
                                label={pumpHealthMap[pump.number].score}
                                size="small"
                                sx={{
                                  bgcolor: pumpHealthMap[pump.number].color,
                                  color: 'white',
                                  fontWeight: 'bold',
                                  height: 20,
                                  fontSize: '0.65rem',
                                  minWidth: 36,
                                }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Chip label={statusLabel} color={chipColor} size="small" />
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        Flow: {pump.flowRate || 0} ML/d
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Running: {displayTime}
                      </Typography>

                      {isSelectable ? (
                        <Box mt={1.5}>
                          <FormControl size="small" fullWidth>
                            <InputLabel id={`dest-label-${pump.id}`}>Destination</InputLabel>
                            <Select
                              labelId={`dest-label-${pump.id}`}
                              value={currentDestination}
                              label="Destination"
                              onChange={(e) => handleDestinationChange(pump.id, e.target.value)}
                              disabled={isMaintenance || readOnly}
                            >
                              <MenuItem value="Whiteridge">Whiteridge</MenuItem>
                              <MenuItem value="Meyerdale">Meyerdale</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      ) : (
                        isEikenhof && (
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5 }}>
                            Destination: Whiteridge
                          </Typography>
                        )
                      )}

                      <Box mt={2}>
                        <ToggleButtonGroup
                          size="small"
                          value={isMaintenance ? 'maintenance' : 'on-service'}
                          exclusive
                          onChange={() => { if (!readOnly) toggleMaintenance(pump.id); }}
                          aria-label="operational status"
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          <ToggleButton value="on-service">On Service</ToggleButton>
                          <ToggleButton value="maintenance">Maintenance</ToggleButton>
                        </ToggleButtonGroup>
                      </Box>

                      <Box display="flex" gap={1} mt={1}>
                        <Button
                          variant="contained"
                          color={buttonColor}
                          size="small"
                          fullWidth
                          disabled={isMaintenance || readOnly}
                          onClick={onClickAction}
                        >
                          {buttonLabel}
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          disabled={isMaintenance || readOnly}
                          onClick={() => handleTripToggle(pump.id)}
                        >
                          {isTripped ? 'Reset' : 'Trip'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      <Dialog open={warningDialogOpen} onClose={handleWarningCancel}>
        <DialogTitle>⚠️ Capacity Exceeded</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ whiteSpace: 'pre-wrap' }}>
            {warningMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleWarningCancel}>Cancel</Button>
          <Button onClick={handleWarningConfirm} color="warning" variant="contained" autoFocus>
            Proceed Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
