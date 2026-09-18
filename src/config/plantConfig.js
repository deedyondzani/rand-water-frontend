export const PLANT_LINES = {
  Palmiet: {
    incoming: ['B4', 'B6', 'B13'],
    outgoing: ['O1', 'O2', 'O3', 'O4', 'O5'],
  },
  Eikenhof: {
    incoming: ['A19', 'B7', 'B14'],
    outgoing: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
  },
  Zwartkopjes: {
    incoming: ['A6', 'A8', 'A10', 'B1', 'B2'],
    outgoing: ['C11/C5', 'C24', 'C8', 'C6', 'C16', 'C18', 'C19', 'C10'],
  },
  Mapleton: {
    incoming: [],
    outgoing: [],
  },
};

export const getPlantLines = (plantId) =>
  PLANT_LINES[plantId] || { incoming: [], outgoing: [] };

export const PLANT_DESIGN_CAPACITY = {
  Palmiet: 2050,
  Eikenhof: 1200,
  Zwartkopjes: 700,
  Mapleton: 0,
};
