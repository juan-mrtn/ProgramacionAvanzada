function deepEqual(a, b) {
  // Si uno es null y el otro no, false
  if (a === null || b === null) return a === b;
  
  // Si tipos son distintos, false
  if (typeof a !== typeof b) return false;
  
  // Si es primitivo (no objeto), comparo directamente
  if (typeof a !== 'object') return a === b;
  
  // Si uno es array y el otro no, false
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  // Si es array, comparo longitud y elementos recursivamente
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Si es objeto, comparo keys y valores recursivamente
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  for (let key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}