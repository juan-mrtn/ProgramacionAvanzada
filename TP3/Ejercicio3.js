/*3) Agrupar por clave o función
Tema: Arrays + Objetos + HOF​
Consigna: groupBy(list, keyOrFn) agrupa una lista por:
●​ string: nombre de propiedad​
●​ función: (item) => clave​
    Ejemplos:​
    groupBy([{t:'a'},{t:'b'},{t:'a'}], 't') → { a:[...], b:[...] }​
    groupBy([6,7,8,9], n => n%2?'impar':'par') → { par:[6,8],
    impar:[7,9] }​
    Criterios: Retornar objeto plano; no mutar list.

    function groupBy(list, keyOrFn) {
    // tu código
}   */

//function groupBy(list, keyOrFn) {
//    return list.reduce((acc, item) => {
//        const key = typeof keyOrFn === 'function' ? keyOrFn(item) : item[keyOrFn];
//        acc[key] = acc[key] || [];
//        acc[key].push(item);
//        return acc;
//    }, {});
//}

function groupBy(list, keyOrFn) {
    // Objeto vacío para los grupos (usamos objeto como mapa)
    const groups = {};
    
    // Iteramos el array con for...of (HOF implícito en el loop)
    for (let item of list) {
      // HOF: chequeamos si keyOrFn es string (prop) o function
      let groupKey = typeof keyOrFn === 'string' ? item[keyOrFn] : keyOrFn(item);
      // Inicializamos el array si no existe (array como valor en objeto)
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      // Pusheamos el item al grupo
      groups[groupKey].push(item);
    }
    
    // Retornamos el objeto sin mutar list
    return groups;
  }

console.log(groupBy([{t:'a'},{t:'b'},{t:'a'}], 't'));
console.log(groupBy([6,7,8,9], n => n%2?'impar':'par'));
