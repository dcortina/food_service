---

## 📄 2. `srs.md`

```markdown
# SRS — CaféQR Cuba
## Software Requirements Specification
### Basado en IEEE 830 / ISO/IEC/IEEE 29148 (adaptado)

| Campo | Valor |
| :--- | :--- |
| **Producto** | CaféQR Cuba |
| **Versión** | 1.0 |
| **Estado** | Aprobado para desarrollo |
| **Documento relacionado** | `PRD.md` v1.0, `modelo-datos.md` v1.0 |
| **Fecha** | 2026-10-29 |
| **Audiencia** | Equipo de desarrollo, QA, arquitecto, product owner |

---

## 1. INTRODUCCIÓN

### 1.1. Propósito

Este documento especifica los requisitos de software del sistema **CaféQR Cuba**, un sistema de gestión para cafeterías cubanas con pedidos por QR, control de caja en efectivo y soporte opcional de pagos electrónicos (Transfermóvil/EnZona). Sirve como base contractual y guía de implementación.

### 1.2. Alcance

El sistema cubre:

- Menú digital PWA con autopedido por QR.
- Bandeja unificada de pedidos (mostrador, mesa, WhatsApp/redes manual, domicilio).
- Caja en efectivo con arqueo y conciliación.
- KDS local (pantalla de cocina) resiliente a caídas de internet.
- Módulo de repartidores con cobro contra entrega.
- Pagos electrónicos opcionales vía Transfermóvil (portal Bulevar) y EnZona (API).
- Reportes, auditoría y roles.

**Fuera de alcance (v1.0):**

- Facturación fiscal cubana (no aplica CFDI mexicano).
- Chatbot automático de WhatsApp (API bloqueada en Cuba).
- Programa de lealtad avanzado (Fase 3).
- Inventario con recetas (Fase 3).

### 1.3. Definiciones y acrónimos

- **PWA:** Progressive Web App.
- **KDS:** Kitchen Display System.
- **LAN:** Local Area Network.
- **UPS:** Uninterruptible Power Supply.
- **RTO:** Recovery Time Objective.
- **RPO:** Recovery Point Objective.
- **MVP:** Minimum Viable Product.
- **PAC:** Proveedor Autorizado de Certificación (no aplica en Cuba; se conserva por herencia del PRD).

### 1.4. Referencias

- `PRD.md` v1.0 — Product Requirements Document.
- `modelo-datos.md` v1.0 — Esquema de base de datos.
- `presupuesto-hardware.md` v1.0 — Lista de hardware.
- Resolución 93/2023 del MINCIN (Cuba).
- IEEE 830-1998 / ISO/IEC/IEEE 29148:2018.

---

## 2. DESCRIPCIÓN GENERAL

### 2.1. Perspectiva del producto

CaféQR Cuba es un sistema **local-first** con sincronización asíncrona a la nube. El servidor local (mini PC/Raspberry Pi) opera la cafetería en LAN; la nube habilita pedidos remotos, respaldos y reportes consolidados.

### 2.2. Funciones principales

1. Generación y lectura de QR por mesa.
2. Menú PWA con autopedido.
3. Bandeja unificada de pedidos multicanal.
4. KDS local con priorización y alertas.
5. Caja en efectivo con apertura, cobro, movimientos y cierre.
6. Registro y conciliación de pagos electrónicos opcionales.
7. Módulo de repartidores con liquidación de efectivo.
8. Reportes operativos y de auditoría.
9. Gestión de usuarios, roles y permisos.

### 2.3. Clases de usuarios

| Clase      | Descripción                     | Nivel técnico                |
| :--------- | :------------------------------ | :--------------------------- |
| Dueño      | Supervisa y configura.          | Medio.                       |
| Gerente    | Opera turnos y autoriza.        | Medio.                       |
| Cajero     | Cobra y cierra caja.            | Bajo.                        |
| Mesero     | Toma pedidos en mesa.           | Bajo.                        |
| Cocina     | Prepara y actualiza estados.    | Bajo.                        |
| Repartidor | Entrega y cobra contra entrega. | Bajo.                        |
| Cliente    | Escanea QR y pide.              | Variable (sin capacitación). |

### 2.4. Entorno operativo

- **Servidor local:** Linux (Ubuntu Server 22.04 LTS) en mini PC o Raspberry Pi 4/5.
- **Clientes:** navegadores modernos (Chrome 100+, Safari 15+, Edge 100+, Firefox 100+) en tablets/celulares.
- **Hardware:** impresora térmica 58/80 mm, cajón monedero, router Wi-Fi, UPS.
- **Conectividad:** LAN obligatoria; internet intermitente tolerado.
- **Almacenamiento:** SSD ≥ 128 GB en servidor local.

### 2.5. Restricciones de diseño

- **Sin dependencia de APIs de Meta** (WhatsApp/Instagram/Facebook): la integración social es manual.
- **Sin pasarelas de pago internacionales:** solo Transfermóvil (portal Bulevar) y EnZona (API opcional).
- **Operación offline obligatoria** para mesa, cocina y caja.
- **Hardware de bajo costo** (< $500 USD por punto de venta).
- **Interfaz en español**; soporte multimoneda (CUP, MLC, USD).

### 2.6. Suposiciones y dependencias

- El negocio cuenta con al menos un router Wi-Fi y un UPS.
- El personal tiene alfabetización digital básica.
- Existe al menos un teléfono con WhatsApp Business para gestión manual de pedidos sociales.
- La nube (VPS) tiene disponibilidad ≥ 99.5% y se contrata con proveedor externo.

---

## 3. REQUISITOS ESPECÍFICOS

> Los requisitos funcionales (RF) y no funcionales (RNF) se heredan del `PRD.md`. Aquí se detallan **interfaces, comportamientos y criterios de verificación**.

### 3.1. Interfaces externas

#### 3.1.1. Interfaces de usuario

- **UI-01 — PWA de menú (cliente):** responsive, carga < 3 s en 3G, accesible por QR. Sin login.
- **UI-02 — Panel de administración (dueño/gerente):** dashboard, configuración, reportes.
- **UI-03 — POS de cajero:** cobro, apertura/cierre de caja, bandeja de pedidos.
- **UI-04 — App de mesero:** tablets/celulares; toma de pedidos, consulta de menú.
- **UI-05 — KDS de cocina:** pantalla táctil con comandas, temporizadores, alertas.
- **UI-06 — App de repartidor:** pedidos asignados, cobro contra entrega, liquidación.

#### 3.1.2. Interfaces de hardware

- **HW-01 — Impresora térmica:** ESC/POS, 58 mm u 80 mm, conexión USB o Ethernet.
- **HW-02 — Cajón monedero:** apertura por comando ESC/POS desde la impresora.
- **HW-03 — Lector de códigos de barras (opcional):** USB HID.
- **HW-04 — UPS:** conexión USB para monitoreo (opcional, recomendado).

#### 3.1.3. Interfaces de software

- **SW-01 — Transfermóvil (portal Bulevar Mi Transfer):** integración semi-manual; el sistema muestra monto/concepto y el cajero verifica en el portal.
- **SW-02 — EnZona API (opcional):** integración REST para crear cargo y consultar estado. Requiere registro como comercio y uso del sandbox de Xetid.
- **SW-03 — WhatsApp Business App:** gestión manual; el sistema genera enlaces `wa.me` y QR.
- **SW-04 — Nube (VPS):** API REST para sincronización, respaldos y reportes consolidados.

#### 3.1.4. Interfaces de comunicación

- **COM-01 — LAN:** HTTPS/WSS dentro de la red local.
- **COM-02 — Internet:** TLS 1.2+ hacia la nube, EnZona API y portal Bulevar.
- **COM-03 — WebSockets:** actualizaciones en tiempo real entre POS, KDS y PWA.
- **COM-04 — Cola de sincronización:** reintentos exponenciales con backoff.

---

### 3.2. Requisitos funcionales (referencia al PRD)

Se adoptan íntegramente los **RF-01 a RF-49** del `PRD.md` v1.0. A continuación, se añaden **criterios de verificación** para los módulos críticos.

#### 3.2.1. Verificación — Módulo Menú QR (RF-01 a RF-07)

| RF    | Caso de prueba                                        | Resultado esperado                                   |
| :---- | :---------------------------------------------------- | :--------------------------------------------------- |
| RF-01 | Escanear QR de mesa 5.                                | Se abre PWA con mesa 5 precargada.                   |
| RF-02 | Abrir PWA en 3G; medir carga con Lighthouse.          | LCP < 3 s; menú visible tras primera carga offline.  |
| RF-03 | Seleccionar "café con leche, sin azúcar, extra shot". | Precio se actualiza; nota y modificadores se envían. |
| RF-04 | Enviar pedido sin login.                              | Pedido aparece en bandeja con mesa, ítems y hora.    |
| RF-05 | Marcar producto como agotado desde admin.             | PWA deja de mostrarlo o lo deshabilita en < 10 s.    |
| RF-06 | Configurar CUP+USD.                                   | Cliente ve ambos precios si está habilitado.         |
| RF-07 | Generar PDF de QR.                                    | PDF descargable con QR por mesa.                     |

#### 3.2.2. Verificación — Módulo Pedidos (RF-08 a RF-15)

| RF    | Caso de prueba                         | Resultado esperado                                    |
| :---- | :------------------------------------- | :---------------------------------------------------- |
| RF-08 | Crear pedidos por 5 canales distintos. | Todos aparecen en bandeja con etiqueta de canal.      |
| RF-09 | Avanzar pedido por todos los estados.  | Cada transición se refleja en KDS, caja y repartidor. |
| RF-10 | Registrar pedido de WhatsApp.          | Completado en < 60 s.                                 |
| RF-11 | Confirmar pedido en PWA.               | Cliente ve ETA.                                       |
| RF-12 | Dividir cuenta de mesa en 2.           | Se generan 2 pagos independientes.                    |
| RF-13 | Añadir ítem a pedido "confirmado".     | Ítem se agrega y KDS lo recibe.                       |
| RF-14 | Mantener PWA abierta tras confirmar.   | Estado cambia a "listo" sin recargar.                 |
| RF-15 | Escanear QR de WhatsApp.               | Abre WhatsApp con mensaje precargado.                 |

#### 3.2.3. Verificación — Caja en efectivo (RF-16 a RF-21)

| RF    | Caso de prueba                                | Resultado esperado                                   |
| :---- | :-------------------------------------------- | :--------------------------------------------------- |
| RF-16 | Abrir caja con fondo 500 CUP en billetes.     | Desglose guardado; fondo visible en cierre.          |
| RF-17 | Cobrar 250 CUP con 500 CUP recibidos.         | Cambio = 250; ticket generado; pedido "pagado".      |
| RF-18 | Registrar retiro con autorización de gerente. | Movimiento queda en log con PIN del gerente.         |
| RF-19 | Cerrar caja con descuadre.                    | Reporte muestra diferencia; requiere confirmación.   |
| RF-20 | Activar arqueo ciego y cerrar.                | Cajero ingresa conteo antes de ver esperado.         |
| RF-21 | Intentar borrar pedido.                       | Sistema lo impide; solo permite cancelar con motivo. |

#### 3.2.4. Verificación — Pagos electrónicos (RF-22 a RF-26)

| RF    | Caso de prueba                             | Resultado esperado                                                         |
| :---- | :----------------------------------------- | :------------------------------------------------------------------------- |
| RF-22 | Marcar pedido pagado por EnZona.           | Método queda registrado en pedido y cierre.                                |
| RF-23 | Generar monto para Bulevar.                | Cajero ve monto exacto y concepto.                                         |
| RF-24 | (Si integrado) Crear cargo EnZona vía API. | Sistema consulta estado y marca "pagado" automáticamente.                  |
| RF-25 | Cierre con pagos electrónicos.             | Se muestran 3 totales separados: esperado, reportado, confirmado en banco. |
| RF-26 | Generar reporte de conciliación.           | Lista de pagos QR con estado conciliado/no conciliado.                     |

#### 3.2.5. Verificación — KDS (RF-27 a RF-31)

| RF    | Caso de prueba                           | Resultado esperado                           |
| :---- | :--------------------------------------- | :------------------------------------------- |
| RF-27 | Desconectar WAN; crear pedido en mesa.   | KDS sigue recibiendo pedidos en LAN.         |
| RF-28 | Crear 3 pedidos con distinta antigüedad. | El más antiguo aparece primero.              |
| RF-29 | Marcar ítem "listo" en KDS.              | Bandeja del cajero y PWA reflejan el cambio. |
| RF-30 | Dejar pedido exceder ETA.                | Cambia a rojo y emite sonido.                |
| RF-31 | Imprimir comanda.                        | Ticket térmico con ítems, notas y mesa.      |

#### 3.2.6. Verificación — Repartidores (RF-32 a RF-35)

| RF    | Caso de prueba                     | Resultado esperado                                    |
| :---- | :--------------------------------- | :---------------------------------------------------- |
| RF-32 | Asignar pedido a repartidor.       | Repartidor lo ve en su dispositivo.                   |
| RF-33 | Registrar cobro contra entrega.    | Pedido "entregado"; efectivo "pendiente de liquidar". |
| RF-34 | Liquidar efectivo del repartidor.  | Arqueo por repartidor; faltante detectado si aplica.  |
| RF-35 | Abrir pedido en app de repartidor. | Ve dirección y teléfono del cliente.                  |

#### 3.2.7. Verificación — Reportes (RF-41 a RF-45)

| RF    | Caso de prueba                  | Resultado esperado                              |
| :---- | :------------------------------ | :---------------------------------------------- |
| RF-41 | Dashboard ventas por canal.     | Gráfico correcto en período seleccionado.       |
| RF-42 | Top 10 productos y horas pico.  | Tabla y mapa de calor generados.                |
| RF-43 | Ventas por cajero y repartidor. | Reporte por persona con totales.                |
| RF-44 | Cierre de caja diario.          | Reporte con efectivo, electrónico y descuadres. |
| RF-45 | Exportar reporte a CSV.         | Archivo descargable y válido.                   |

#### 3.2.8. Verificación — Usuarios y auditoría (RF-46 a RF-49)

| RF    | Caso de prueba            | Resultado esperado                        |
| :---- | :------------------------ | :---------------------------------------- |
| RF-46 | Login con cada rol.       | Solo accede a módulos permitidos.         |
| RF-47 | Cancelar pedido.          | Log inmutable con usuario, hora y motivo. |
| RF-48 | Retirar efectivo sin PIN. | Sistema solicita PIN de gerente.          |
| RF-49 | Configurar nombre y logo. | PWA y tickets reflejan cambios.           |

---

### 3.3. Requisitos no funcionales (verificación)

| RNF                               | Cómo se verifica                             | Herramienta / método                 |
| :-------------------------------- | :------------------------------------------- | :----------------------------------- |
| RNF-01 (PWA < 3s en 3G)           | Lighthouse con throttling 3G.                | Chrome DevTools / WebPageTest.       |
| RNF-02 (< 400 ms en LAN)          | Prueba de carga con 50 pedidos concurrentes. | k6 / Artillery.                      |
| RNF-03 (Local-first)              | Desconectar WAN; operar mesa/KDS/caja.       | Prueba manual + logs.                |
| RNF-04 (Sincronización tolerante) | Simular caída de nube; verificar reintentos. | Logs de `sincronizacion`.            |
| RNF-05 (Eficiencia datos)         | Medir consumo diario en tablet.              | Monitor de datos del dispositivo.    |
| RNF-06 (RTO < 5 min)              | Corte eléctrico simulado con UPS.            | Cronómetro + logs.                   |
| RNF-07 (99.5% uptime nube)        | Monitoreo continuo.                          | UptimeRobot / Better Stack.          |
| RNF-08 (TLS 1.2+)                 | Escaneo SSL.                                 | SSL Labs / testssl.sh.               |
| RNF-09 (Cifrado en reposo)        | Acceso no autorizado al servidor.            | Prueba de penetración básica.        |
| RNF-10 (Auth + PIN)               | Prueba de fuerza bruta y expiración.         | OWASP ZAP.                           |
| RNF-11 (Aprendizaje < 30 min)     | Prueba con 3 usuarios nuevos.                | Protocolo de usabilidad.             |
| RNF-12 (Pedido < 2 min)           | Prueba con 5 clientes reales.                | Cronómetro + observación.            |
| RNF-13 (Compatibilidad)           | Pruebas en Chrome/Safari/Edge/Firefox.       | BrowserStack / dispositivos físicos. |
| RNF-14 (Hardware)                 | Integración con impresora, cajón, scanner.   | Prueba física.                       |
| RNF-15 (CI/CD)                    | Despliegue blue-green sin caída.             | Pipeline configurado.                |
| RNF-16 (Respaldos)                | Restauración desde respaldo.                 | Prueba de restore.                   |
| RNF-17 (Escalabilidad)            | Añadir segunda instancia local.              | Prueba de despliegue.                |
| RNF-18 (Legalidad)                | Checklist Resolución 93/2023.                | Revisión con asesor legal.           |
| RNF-19 (Auditoría inmutable)      | Intentar UPDATE/DELETE en `log_auditoria`.   | Debe fallar con excepción.           |
| RNF-20 (Costo hardware)           | Suma de presupuesto.                         | `presupuesto-hardware.md`.           |

---

## 4. ARQUITECTURA DE ALTO NIVEL

### 4.1. Componentes

┌────────────────────────────────────────────────────────────┐
│ NUBE (VPS) │
│ · API REST (sincronización) │
│ · PostgreSQL réplica │
│ · Almacenamiento de respaldos │
│ · PWA pública (menú remoto) │
└────────────────────▲───────────────────────────────────────┘
│ TLS / WSS (asíncrono)
┌────────────────────┴───────────────────────────────────────┐
│ SERVIDOR LOCAL (LAN del negocio) │
│ · API REST + WebSockets │
│ · PostgreSQL local (fuente de verdad operativa) │
│ · Worker de sincronización │
│ · Servidor de PWA (menú en LAN) │
│ · Servicio de impresión (ESC/POS) │
└───┬──────────┬──────────┬──────────┬──────────┬────────────┘
│ │ │ │ │
POS Mesero KDS Repartidor PWA cliente
(cajero) (tablet) (cocina) (celular) (QR mesa)

---

### 4.2. Stack sugerido (no vinculante)

- **Backend:** Node.js (NestJS) o Python (FastAPI) + PostgreSQL.
- **Frontend admin/POS:** React + Vite + TailwindCSS.
- **PWA cliente:** React + Workbox (caché) o SvelteKit.
- **KDS:** React + WebSockets.
- **Sincronización:** Worker con BullMQ / Celery + Redis.
- **Nube:** VPS con Docker + PostgreSQL + Nginx + Let's Encrypt.
- **Impresión:** `node-thermal-printer` o `python-escpos`.

---

## 5. MATRIZ DE TRAZABILIDAD (extracto)

| RF    | Módulo     | Caso de prueba | RNF asociados  |
| :---- | :--------- | :------------- | :------------- |
| RF-01 | Menú QR    | 3.2.1          | RNF-01, RNF-12 |
| RF-08 | Pedidos    | 3.2.2          | RNF-02, RNF-05 |
| RF-16 | Caja       | 3.2.3          | RNF-02, RNF-19 |
| RF-27 | KDS        | 3.2.5          | RNF-03, RNF-06 |
| RF-33 | Repartidor | 3.2.6          | RNF-04         |
| RF-44 | Reportes   | 3.2.7          | RNF-16         |
| RF-47 | Auditoría  | 3.2.8          | RNF-19         |

---

## 6. CRITERIOS DE ACEPTACIÓN DEL PRODUCTO

El sistema se considera aceptado cuando:

1. Todos los RF de Fase 1 (MVP) pasan sus casos de verificación.
2. Los RNF críticos (RNF-01, RNF-02, RNF-03, RNF-06, RNF-11, RNF-12, RNF-19) cumplen sus métricas.
3. Se realizó un piloto de 30 días en la cafetería con al menos 100 pedidos reales.
4. El personal completó la capacitación (< 30 min por rol) y aprobó la encuesta de usabilidad ≥ 4/5.
5. El reporte de cierre de caja cuadra con el efectivo físico en al menos 95% de los turnos del piloto.

---

## 7. RIESGOS TÉCNICOS Y MITIGACIONES

| Riesgo                            | Probabilidad | Impacto | Mitigación                                          |
| :-------------------------------- | :----------- | :------ | :-------------------------------------------------- |
| API EnZona no disponible o cambia | Media        | Medio   | Diseñar integración como opcional; fallback manual. |
| Cortes eléctricos                 | Alta         | Alto    | UPS + reinicio automático + respaldo local.         |
| Internet inestable                | Alta         | Medio   | Local-first; cola de sincronización.                |
| Baja adopción del personal        | Media        | Alto    | Interfaz simple + capacitación + piloto.            |
| Descuadres de caja                | Media        | Alto    | Arqueo ciego + auditoría + PIN.                     |
| Costo de hardware                 | Media        | Medio   | Raspberry Pi + tablets económicas.                  |

---

## 8. GLOSARIO (ampliación del PRD)

- **Local-first:** arquitectura donde la operación depende de la red local; la nube es complementaria.
- **Snapshot:** copia inmutable de datos (nombre, precio) al momento de la venta.
- **Backoff exponencial:** estrategia de reintentos con espera creciente.
- **Blue-green deployment:** técnica de despliegue sin tiempo de inactividad.
- **Append-only:** tabla que solo permite `INSERT`, nunca `UPDATE`/`DELETE`.

---

## 9. APROBACIONES

| Rol                    | Nombre                     | Firma                      | Fecha            |
| :--------------------- | :------------------------- | :------------------------- | :--------------- |
| Product Owner          | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | \***\*\_\_\*\*** |
| Arquitecto de Software | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | \***\*\_\_\*\*** |
| QA Lead                | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | \***\*\_\_\*\*** |
| Desarrollador Líder    | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | \***\*\_\_\*\*** |

---

_Fin del documento — SRS CaféQR Cuba v1.0_
