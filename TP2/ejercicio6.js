  const traficoRed = {
    "08:00": 1250,
    "09:00": 1870,
    "10:00": 2100,
    "11:00": 1950,
    "12:00": 1600,
    "13:00": 1300,
    "14:00": 1700,
    "15:00": 2200,
    "16:00": 1800,
    "17:00": 1500
  };
  let totalDatos = 0;
  for (let hora in traficoRed) {
    totalDatos += traficoRed[hora];
  }
  let maxTrafico = 0;
  let horaMax = "";
  for (let hora in traficoRed) {
    if (traficoRed[hora] > maxTrafico) {
      maxTrafico = traficoRed[hora];
      horaMax = hora;
    }
  }
  console.log("Total de datos transferidos:", totalDatos);
  console.log("Hora con mayor tráfico:", horaMax);