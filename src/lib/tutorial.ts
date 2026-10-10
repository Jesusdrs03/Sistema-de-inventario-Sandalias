import type { Module } from "./constants";

export interface TutorialEntry {
  title: string;
  purpose: string;
  steps: string[];
}

/** Guía de uso de cada módulo, mostrada a los usuarios con el tutorial activado */
export const TUTORIAL: Record<Module, TutorialEntry> = {
  dashboard: {
    title: "Inicio",
    purpose: "Resumen del negocio de un vistazo: ventas del día y del mes, cuentas por cobrar, productos por agotarse y la tasa del dólar BCV.",
    steps: [
      "Revisa las tarjetas de arriba para ver cómo va el día.",
      "La gráfica muestra las ventas de los últimos 14 días y los métodos de pago más usados.",
      "En \"Productos con stock bajo\" verás qué modelos debes reponer o fabricar.",
      "Arriba a la derecha está siempre la tasa del dólar BCV; el botón ↻ la actualiza.",
    ],
  },
  pos: {
    title: "Punto de venta",
    purpose: "Aquí se registran las ventas: eliges productos y tallas, el cliente y cómo paga.",
    steps: [
      "Busca el producto o filtra por categoría y tócalo para elegir la talla y la cantidad.",
      "Escribe el nombre, cédula o teléfono del cliente. Si no existe, pulsa \"Registrarlo y continuar la venta\".",
      "Elige \"Precio detal\" o \"Precio mayor\" y aplica descuento si corresponde.",
      "Pulsa \"Cobrar\", agrega uno o varios métodos de pago (Pago Móvil, Zelle, efectivo…) e indica la referencia. La varita ✨ completa el monto exacto.",
      "Confirma la venta; podrás imprimir el ticket o enviarlo por WhatsApp.",
    ],
  },
  ventas: {
    title: "Historial de ventas",
    purpose: "Consulta todas las ventas registradas, reimprime tickets y, si tienes permiso, anula ventas.",
    steps: [
      "Filtra por fechas, estado o método de pago, o busca por número o cliente.",
      "Con el ícono del ojo ves y reimprimes el ticket.",
      "Anular una venta (gerente o administrador) devuelve los productos al inventario y pide un motivo.",
      "\"Exportar\" descarga las ventas para abrirlas en Excel.",
    ],
  },
  cobranzas: {
    title: "Cuentas por cobrar",
    purpose: "Ventas a crédito que todavía tienen saldo pendiente.",
    steps: [
      "Revisa cuánto debe cada cliente y desde hace cuántos días.",
      "Pulsa \"Abonar\" para registrar un pago parcial o total con cualquier método.",
      "El ícono de WhatsApp envía al cliente un recordatorio con su saldo en $ y en Bs.",
    ],
  },
  clientes: {
    title: "Clientes",
    purpose: "Registro de tus clientes al detal y mayoristas.",
    steps: [
      "Pulsa \"Nuevo cliente\" e indica nombre, cédula/RIF y, si quieres, teléfono y dirección.",
      "Una vez registrado solo se pueden cambiar el teléfono y la dirección.",
      "La columna \"Deuda\" muestra si el cliente tiene saldo pendiente.",
    ],
  },
  caja: {
    title: "Cierre de caja",
    purpose: "Cuadre del día: cuánto se cobró por cada método de pago y en su moneda original.",
    steps: [
      "Elige la fecha (y el cajero, si eres gerente o administrador).",
      "Compara cada total con lo que hay en caja, en el banco, en Zelle y en Binance.",
      "Pulsa \"Imprimir\" para sacar el cierre con espacio para las firmas.",
    ],
  },
  productos: {
    title: "Productos",
    purpose: "Catálogo de modelos con su precio, costo, tallas y existencia.",
    steps: [
      "\"Nuevo producto\" crea un modelo con su código, color, precios y el stock inicial por talla.",
      "El botón verde \"Reponer\" suma pares al inventario cuando llega mercancía.",
      "El lápiz edita precios, tallas y datos del modelo.",
      "Los colores del total indican: verde = suficiente, amarillo = stock bajo, rojo = agotado.",
    ],
  },
  inventario: {
    title: "Inventario y kardex",
    purpose: "Existencias por talla de todos los modelos y el historial de cada movimiento.",
    steps: [
      "\"Reponer\" suma pares (compra o llegada de mercancía).",
      "\"Salida\" resta pares que salen sin venta (muestras, defectos, traslados).",
      "\"Ajuste\" corrige el stock según un conteo físico: escribe la cantidad real.",
      "En la pestaña \"Kardex\" ves quién movió qué, cuándo y por qué.",
    ],
  },
  produccion: {
    title: "Producción",
    purpose: "Órdenes de fabricación de la fábrica.",
    steps: [
      "\"Nueva orden\": elige el modelo, cuántos pares por talla y la materia prima a consumir.",
      "\"Iniciar\" la pasa a \"En proceso\".",
      "\"Terminar\" suma los pares al inventario y descuenta la materia prima automáticamente.",
    ],
  },
  materiales: {
    title: "Materia prima",
    purpose: "Insumos de la fábrica: suelas, cuero, correas, pegamento, hebillas…",
    steps: [
      "Registra cada material con su unidad, stock mínimo, costo y proveedor.",
      "Usa \"Entrada\" cuando compres, \"Salida\" cuando se dañe o se use fuera de una orden y \"Ajuste\" tras un conteo.",
      "Los materiales bajo el mínimo aparecen en amarillo.",
    ],
  },
  proveedores: {
    title: "Proveedores",
    purpose: "Datos de contacto de quienes te venden materia prima e insumos.",
    steps: [
      "Registra la razón social, RIF, contacto y qué te suministra.",
      "Una vez registrado solo se pueden cambiar el teléfono y la dirección.",
      "El ícono de WhatsApp abre una conversación con el proveedor.",
    ],
  },
  gastos: {
    title: "Gastos",
    purpose: "Egresos del negocio (servicios, nómina, alquiler, transporte…) para conocer la utilidad real.",
    steps: [
      "\"Registrar gasto\": concepto, categoría, método de pago y monto en Bs o $.",
      "El panel izquierdo muestra en qué categorías se va el dinero.",
    ],
  },
  reportes: {
    title: "Reportes",
    purpose: "Rentabilidad y comportamiento del negocio en cualquier período.",
    steps: [
      "Elige un período (hoy, 7, 30 o 90 días, o fechas propias).",
      "Revisa ventas, costo, utilidad bruta, gastos y utilidad neta.",
      "Mira qué productos, tallas, vendedores y métodos de pago rinden más.",
      "\"Exportar\" descarga el reporte para Excel.",
    ],
  },
  usuarios: {
    title: "Usuarios y roles",
    purpose: "Cuentas de tus empleados y lo que cada uno puede hacer.",
    steps: [
      "\"Nuevo usuario\": nombre, correo, contraseña inicial y rol.",
      "Activa o desactiva el tutorial de cada usuario con el interruptor \"Tutorial\".",
      "Desactiva a un usuario para que ya no pueda entrar, sin borrar su historial.",
      "La matriz de permisos muestra qué módulos ve cada rol.",
    ],
  },
  configuracion: {
    title: "Configuración",
    purpose: "Datos de la empresa, impuestos, tasa de cambio y métodos de pago.",
    steps: [
      "Completa razón social, RIF, dirección, teléfono y correo (aparecen en el ticket y en las páginas legales).",
      "Activa IVA o IGTF según corresponda.",
      "La tasa BCV es automática; puedes fijarla a mano si hace falta.",
      "Carga los datos de Pago Móvil, transferencia, Zelle y Binance para mostrarlos al cobrar.",
    ],
  },
};
