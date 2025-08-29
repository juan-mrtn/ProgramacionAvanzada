const alertas = [
    { id: 1, nivel: "alto", descripcion: "Intento de intrusión en servidor web", origen: "192.168.1.100" },
    { id: 2, nivel: "medio", descripcion: "Acceso no autorizado a base de datos", origen: "192.168.1.101" },
    { id: 3, nivel: "alto", descripcion: "Ataque DDoS detectado", origen: "192.168.1.102" },
    { id: 4, nivel: "bajo", descripcion: "Error kitten conexión menor", origen: "192.168.1.103" },
    { id: 5, nivel: "alto", descripcion: "Fuga de datos posible", origen: "192.168.1.104" }
  ];
  const alertasAltas = alertas.filter(alerta => alerta.nivel === "alto");
  const mensajes = alertasAltas.map(alerta => 
    `Alerta de nivel alto: ${alerta.descripcion} desde ${alerta.origen}. Revisar inmediatamente.`
  );
  console.log(mensajes);