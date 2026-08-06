// Unit conversion utilities
export const UNIT_SYSTEMS = {
  METRIC: 'metric',
  IMPERIAL: 'imperial'
};

// Weight conversions
export const convertWeight = (value, fromUnit, toUnit) => {
  if (!value) return value;
  const num = parseFloat(value);
  
  if (fromUnit === toUnit) return num;
  
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return (num * 2.20462).toFixed(1);
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return (num / 2.20462).toFixed(1);
  }
  
  return num;
};

// Height conversions
export const convertHeight = (value, fromUnit, toUnit) => {
  if (!value) return value;
  const num = parseFloat(value);
  
  if (fromUnit === toUnit) return num;
  
  if (fromUnit === 'cm' && toUnit === 'inches') {
    return (num / 2.54).toFixed(1);
  }
  if (fromUnit === 'inches' && toUnit === 'cm') {
    return (num * 2.54).toFixed(1);
  }
  
  return num;
};

// Get unit labels based on system
export const getWeightUnit = (unitSystem) => unitSystem === UNIT_SYSTEMS.METRIC ? 'kg' : 'lbs';
export const getHeightUnit = (unitSystem) => unitSystem === UNIT_SYSTEMS.METRIC ? 'cm' : 'inches';

// Format height display
export const formatHeight = (cm, unitSystem) => {
  if (!cm) return '';
  
  if (unitSystem === UNIT_SYSTEMS.METRIC) {
    return `${cm} cm`;
  }
  
  const inches = parseFloat(cm) / 2.54;
  const feet = Math.floor(inches / 12);
  const remainingInches = (inches % 12).toFixed(1);
  return `${feet}'${remainingInches}"`;
};

// Parse height input (feet'inches" format for imperial)
export const parseHeightInput = (value, unitSystem) => {
  if (unitSystem === UNIT_SYSTEMS.METRIC) {
    return parseFloat(value) || null;
  }
  
  // Parse "5'10"" format for imperial
  const match = value.match(/(\d+)\s*'?\s*(\d+(?:\.\d+)?)\s*"?/);
  if (match) {
    const feet = parseInt(match[1]);
    const inches = parseFloat(match[2]);
    return ((feet * 12 + inches) * 2.54).toFixed(1);
  }
  
  return parseFloat(value) || null;
};