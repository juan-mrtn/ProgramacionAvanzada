function isBalanced(s) {
  // Stack como array
  const stack = [];
  
  // Mapa de pares de cierre y apertura
  const pairs = {
    ')': '(',
    ']': '[',
    '}': '{'
  };
  
  // Itero cada carácter
  for (let char of s) {
    // Si es apertura, lo apilo
    if ('([{'.includes(char)) {
      stack.push(char);
    } else if (pairs[char]) {
      // Si es cierre, desapilo y chequeo match
      const last = stack.pop();
      if (last !== pairs[char]) return false;
    }
  }
  
  // Stack vacío = balanceado
  return stack.length === 0;
}