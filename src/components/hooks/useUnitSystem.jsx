import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useUnitSystem() {
  const [system, setSystem] = useState(() => localStorage.getItem('unit_system') || 'imperial');

  useEffect(() => {
    const handleStorage = () => {
      setSystem(localStorage.getItem('unit_system') || 'imperial');
    };
    window.addEventListener('unitSystemChanged', handleStorage);
    return () => window.removeEventListener('unitSystemChanged', handleStorage);
  }, []);

  const setUnitSystem = (newSystem) => {
    localStorage.setItem('unit_system', newSystem);
    setSystem(newSystem);
    window.dispatchEvent(new Event('unitSystemChanged'));
    // Persist to the account so the preference follows the user across devices.
    base44.auth.updateMe({ unit_system: newSystem }).catch(() => {});
  };

  const convertWeightDisplay = (valInKg) => {
    if (!valInKg && valInKg !== 0) return '';
    return system === 'imperial' ? (valInKg * 2.20462).toFixed(1) : parseFloat(valInKg).toFixed(1);
  };
  
  const convertWeightValue = (valInKg) => {
    if (!valInKg && valInKg !== 0) return '';
    return system === 'imperial' ? Number((valInKg * 2.20462).toFixed(2)) : Number(parseFloat(valInKg).toFixed(2));
  };

  const parseWeight = (valInDisplayUnit) => {
    if (!valInDisplayUnit && valInDisplayUnit !== 0) return '';
    return system === 'imperial' ? Number((parseFloat(valInDisplayUnit) / 2.20462).toFixed(2)) : parseFloat(valInDisplayUnit);
  };

  const convertHeightDisplay = (valInCm) => {
    if (!valInCm && valInCm !== 0) return '';
    return system === 'imperial' ? (valInCm / 2.54).toFixed(1) : parseFloat(valInCm).toFixed(1);
  };

  const convertHeightValue = (valInCm) => {
    if (!valInCm && valInCm !== 0) return '';
    return system === 'imperial' ? Number((valInCm / 2.54).toFixed(2)) : Number(parseFloat(valInCm).toFixed(2));
  };

  const parseHeight = (valInDisplayUnit) => {
    if (!valInDisplayUnit && valInDisplayUnit !== 0) return '';
    return system === 'imperial' ? Number((parseFloat(valInDisplayUnit) * 2.54).toFixed(2)) : parseFloat(valInDisplayUnit);
  };

  const weightUnit = system === 'imperial' ? 'lbs' : 'kg';
  const heightUnit = system === 'imperial' ? 'in' : 'cm';

  return { system, setUnitSystem, convertWeightDisplay, convertWeightValue, parseWeight, convertHeightDisplay, convertHeightValue, parseHeight, weightUnit, heightUnit };
}