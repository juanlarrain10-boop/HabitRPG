// ============================================================
//  DATOS.JS — Edita aquí todos los valores sin tocar el diseño
// ============================================================

const datos = {
  casa: {
    nombre: "Casa Monseñor Carlos Casanueva",
    barrio: "Pedro Valdivia Norte, Providencia",
    ciudad: "Santiago de Chile"
  },

  // Cada pieza arrendada
  piezas: [
    {
      id: "suite",
      nombre: "Suite",
      descripcion: "En suite · Baño privado",
      precio: 420000,
      gastosIncluidos: true,
      notas: "Arrendataria temporal 3 meses — futura Airbnb"
    },
    {
      id: "noreste-grande",
      nombre: "Pieza Noreste Grande",
      descripcion: "Orientación noreste · Amplia",
      precio: 420000,
      gastosIncluidos: false,
      notas: null
    },
    {
      id: "noreste-pequena",
      nombre: "Pieza Noreste Pequeña",
      descripcion: "Orientación noreste",
      precio: 370000,
      gastosIncluidos: false,
      notas: null
    },
    {
      id: "suroeste",
      nombre: "Pieza Suroeste",
      descripcion: "Menor luminosidad",
      precio: 320000,
      gastosIncluidos: false,
      notas: null
    }
  ],

  // Gastos mensuales del inmueble
  gastos: {
    // Cambia este total si lo necesitas; el desglose es referencial
    total: 250000,
    detalle: [
      { nombre: "Agua",                  monto: 35000  },
      { nombre: "Electricidad",          monto: 80000  },
      { nombre: "Gas",                   monto: 45000  },
      { nombre: "WiFi",                  monto: 30000  },
      { nombre: "Jardinero mensual",     monto: 40000  },
      { nombre: "Agua purificada",       monto: 10000  },
      { nombre: "Piscinero (verano)",    monto: 10000  }
    ],
    nota: "La administradora no paga agua, luz ni gas"
  },

  // Dos escenarios de sueldo para la administradora
  administradora: {
    escenarios: [
      { label: "Escenario A", sueldo: 300000 },
      { label: "Escenario B", sueldo: 400000 }
    ]
  },

  // Costo total de la remodelación
  remodelacion: {
    costo: 20000000
  },

  // Características informativas de la propiedad
  caracteristicas: [
    { icono: "📐", titulo: "Superficie total",       detalle: "650 m²" },
    { icono: "🏠", titulo: "Superficie construida",  detalle: "180 m²" },
    { icono: "🛁", titulo: "Baños nuevos",           detalle: "3 baños en planta baja" },
    { icono: "🏊", titulo: "Piscina",                detalle: "Patio trasero" },
    { icono: "🌿", titulo: "Jardín y patios",        detalle: "Patio delantero y trasero" },
    { icono: "🏢", titulo: "Piso administradora",    detalle: "Tercer nivel — privado" },
    { icono: "🍳", titulo: "Cocina equipada",        detalle: "Lavadora, loza y electrodomésticos" },
    { icono: "🎨", titulo: "Decoración",             detalle: "Muebles en tendencia · Cuadros de artistas nacionales" },
    { icono: "🔨", titulo: "Remodelación reciente",  detalle: "Pisos nuevos, parquet pulido, baños renovados" },
    { icono: "🛏️", titulo: "Piezas arrendables",   detalle: "4 habitaciones independientes" }
  ]
};
