# PRD — CaféQR Cuba
## Product Requirements Document
### Sistema de Gestión de Cafetería con Pedidos por QR, Efectivo y Pagos Electrónicos Opcionales

| Campo | Valor |
| :--- | :--- |
| **Nombre del producto** | CaféQR Cuba |
| **Versión del documento** | 1.0 |
| **Estado** | Aprobado para desarrollo |
| **Autor** | Dueño de la cafetería (product owner) |
| **Fecha** | 2026-10-29 |
| **Mercado objetivo** | Cuba (cafeterías, pequeñas gastronomías) |

---

## 1. VISIÓN DEL PRODUCTO

### 1.1. Descripción

**CaféQR Cuba** es un sistema de gestión integral para cafeterías cubanas que digitaliza la toma de pedidos mediante códigos QR, unifica los canales de venta (mostrador, mesa, WhatsApp, redes sociales y domicilio) y garantiza el control total del efectivo, con soporte opcional para pagos electrónicos vía Transfermóvil y EnZona.

### 1.2. Propuesta de valor

> "El sistema que digitaliza tu cafetería sin depender de internet estable, sin comisiones por pedido y con control total del efectivo. Tus clientes escanean un QR, piden desde su teléfono, y tú cobras como quieras: efectivo, Transfermóvil o EnZona."

### 1.3. Diferenciadores clave

- ✅ **QR de menú + autopedido** integrado al flujo de cocina y caja (no solo carta digital).
- ✅ **Funciona sin internet** (local-first) — la cafetería no se detiene por un corte.
- ✅ **Efectivo como eje central** con control de caja, arqueo y repartidores.
- ✅ **Pagos electrónicos opcionales** (Transfermóvil/EnZona) sin depender de APIs bloqueadas.
- ✅ **Canales sociales manuales** (WhatsApp, Instagram, Facebook) sin API de Meta.
- ✅ **Sin límites de pedidos** ni comisiones por transacción.

### 1.4. Referencias de mercado

| Sistema | Qué tomar de ella | Limitación para Cuba |
| :--- | :--- | :--- |
| **Maspedidos.mx** | Flujo de pedidos mostrador/mesa/domicilio, KDS, corte de caja. | Depende de pagos electrónicos y API WhatsApp; innecesario. |
| **Loyverse POS** | POS gratuito con apertura/cierre de caja, arqueo, propinas, offline básico. | No adaptado a Cuba ni a pedidos por redes manuales. |
| **Odoo POS** | Sesiones de caja, control de efectivo, arqueo ciego, auditoría. | Complejo y pesado para una cafetería pequeña. |
| **Floreant/UniCenta/SambaPOS** | POS open-source con cajón monedero, tickets, cierre de turno, roles. | Requieren personalización; no resuelven redes sociales. |
| **Yerro Menu (Cuba)** | Catálogo digital ligero por QR para restaurantes cubanos. | Solo menú; no gestiona caja ni pedidos. |

---

## 2. CONTEXTO Y RESTRICCIONES DEL MERCADO CUBANO

### 2.1. Factores críticos

1. **Bloqueo de la API de WhatsApp Business (Meta):** No es posible automatizar mensajes a gran escala en Cuba. La estrategia pivota hacia el **comercio conversacional manual** y enlaces `wa.me`.
2. **Obligatoriedad de pasarelas de pago nacionales:** La **Resolución 93/2023** del MINCIN exige que los establecimientos gastronómicos tengan habilitada al menos una pasarela de pago electrónico (Transfermóvil o EnZona) o TPV, además del efectivo.
3. **Conectividad limitada e inestable:** El sistema debe ser **extremadamente ligero** y diseñado para "conexión intermitente" y cortes eléctricos.

### 2.2. Modelo de pago

| Método | Cuándo se usa | Cómo se registra |
| :--- | :--- | :--- |
| **Efectivo** | Mostrador, mesa, contra entrega a domicilio. | Cajero/repartidor ingresa monto, sistema calcula cambio. |
| **Transfermóvil (QR)** | Cliente prefiere pagar electrónico en caja o mesa. | Cajero genera/muestra QR, verifica pago en app/portal, marca "pagado electrónico". |
| **EnZona (QR/API)** | Igual que Transfermóvil; opcionalmente con confirmación automática vía API. | Registro manual o automático según integración. |

> **Regla de oro:** el pedido solo pasa a "Pagado" cuando el dinero (físico o electrónico confirmado) está registrado. Los pagos electrónicos se **concilian** al cierre contra el estado de cuenta bancario.

---

## 3. ARQUITECTURA TÉCNICA (RESUMEN EJECUTIVO)

- **Servidor local** (mini PC / Raspberry Pi) con UPS → opera la cafetería en LAN sin internet.
- **PWA de menú** servida desde el servidor local y replicada en la nube para acceso externo.
- **Sincronización asíncrona** con la nube para reportes, respaldos y pedidos remotos (WhatsApp/redes).
- **Impresora térmica + cajón monedero** conectados al servidor local.
- **Tablets/celulares** para meseros y KDS en la misma red.
- **Sin dependencia de APIs de Meta**; integración social manual con enlaces `wa.me` y QR.

### 3.1. Diagrama de flujo del negocio
┌─────────────────────────────────────────────────────────────────────┐
│ CANALES DE ENTRADA │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ QR en mesa │ Mostrador │ WhatsApp │ Instagram / Facebook │
│ (autopedido)│ (cajero) │ (manual) │ (manual) │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬────────────┘
│ │ │ │
▼ ▼ ▼ ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BANDEJA DE PEDIDOS UNIFICADA (CaféQR) │
│ Estados: Nuevo → Confirmado → En prep. → Listo → Pagado │
└──────────────────────────────┬──────────────────────────────────────┘
│
┌────────────────┼────────────────┐
▼ ▼ ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ COCINA │ │ CAJA │ │ REPARTIDOR │
│ (KDS LAN) │ │ (efectivo │ │ (cobro contra │
│ │ │ + QR pago)│ │ entrega) │
└────────────┘ └────────────┘ └────────────────┘
│
▼
┌─────────────────────┐
│ CIERRE DE CAJA │
│ · Arqueo efectivo │
│ · Conciliación QR │
│ · Liquidación reps │
└─────────────────────┘


### 3.2. Distinción clave: QR de menú vs. QR de pago

| Tipo de QR | ¿Qué hace? | ¿A dónde lleva? |
| :--- | :--- | :--- |
| **QR de Menú/Pedido** | Muestra la carta y permite armar el pedido. | A la **PWA de menú** (URL propia). |
| **QR de Pago (Transfermóvil/EnZona)** | Inicia una transacción de pago. | A la pasarela de pago (app Transfermóvil, portal Bulevar, etc.). |

---

## 4. ACTORES DEL SISTEMA

| Actor | Rol en el negocio | Acceso al sistema |
| :--- | :--- | :--- |
| **Dueño** | Supervisa operación, finanzas y configuración. | Total (todos los módulos). |
| **Gerente** | Turnos, reportes, autorizaciones, cancelaciones. | Todos excepto configuración crítica. |
| **Cajero** | Cobra, abre/cierra caja, gestiona pedidos de mostrador. | Caja, pedidos, reportes de turno. |
| **Mesero** | Toma pedidos en mesa, atiende clientes. | Pedidos de mesa, consulta de menú. |
| **Cocina** | Prepara pedidos y actualiza estados. | KDS (pantalla de cocina). |
| **Repartidor** | Entrega pedidos a domicilio y cobra contra entrega. | Módulo de repartidor y liquidación. |
| **Cliente** | Escanea QR, arma pedido, paga, recibe. | Menú PWA (sin login). |

---

## 5. REQUISITOS FUNCIONALES (RF)

### Módulo 1: Menú Digital y QR (Autopedido)

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-01** | El sistema debe generar un **código QR único por mesa** (y uno general para entrada/mostrador) que abra el menú digital. | Crítica | Cada QR contiene un identificador de mesa; al escanear se abre la PWA con el menú y la mesa precargada. |
| **RF-02** | El menú debe ser una **PWA ligera** con caché, funcional en 3G y consultable sin conexión tras la primera carga. | Crítica | Carga en < 3 s en 3G; el menú previamente visto se muestra sin conexión. |
| **RF-03** | El menú debe organizarse por **categorías, productos, precios, modificadores (extras/sin ingredientes) y notas**. | Crítica | El cliente puede seleccionar "café con leche, sin azúcar, extra shot" y ver el precio actualizado. |
| **RF-04** | El cliente debe poder **armar un pedido desde el menú** y enviarlo al sistema sin crear cuenta ni descargar app. | Crítica | El pedido llega a la bandeja unificada con mesa, ítems, notas y hora. |
| **RF-05** | El menú debe soportar **disponibilidad por horario** (ej. desayuno hasta las 11:00) y **productos agotados** en tiempo real. | Alta | Un producto marcado como agotado no aparece o aparece deshabilitado en la PWA. |
| **RF-06** | El menú debe mostrar **múltiples monedas** (CUP, MLC, USD) si el negocio lo configura. | Media | El cliente ve precios en la moneda configurada. |
| **RF-07** | El sistema debe permitir **imprimir/descargar los QR** para mesas desde el panel de administración. | Alta | Se genera un PDF con los QR listos para imprimir. |

### Módulo 2: Gestión de Pedidos (Bandeja Unificada)

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-08** | El sistema debe tener una **bandeja de pedidos unificada** que reciba pedidos de QR/mesa, mostrador, para llevar, domicilio, WhatsApp e Instagram/Facebook (estos dos últimos ingresados manualmente). | Crítica | Todos los pedidos aparecen en una sola pantalla con etiqueta de canal de origen. |
| **RF-09** | Cada pedido debe tener un **flujo de estados**: Nuevo → Confirmado → En preparación → Listo → Entregado → Pagado (o Cancelado). | Crítica | El estado se actualiza en tiempo real y se refleja en KDS, caja y repartidor. |
| **RF-10** | El sistema debe permitir **crear pedidos manualmente** para WhatsApp/Instagram copiando datos del chat (nombre, teléfono, dirección, ítems). | Crítica | El cajero puede registrar un pedido de WhatsApp en < 60 segundos. |
| **RF-11** | El sistema debe calcular el **tiempo estimado de preparación** y mostrarlo al cliente en la PWA tras confirmar el pedido. | Media | El cliente ve "Tu pedido estará listo en ~12 min". |
| **RF-12** | El sistema debe permitir **dividir cuentas** (por ítem o por persona) en pedidos de mesa. | Alta | Se puede cobrar por separado a 2+ clientes de la misma mesa. |
| **RF-13** | El sistema debe permitir **agregar ítems a un pedido ya enviado** (si aún no está en preparación avanzada). | Media | El cajero/mesero puede añadir un postre a un pedido en estado "Confirmado". |
| **RF-14** | El sistema debe **notificar al cliente** (en la PWA) cuando su pedido esté listo para recoger o en camino. | Media | El cliente ve actualización de estado si mantiene la PWA abierta. |
| **RF-15** | El sistema debe generar **enlaces `wa.me`** y códigos QR que abran un chat de WhatsApp del negocio con mensaje precargado. | Crítica | El QR en mesa o mostrador abre WhatsApp con "Hola, quiero hacer un pedido". |

### Módulo 3: Caja y Cobro en Efectivo

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-16** | El sistema debe permitir **abrir caja** con fondo inicial y desglose de denominaciones (billetes/monedas). | Crítica | El cajero registra el fondo y el sistema lo usa para el arqueo final. |
| **RF-17** | El sistema debe permitir **cobrar en efectivo** con cálculo automático de cambio y emisión de ticket interno (impreso o digital). | Crítica | Se ingresa monto recibido, el sistema muestra cambio y marca pedido como pagado. |
| **RF-18** | El sistema debe registrar **propinas, descuentos, devoluciones, gastos menores y retiros de caja**, con motivo y autorización según rol. | Alta | Cada movimiento queda en log con usuario, hora y motivo. |
| **RF-19** | El sistema debe permitir **cierre de turno con arqueo**: efectivo esperado vs. contado, descuadre y observaciones. | Crítica | El reporte de cierre muestra diferencia (sobrante/faltante) y requiere confirmación. |
| **RF-20** | El sistema debe ofrecer **arqueo ciego opcional** (el cajero cuenta sin ver el esperado). | Media | Se activa por configuración; el cajero ingresa conteo y luego el sistema revela diferencia. |
| **RF-21** | El sistema debe **impedir borrar pedidos o cobros**; cancelaciones solo con motivo y permiso de gerente/dueño. | Crítica | Todo pedido cancelado queda en historial con auditoría. |

### Módulo 4: Pagos Electrónicos Opcionales (Transfermóvil / EnZona)

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-22** | El sistema debe permitir marcar un pedido como pagado por **"Efectivo"**, **"Transfermóvil"** o **"EnZona"**. | Crítica | El método de pago queda registrado en el pedido y en el reporte de caja. |
| **RF-23** | Para **Transfermóvil**, el sistema debe mostrar el **monto a pagar y el concepto** para que el cajero genere el QR dinámico en el portal "Bulevar Mi Transfer" (o mostrar un QR estático del negocio). | Alta | El cajero ve el monto exacto y lo usa para crear el cobro; luego marca "pagado" tras verificar. |
| **RF-24** | Para **EnZona**, el sistema debe poder (opcionalmente) **integrarse vía API** para generar un cargo y consultar su estado automáticamente. | Media | Si está integrado, el pedido se marca "pagado" al confirmar la API; si no, se marca manual. |
| **RF-25** | El cierre de caja debe mostrar un **desglose separado**: Total Efectivo Esperado, Total Electrónico Reportado, Total Electrónico Confirmado en Banco. | Crítica | El dueño puede detectar si lo reportado como electrónico coincide con el banco. |
| **RF-26** | El sistema debe generar un **reporte de conciliación de pagos electrónicos** por turno/día. | Alta | Lista de pedidos pagados por QR con monto, hora y estado de conciliación. |

### Módulo 5: Cocina (KDS — Kitchen Display System)

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-27** | El sistema debe tener una **pantalla de cocina (KDS)** que reciba comandas en tiempo real por **red local (LAN)**. | Crítica | Si se cae internet, la cocina sigue recibiendo pedidos de meseros y QR en LAN. |
| **RF-28** | El KDS debe **priorizar pedidos** por antigüedad y tipo (domicilio antes que mesa, si se configura). | Alta | Los pedidos más antiguos aparecen primero con temporizador. |
| **RF-29** | El cocinero debe poder **marcar ítems como "en preparación" y "listo"** desde la pantalla (táctil o teclado). | Crítica | El estado se refleja en la bandeja del cajero y en la PWA del cliente. |
| **RF-30** | El KDS debe **alertar visual y sonoramente** cuando un pedido excede el tiempo estimado de preparación. | Media | El pedido cambia de color (amarillo → rojo) y emite sonido. |
| **RF-31** | El KDS debe permitir **imprimir comandas** en impresora térmica (respaldo del KDS digital). | Alta | Se imprime ticket con ítems, notas y mesa/pedido. |

### Módulo 6: Repartidores y Domicilio

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-32** | El sistema debe permitir **asignar pedidos a repartidores** y registrar la hora de salida y llegada. | Crítica | El repartidor ve sus pedidos asignados en su celular/tablet. |
| **RF-33** | El repartidor debe poder **registrar el cobro en efectivo contra entrega** desde su dispositivo. | Crítica | El pedido se marca "entregado" y "pendiente de liquidar" hasta que entregue el efectivo a caja. |
| **RF-34** | El sistema debe permitir **liquidar el efectivo del repartidor** al final del turno, con arqueo por repartidor. | Crítica | Se registra monto entregado vs. monto cobrado; se detectan faltantes. |
| **RF-35** | El sistema debe mostrar al repartidor la **dirección y teléfono del cliente** (obtenidos del pedido manual o PWA). | Alta | El repartidor ve datos de contacto y puede llamar o abrir mapa (si hay internet). |

### Módulo 7: Clientes y Fidelización

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-36** | El sistema debe registrar **datos básicos del cliente** (nombre, teléfono, dirección) desde pedidos manuales o PWA. | Media | El cliente queda en base de datos para futuros pedidos. |
| **RF-37** | El sistema debe permitir **historial de pedidos por cliente** (qué pidió, cuándo, cuánto gastó). | Media | Al buscar un teléfono, se ve el historial. |
| **RF-38** | El sistema debe permitir crear un **programa de lealtad básico** (puntos por compra o cupones). | Baja (Fase 2) | El cliente acumula puntos y puede canjearlos. |

### Módulo 8: Inventario (Fase 2)

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-39** | El sistema debe permitir configurar **recetas** (insumos por producto) y **descontar inventario automáticamente** al vender. | Baja (Fase 2) | Vender un latte descuenta leche y café en grano. |
| **RF-40** | El sistema debe **alertar stock bajo** y generar lista de compras sugerida. | Baja (Fase 2) | Alerta cuando un insumo baja del mínimo configurado. |

### Módulo 9: Reportes y Analítica

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-41** | El sistema debe mostrar un **dashboard con ventas por canal** (QR/mesa, mostrador, WhatsApp, Instagram, domicilio). | Alta | Gráfico de ventas por canal en el período seleccionado. |
| **RF-42** | El sistema debe reportar **producto más vendido, ticket promedio y horas pico**. | Alta | Tabla y gráfico de los top 10 productos y mapa de calor por hora. |
| **RF-43** | El sistema debe generar **reporte de ventas por cajero y por repartidor**. | Alta | Se puede auditar el desempeño y descuadres por persona. |
| **RF-44** | El sistema debe generar **reporte de cierre de caja diario** con desglose efectivo/electrónico y descuadres. | Crítica | Reporte exportable (PDF/CSV) con todos los movimientos del turno. |
| **RF-45** | El sistema debe permitir **exportar reportes** a CSV/PDF para contabilidad. | Media | Botón de exportación en cada reporte. |

### Módulo 10: Usuarios, Roles y Auditoría

| ID | Requisito | Prioridad | Criterio de aceptación |
| :--- | :--- | :--- | :--- |
| **RF-46** | El sistema debe gestionar **usuarios con roles**: Dueño, Gerente, Cajero, Mesero, Cocina, Repartidor. | Crítica | Cada rol solo accede a los módulos permitidos. |
| **RF-47** | El sistema debe registrar **log de auditoría** de acciones críticas (cancelaciones, descuentos, retiros, apertura/cierre de caja). | Crítica | Log inmutable con usuario, fecha, hora, acción y motivo. |
| **RF-48** | El sistema debe permitir **autorización por PIN** para acciones sensibles (cancelar pedido, aplicar descuento, retirar efectivo). | Alta | El gerente/dueño ingresa PIN para autorizar. |
| **RF-49** | El sistema debe permitir **configurar datos del negocio** (nombre, logo, dirección, teléfono, monedas, impuestos). | Crítica | El menú PWA y los tickets reflejan la configuración. |

---

## 6. REQUISITOS NO FUNCIONALES (RNF)

| ID | Categoría | Requisito | Métrica / Criterio |
| :--- | :--- | :--- | :--- |
| **RNF-01** | **Rendimiento (PWA)** | El menú digital debe cargar en **menos de 3 segundos en 3G** y en < 1 s en LAN. | Medición con Lighthouse/WebPageTest. |
| **RNF-02** | **Rendimiento (Sistema)** | El registro de un pedido en la bandeja debe responder en **< 400 ms** en LAN. | Prueba de carga con 50 pedidos simultáneos. |
| **RNF-03** | **Resiliencia (Local-First)** | El sistema debe **operar completamente en LAN** (mesas, KDS, caja) si se pierde la conexión a internet. | Prueba desconectando el router WAN; la operación local continúa. |
| **RNF-04** | **Sincronización** | La sincronización con la nube debe ser **asíncrona y tolerante a fallos**, con reintentos automáticos. | Cola de sincronización con reintentos exponenciales; no se pierden pedidos. |
| **RNF-05** | **Eficiencia de datos** | El sistema debe usar **WebSockets** para actualizaciones en tiempo real y minimizar el consumo de datos móviles. | Consumo < 5 MB/día por dispositivo en operación normal. |
| **RNF-06** | **Energía / Recuperación** | El servidor local debe operar con **UPS** y reiniciarse automáticamente tras un corte eléctrico en **< 5 minutos**. | Prueba de corte y restauración; RTO < 5 min. |
| **RNF-07** | **Disponibilidad** | El sistema debe tener una disponibilidad del **99.5%** en horario de operación (la parte cloud para pedidos remotos). | Monitoreo de uptime; la operación local no depende de esto. |
| **RNF-08** | **Seguridad (Transporte)** | Todas las comunicaciones externas deben usar **TLS 1.2+**. | Escaneo de configuración SSL/TLS. |
| **RNF-09** | **Seguridad (Datos)** | Los datos locales (clientes, ventas) deben estar **cifrados en reposo** (AES-256) y protegidos por autenticación. | Prueba de acceso no autorizado al servidor local. |
| **RNF-10** | **Seguridad (Acceso)** | Autenticación por **usuario/contraseña + PIN** para roles; sesiones con expiración. | Prueba de fuerza bruta y expiración de sesión. |
| **RNF-11** | **Usabilidad** | La interfaz para cajeros, meseros y cocina debe ser **aprendible en < 30 minutos** sin capacitación formal. | Prueba de usabilidad con 3 usuarios nuevos. |
| **RNF-12** | **Usabilidad (PWA)** | El cliente debe poder **armar y enviar un pedido en < 2 minutos** desde que escanea el QR. | Prueba con 5 clientes reales; medición de tiempo. |
| **RNF-13** | **Compatibilidad** | El sistema debe funcionar en **navegadores modernos** (Chrome, Safari, Edge, Firefox) y ser **responsive** en tablets y celulares. | Pruebas en dispositivos de gama baja/media. |
| **RNF-14** | **Compatibilidad (Hardware)** | Debe funcionar con **impresora térmica (58/80 mm), cajón monedero, lector de códigos de barras** y tablets Android/iPad. | Pruebas de integración con hardware estándar. |
| **RNF-15** | **Mantenibilidad** | El código debe estar **documentado**, con **CI/CD** y despliegues sin tiempo de inactividad (blue-green). | Pipeline configurado; despliegue sin caída. |
| **RNF-16** | **Respaldo** | Debe haber **respaldos automáticos diarios** de la base de datos local y en la nube, con retención de 30 días. | Prueba de restauración desde respaldo. |
| **RNF-17** | **Escalabilidad** | La arquitectura debe permitir **añadir sucursales** o **más mesas/usuarios** sin rediseño. | Prueba de agregar una segunda instancia local. |
| **RNF-18** | **Legalidad** | El sistema debe facilitar el cumplimiento de la **Resolución 93/2023** (medios de pago electrónicos) y permitir registrar la inscripción en el **Registro Central Comercial**. | Checklist de cumplimiento; el sistema ofrece pago QR como opción. |
| **RNF-19** | **Auditoría** | Los logs de auditoría deben ser **inmutables** y conservarse por al menos **1 año**. | Prueba de intento de modificación de log (debe fallar). |
| **RNF-20** | **Costo** | El sistema debe funcionar con **hardware de bajo costo** (mini PC/Raspberry Pi, tablets económicas, impresora térmica). | Presupuesto de hardware < $500 USD por punto de venta. |

---

## 7. PRIORIZACIÓN Y HOJA DE RUTA

### 🟢 Fase 1 — MVP (1-2 meses de desarrollo)

- **RF-01 a RF-05** — Menú QR/PWA básico
- **RF-08 a RF-10** — Bandeja unificada + pedidos manuales
- **RF-15** — Enlaces `wa.me`
- **RF-16, RF-17, RF-19** — Caja en efectivo: apertura, cobro, cierre
- **RF-21** — Auditoría de cancelaciones
- **RF-27, RF-29** — KDS local básico
- **RF-32, RF-33** — Repartidor + cobro contra entrega
- **RF-41, RF-44** — Reportes básicos de ventas y cierre
- **RF-46, RF-49** — Roles y configuración
- **RNF-01, RNF-03, RNF-06, RNF-11, RNF-12** — Rendimiento y resiliencia clave

### 🟡 Fase 2 — Consolidación (2-4 meses después)

- **RF-22 a RF-26** — Pagos electrónicos Transfermóvil/EnZona + conciliación
- **RF-12, RF-13** — División de cuentas, agregar ítems
- **RF-30, RF-31** — Alertas KDS, impresión de comandas
- **RF-34, RF-35** — Liquidación de repartidores, datos al repartidor
- **RF-36, RF-37** — Clientes e historial
- **RF-41 a RF-45** — Reportes avanzados

### 🔵 Fase 3 — Crecimiento (4-6 meses después)

- **RF-06** — Múltiples monedas
- **RF-38** — Lealtad
- **RF-39, RF-40** — Inventario con recetas
- **RF-48** — Autorización por PIN
- **RNF-17** — Escalabilidad multi-sucursal

---

## 8. FLUJOS DE NEGOCIO DETALLADOS

### 8.1. Flujo A — Autopedido por QR en mesa

1. El cliente se sienta en la mesa y escanea el QR.
2. Se abre la PWA con el menú y la mesa precargada.
3. El cliente selecciona productos, modificadores y añade notas.
4. Confirma el pedido; el sistema le muestra tiempo estimado.
5. El pedido entra a la bandeja unificada y al KDS.
6. Cocina prepara y marca "listo".
7. El cliente se acerca a caja y paga en efectivo (o escanea QR de pago).
8. El cajero marca el pedido como "pagado" y se cierra el ciclo.

### 8.2. Flujo B — Pedido en mostrador

1. El cliente pide verbalmente en mostrador.
2. El cajero registra el pedido en el sistema.
3. Cocina recibe la comanda.
4. El cliente paga en efectivo o por QR.
5. El cajero entrega ticket y marca "pagado".

### 8.3. Flujo C — Pedido por WhatsApp/Instagram (manual)

1. El cliente escribe al WhatsApp del negocio (vía enlace `wa.me` o QR).
2. El personal copia los datos del chat al sistema (nombre, teléfono, dirección, ítems).
3. El sistema confirma el pedido y calcula tiempo estimado.
4. El personal responde al cliente por WhatsApp con la confirmación.
5. Cocina prepara.
6. Si es domicilio, se asigna repartidor y este cobra contra entrega.
7. El repartidor liquida a caja al volver.

### 8.4. Flujo D — Cierre de caja y conciliación

1. El cajero cierra el turno.
2. El sistema muestra: efectivo esperado, total electrónico reportado, total electrónico confirmado en banco.
3. El cajero cuenta el efectivo físico y lo ingresa (arqueo ciego opcional).
4. El sistema calcula descuadre (sobrante/faltante).
5. El gerente/dueño confirma el cierre y firma digitalmente.
6. Se generan reportes de cierre (PDF/CSV).

---

## 9. MÉTRICAS DE ÉXITO

| Métrica | Objetivo | Cómo se mide |
| :--- | :--- | :--- |
| **Adopción del QR en mesa** | ≥ 60% de pedidos en mesa son autopedido por QR al mes 3. | Reportes de ventas por canal. |
| **Tiempo de toma de pedido** | Reducción del 30% vs. toma manual tradicional. | Comparación antes/después. |
| **Errores en pedidos** | < 2% de pedidos con error al mes 3. | Auditoría de cancelaciones/reclamos. |
| **Descuadre de caja** | < 2% del total de ventas diarias. | Reporte de cierre de caja. |
| **Conciliación de pagos electrónicos** | 100% de pagos QR conciliados al cierre del día. | Reporte de conciliación. |
| **Satisfacción del personal** | ≥ 4/5 en encuesta de usabilidad al mes 2. | Encuesta interna. |
| **Satisfacción del cliente** | ≥ 4/5 en encuesta post-pedido (opcional en PWA). | Encuesta en PWA. |

---

## 10. RIESGOS Y MITIGACIONES

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| **Cortes eléctricos prolongados** | Operación detenida. | UPS para servidor local + reinicio automático < 5 min. |
| **Caída de internet** | Pedidos remotos no llegan. | Operación local-first; los pedidos de mesa/mostrador no dependen de internet. |
| **Bloqueo de API de Meta** | Sin chatbot automático. | Estrategia manual con `wa.me` y gestión desde app WhatsApp Business. |
| **Fraude en pagos electrónicos** | Pérdidas económicas. | Conciliación obligatoria al cierre; reporte de pagos QR vs. banco. |
| **Baja adopción del personal** | Sistema subutilizado. | Capacitación < 30 min; interfaz simple; piloto con 2 usuarios clave. |
| **Descuadres de caja** | Pérdidas o desconfianza. | Arqueo ciego opcional; logs inmutables; autorización por PIN. |
| **Costo de hardware elevado** | Inviabilidad económica. | Usar Raspberry Pi/mini PC + tablets económicas; presupuesto < $500 USD. |

---

## 11. GLOSARIO

- **PWA (Progressive Web App):** Aplicación web que se comporta como app nativa, con caché y funcionamiento offline.
- **KDS (Kitchen Display System):** Pantalla de cocina que muestra las comandas en tiempo real.
- **LAN (Local Area Network):** Red local del negocio (Wi-Fi o cable).
- **UPS (Uninterruptible Power Supply):** Sistema de alimentación ininterrumpida (batería).
- **`wa.me`:** Enlace directo que abre un chat de WhatsApp con un número específico.
- **Transfermóvil / EnZona:** Pasarelas de pago electrónico cubanas.
- **Bulevar Mi Transfer:** Portal de ETECSA para comercios que usan Transfermóvil.
- **Resolución 93/2023:** Normativa del MINCIN que exige medios de pago electrónicos a establecimientos gastronómicos.
- **Local-first:** Arquitectura donde el sistema opera principalmente en la red local y sincroniza con la nube de forma asíncrona.

---

## 12. APROBACIONES

| Rol | Nombre | Firma | Fecha |
| :--- | :--- | :--- | :--- |
| Product Owner (Dueño) | _________________ | _________________ | __________ |
| Gerente | _________________ | _________________ | __________ |
| Desarrollador Líder | _________________ | _________________ | __________ |

---

*Fin del documento PRD — CaféQR Cuba v1.0*