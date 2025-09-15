//Tema: Objetos + Funciones puras​
//Consigna: Escribí pick(obj, keys) que devuelva un nuevo objeto con solo las
//claves indicadas (ignorar las que no existan).​
//Ejemplos:​
//pick({a:1,b:2,c:3}, ['a','c','z']) → {a:1, c:3}​
//Criterios: No mutar obj.


function pick(obj, keys) {
    // Creo un nuevo objeto vacío para no mutar el original
    const result = {};
    
    // Itero sobre las claves indicadas y las copio si existen en obj
    for (let key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }



console.log(pick({a:1,b:2,c:3}, ['a','c','z']));