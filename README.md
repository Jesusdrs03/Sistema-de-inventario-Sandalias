# MR Calzados · Sistema de inventario y ventas

Sistema web para **fábrica y tienda de sandalias** en Venezuela: punto de venta con pagos mixtos, inventario por talla, producción, materia prima, cuentas por cobrar, cierre de caja, reportes y **tasa oficial del Dólar BCV actualizada automáticamente**.

Hecho con **Next.js 15 + React 19 + Tailwind CSS**, base de datos **Firebase (Firestore + Authentication)** y listo para publicar en **Vercel**.

---

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Inicio** | Ventas del día/mes en $ y Bs, gráfica de 14 días, métodos de pago, más vendidos, alertas de stock bajo. Se adapta al rol. |
| **Punto de venta** | Catálogo con búsqueda y categorías, selección de **talla y cantidad**, precio **detal / mayor**, descuentos ($ o %), cliente, **pagos mixtos**, cálculo de **IGTF**, IVA opcional, **vuelto en $ y Bs**, ventas a **crédito**, ticket imprimible y envío por **WhatsApp**. |
| **Métodos de pago** | Pago Móvil, Transferencia, Punto de Venta, Efectivo Bs, Efectivo en divisas ($), Zelle y Binance (USDT). Con referencia y banco emisor. |
| **Tasa BCV** | Se consulta sola cada 30 minutos (y al volver a la pestaña) desde el BCV. Queda guardada por día (histórico). Si el BCV no responde usa la última tasa guardada. Opción de tasa manual. |
| **Historial de ventas** | Filtros por fecha, estado y método; reimpresión; **anulación** con motivo (devuelve el stock); exportación a Excel (CSV). |
| **Cuentas por cobrar** | Saldos pendientes, antigüedad de la deuda, abonos con cualquier método y recordatorio por WhatsApp. |
| **Clientes / Proveedores** | Registro con cédula/RIF, tipo detal/mayorista, deuda, contacto por WhatsApp. |
| **Cierre de caja** | Cuadre diario por método de pago en su moneda original, abonos, vueltos, IGTF, gastos; filtro por cajero; impresión con firmas. |
| **Productos** | Modelo, código, categoría, color, material, precio detal/mayor, costo y margen, stock mínimo, tallas, imagen. |
| **Inventario y kardex** | Matriz de existencias por talla, entradas, salidas, ajustes por conteo físico y kardex con todos los movimientos. |
| **Producción** | Órdenes de fabricación por talla con consumo de materia prima. Al terminarla suma los pares al inventario y descuenta los insumos. |
| **Materia prima** | Suelas, cuero, correas, pegamento… con existencia, mínimo, costo y proveedor. |
| **Gastos** | Egresos por categoría y método de pago (en Bs o $). |
| **Reportes** | Ventas netas, costo, utilidad bruta y neta, margen, ventas por día, por método, por vendedor, por categoría, tallas más vendidas, rentabilidad por producto e histórico de la tasa BCV. |
| **Usuarios y roles** | Alta de empleados, activar/desactivar, restablecer contraseña y matriz de permisos. |
| **Configuración** | Datos de la empresa (RIF, dirección), IVA, IGTF, tasa automática/manual, métodos habilitados, datos de Pago Móvil, cuenta bancaria, Zelle y Binance, pie del ticket, tallas por defecto. |

Además: modo oscuro, diseño adaptable a celular (se puede agregar a la pantalla de inicio), impresión de tickets de 80 mm.

### Roles

| Rol | Acceso |
|---|---|
| **Administrador** | Todo, incluidos usuarios, configuración y eliminación de registros. |
| **Gerente** | Todo el negocio excepto usuarios y configuración. Puede anular ventas. |
| **Vendedor / Cajero** | Punto de venta, historial (solo sus ventas), clientes, cobranzas y cierre de caja. |
| **Almacén / Producción** | Productos, inventario, producción, materia prima y proveedores. |

Los permisos se aplican en la interfaz **y** en la base de datos mediante las reglas de seguridad de Firestore (`firestore.rules`): por ejemplo, un vendedor solo puede descontar stock al vender, nunca editar precios.

---

## Probarlo ya (modo demostración)

Con `NEXT_PUBLIC_DEMO_MODE=true` el sistema arranca en **modo demostración** con datos de ejemplo guardados en el navegador. En la pantalla de inicio de sesión hay botones para entrar con cada rol (contraseña `demo123`).

```bash
npm install
NEXT_PUBLIC_DEMO_MODE=true npm run dev
# abre http://localhost:3000
```

---

## Publicarlo en la web (Firebase + Vercel)

### 1. Crear la base de datos en Firebase (gratis)

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto**.
2. **Build → Authentication → Comenzar** → habilita **Correo electrónico/contraseña**.
3. **Build → Firestore Database → Crear base de datos** → modo **producción** → ubicación `nam5` (o la más cercana).
4. En **Firestore → Reglas**, pega el contenido de [`firestore.rules`](./firestore.rules) y pulsa **Publicar**.
   (O con la CLI: `npm i -g firebase-tools && firebase login && firebase use --add && firebase deploy --only firestore:rules`).
5. **Configuración del proyecto (⚙️) → Tus apps → Web (`</>`)** → registra la app y copia los valores de `firebaseConfig`.

### 2. Publicar en Vercel (gratis)

> ✅ El proyecto Firebase **mr-calzados** ya está configurado: la configuración web está incluida en `src/lib/firebase.ts`, las reglas de seguridad están publicadas y el acceso por correo/contraseña está activo. **No hace falta cargar variables de entorno en Vercel.**

1. Entra a <https://vercel.com/new>, inicia sesión con GitHub e importa este repositorio.
2. Pulsa **Deploy**. Vercel te dará una URL tipo `https://tu-proyecto.vercel.app`.
3. En Firebase → **Authentication → Configuración → Dominios autorizados → Agregar dominio**, agrega ese dominio de Vercel (sin `https://`).

Para usar otro proyecto Firebase, define las variables `NEXT_PUBLIC_FIREBASE_*` (ver `.env.example`); tienen prioridad sobre la configuración incluida. Para ver el modo demostración usa `NEXT_PUBLIC_DEMO_MODE=true`.

### 3. Primer uso

Abre la URL **apenas publiques** (la primera persona que entre crea la cuenta de administrador): como la base de datos está vacía, aparecerá **Configuración inicial** para crear la cuenta del **administrador principal**. Luego:

1. **Configuración** → datos de la empresa, RIF, IVA/IGTF y datos de Pago Móvil/Zelle/Binance.
2. **Usuarios y roles** → crea las cuentas de tus empleados.
3. **Productos** → registra tus modelos con su stock inicial por talla.
4. ¡A vender!

> Cada vez que hagas *push* a GitHub, Vercel vuelve a publicar automáticamente.

---

## Tasa del Dólar BCV

La ruta `/api/bcv` (servidor de Vercel) consulta, en orden, estas fuentes hasta obtener la tasa oficial:

1. DolarAPI (`ve.dolarapi.com`, tasa oficial BCV)
2. La página oficial `bcv.org.ve`
3. PyDolarVE (monitor BCV)

La respuesta se guarda en caché 30 minutos. Cada venta registra la tasa con la que se hizo, y la tasa de cada día queda en el histórico (`rates`). Si ninguna fuente responde se usa la última tasa guardada, y siempre se puede fijar una **tasa manual** en Configuración.

## IGTF

Si está activo, se cobra el % configurado (3 % por defecto) **sobre la porción de la factura pagada en divisas** (efectivo $, Zelle, Binance). El botón ✨ de cada pago calcula automáticamente el monto exacto incluyendo el IGTF.

---

## Desarrollo

```bash
npm run dev      # servidor de desarrollo
npm run build    # compilación de producción
npm run lint     # verificación de tipos (TypeScript)
```

Para probar contra los emuladores de Firebase: `firebase emulators:start --only auth,firestore` y define `NEXT_PUBLIC_FIREBASE_EMULATOR=true` junto con un `NEXT_PUBLIC_FIREBASE_PROJECT_ID` de prueba (por ejemplo `demo-sandalias`).

### Estructura

```
src/
  app/
    login/            Inicio de sesión y configuración inicial
    (app)/            Módulos protegidos (pos, ventas, productos, inventario, …)
    api/bcv/          Tasa BCV (servidor)
  components/         Interfaz compartida (shell, modales, ticket, pagos)
  lib/
    db.ts             Capa de datos (Firestore o modo demo)
    auth.ts           Autenticación
    services.ts       Operaciones atómicas: ventas, anulaciones, abonos, inventario, producción
    constants.ts      Roles, permisos, métodos de pago, bancos
firestore.rules       Reglas de seguridad por rol
```
