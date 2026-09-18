// Shift → time slot mapping (mirrors the Java desktop QualityDataPanel)

export const SHIFTS_FOR = {
  '8-Hour': ['Morning', 'Afternoon', 'Night'],
  '12-Hour': ['Morning', 'Night'],
};

export const TIME_SLOTS = {
  '8-Hour': {
    Morning:   ['07:00', '09:00', '11:00', '13:00'],
    Afternoon: ['15:00', '17:00', '19:00', '21:00'],
    Night:     ['23:00', '01:00', '03:00', '05:00'],
  },
  '12-Hour': {
    Morning: ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00'],
    Night:   ['19:00', '21:00', '23:00', '01:00', '03:00', '05:00'],
  },
};

export const getTimeSlots = (shiftType, shift) =>
  (TIME_SLOTS[shiftType] && TIME_SLOTS[shiftType][shift]) || [];

export const getFirstTimeSlot = (shiftType, shift) => {
  const slots = getTimeSlots(shiftType, shift);
  return slots.length > 0 ? slots[0] : '07:00';
};

export const todayStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
};

// localStorage keys
export const storageKeyQuality = (plantId, date, shiftType, shift) =>
  `rw_quality_${plantId}_${date}_${shiftType}_${shift}`.replace(/[/:\s]/g, '_');

export const storageKeyActiveShift = (plantId) =>
  `rw_active_shift_${plantId}`;

export const storageKeyProcessDosing = (plantId, date, shiftType, shift) =>
  `rw_process_${plantId}_${date}_${shiftType}_${shift}`.replace(/[/:\s]/g, '_');

export const getActiveShift = (plantId) => {
  try {
    const raw = localStorage.getItem(storageKeyActiveShift(plantId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { date: todayStr(), shiftType: '8-Hour', shift: 'Morning' };
};

export const setActiveShift = (plantId, payload) => {
  try {
    localStorage.setItem(storageKeyActiveShift(plantId), JSON.stringify(payload));
  } catch { /* ignore */ }
};

export const loadQualityData = (plantId, date, shiftType, shift) => {
  try {
    const raw = localStorage.getItem(storageKeyQuality(plantId, date, shiftType, shift));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
};

export const saveQualityData = (plantId, date, shiftType, shift, payload) => {
  try {
    localStorage.setItem(
      storageKeyQuality(plantId, date, shiftType, shift),
      JSON.stringify(payload)
    );
  } catch { /* ignore */ }
};

export const loadProcessDosing = (plantId, date, shiftType, shift) => {
  try {
    const raw = localStorage.getItem(storageKeyProcessDosing(plantId, date, shiftType, shift));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
};

export const saveProcessDosing = (plantId, date, shiftType, shift, payload) => {
  try {
    localStorage.setItem(
      storageKeyProcessDosing(plantId, date, shiftType, shift),
      JSON.stringify(payload)
    );
  } catch { /* ignore */ }
};

// Free Cl₂ lookup from saved quality data
export const lookupFreeCl2 = (qualityData, line, timeSlot) => {
  if (!qualityData || !qualityData.readings) return '';
  const key = `${line}_${timeSlot}_free`;
  return qualityData.readings[key] || '';
};

// Variance formatting
export const formatVariance = (diff) => {
  if (diff === null || diff === undefined || isNaN(diff)) return '';
  const d = Math.round(diff * 100) / 100;
  if (d > 0) return `+${d.toFixed(2)} Above Chart`;
  if (d < 0) return `${d.toFixed(2)} Below Chart`;
  return '0.00 On Target';
};

export const varianceColor = (text) => {
  if (!text) return '#333';
  if (text.includes('Above')) return '#DC6400';
  if (text.includes('Below')) return '#1976d2';
  if (text.includes('On Target')) return '#28A743';
  return '#333';
};
