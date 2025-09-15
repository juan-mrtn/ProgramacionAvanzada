function sumUnique(nums) {
    // Función auxiliar para chequear si es un numero y no un string u otra cosa
    function isValidNumber(item) {
      const num = Number(item);
      return Number.isFinite(num);
    }
    
    // Filtro solo números válidos
    const validNums = nums.filter(isValidNumber);
    
    // Los Set son para obtener únicos
    const uniqueSet = new Set(validNums);
    

    const uniqueArray = Array.from(uniqueSet);
    return uniqueArray.reduce((acum, current) => acum + current, 0);
  }

console.log(sumUnique([1, 2, 2, 3, 'a']));