function sortByMany(list, specs) {
  // Clono el array para no mutar el original
  const cloned = [...list];
  
  // Ordeno con un comparador que recorre las specs
  cloned.sort((a, b) => {
    for (let spec of specs) {
      const valA = a[spec.key];
      const valB = b[spec.key];
      
      // Comparo según la dirección
      if (valA < valB) return spec.dir === 'asc' ? -1 : 1;
      if (valA > valB) return spec.dir === 'asc' ? 1 : -1;
    }
    return 0; // Si son iguales en todas las keys
  });
  
  return cloned;
}