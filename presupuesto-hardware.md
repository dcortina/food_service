# PRESUPUESTO DE HARDWARE — CaféQR Cuba

## Lista de equipos, costos y alternativas para el mercado cubano

| Campo                    | Valor                                                    |
| :----------------------- | :------------------------------------------------------- |
| **Producto**             | CaféQR Cuba                                              |
| **Versión**              | 1.0                                                      |
| **Escenario**            | 1 punto de venta (cafetería pequeña, 1 caja, 6–10 mesas) |
| **Moneda de referencia** | USD (equivalente en CUP/MLC según tasa vigente)          |
| **Fecha**                | 2026-10-29                                               |

> ⚠️ **Nota importante:** Los precios son estimados y varían según proveedor, disponibilidad en Cuba y tasa de cambio. Se incluyen alternativas económicas y de gama media. Se recomienda cotizar con proveedores locales (MLC, tiendas estatales, importadores privados) antes de comprar.

---

## 1. ESCENARIOS DE DESPLIEGUE

| Escenario              | Descripción                                           | Mesas | Cajeros | Repartidores |
| :--------------------- | :---------------------------------------------------- | :---- | :------ | :----------- |
| **A — Mínimo viable**  | 1 caja, 1 tablet KDS, 1 tablet mesero, Raspberry Pi.  | 6     | 1       | 1            |
| **B — Recomendado**    | 1 caja, 1 tablet KDS, 2 tablets mesero, mini PC, UPS. | 10    | 1       | 2            |
| **C — Multi-sucursal** | 2+ puntos, servidor por sucursal + nube.              | 20+   | 2+      | 4+           |

A continuación se detalla el **Escenario B (Recomendado)** por ser el más equilibrado para una cafetería en crecimiento. Al final se incluye comparativa con A y C.

---

## 2. LISTA DE HARDWARE — ESCENARIO B (RECOMENDADO)

### 2.1. Servidor local (núcleo del sistema)

| Ítem                  | Especificación recomendada                                            | Cantidad | Precio unit. (USD) | Subtotal (USD)  | Alternativa económica                     |
| :-------------------- | :-------------------------------------------------------------------- | :------- | :----------------- | :-------------- | :---------------------------------------- |
| **Mini PC**           | Intel N100 / N5105, 8 GB RAM, SSD 256 GB, 2× LAN, Ubuntu Server 22.04 | 1        | $180 – $250        | $180 – $250     | Raspberry Pi 4 (8 GB) + SSD USB: $90–$120 |
| **UPS**               | 600–1000 VA, autonomía ≥ 15 min, puerto USB                           | 1        | $80 – $120         | $80 – $120      | UPS 600 VA básico: $50–$70                |
| **Switch / Router**   | Router Wi-Fi 5 (802.11ac) doble banda + 4 puertos LAN                 | 1        | $40 – $70          | $40 – $70       | Router Wi-Fi 4 (802.11n): $25–$40         |
| **Cableado**          | Cable UTP Cat 6 (30 m), conectores, canaletas                         | 1        | $20 – $30          | $20 – $30       | —                                         |
| **Subtotal servidor** |                                                                       |          |                    | **$320 – $470** | **$165 – $230**                           |

> **Recomendación:** El mini PC es preferible a Raspberry Pi por rendimiento y fiabilidad de SSD, pero Raspberry Pi es viable para MVP con pocas mesas.

---

### 2.2. Punto de venta (caja)

| Ítem                             | Especificación recomendada                              | Cantidad | Precio unit. (USD) | Subtotal (USD)  | Alternativa económica        |
| :------------------------------- | :------------------------------------------------------ | :------- | :----------------- | :-------------- | :--------------------------- |
| **Tablet / PC caja**             | Tablet Android 10" (4 GB RAM) o PC de escritorio básico | 1        | $80 – $150         | $80 – $150      | Tablet 7" económica: $50–$70 |
| **Impresora térmica**            | 80 mm, USB + Ethernet, ESC/POS, cortador automático     | 1        | $70 – $120         | $70 – $120      | 58 mm USB: $40–$60           |
| **Cajón monedero**               | Apertura por comando ESC/POS, 4 billetes + 8 monedas    | 1        | $40 – $70          | $40 – $70       | Cajón manual: $25–$35        |
| **Lector de códigos (opcional)** | USB HID, 1D/2D                                          | 1        | $25 – $40          | $25 – $40       | —                            |
| **Subtotal caja**                |                                                         |          |                    | **$215 – $380** | **$115 – $165**              |

> **Nota:** La impresora térmica es **obligatoria** para tickets y comandas. El cajón monedero se conecta a la impresora (RJ11).

---

### 2.3. Cocina (KDS)

| Ítem                | Especificación recomendada                | Cantidad | Precio unit. (USD) | Subtotal (USD) | Alternativa económica         |
| :------------------ | :---------------------------------------- | :------- | :----------------- | :------------- | :---------------------------- |
| **Pantalla KDS**    | Tablet Android 10–12" o monitor + mini PC | 1        | $80 – $150         | $80 – $150     | Tablet 10" económica: $60–$80 |
| **Soporte / brazo** | Soporte de pared o brazo articulado       | 1        | $15 – $30          | $15 – $30      | Soporte básico: $8–$15        |
| **Subtotal cocina** |                                           |          |                    | **$95 – $180** | **$68 – $95**                 |

> **Opcional:** Impresora térmica adicional en cocina para comandas impresas (respaldo del KDS). Sumar $40–$70.

---

### 2.4. Meseros

| Ítem                 | Especificación recomendada        | Cantidad | Precio unit. (USD) | Subtotal (USD)  | Alternativa económica                        |
| :------------------- | :-------------------------------- | :------- | :----------------- | :-------------- | :------------------------------------------- |
| **Tablet mesero**    | Tablet Android 8–10" (3–4 GB RAM) | 2        | $70 – $120         | $140 – $240     | Celular Android del propio mesero (BYOD): $0 |
| **Funda protectora** | Funda reforzada con correa        | 2        | $10 – $20          | $20 – $40       | —                                            |
| **Subtotal meseros** |                                   |          |                    | **$160 – $280** | **$0 – $40** (BYOD)                          |

> **Recomendación:** Permitir **BYOD** (Bring Your Own Device) reduce costos; el sistema es PWA y funciona en cualquier navegador moderno.

---

### 2.5. Repartidores

| Ítem                      | Especificación recomendada           | Cantidad | Precio unit. (USD) | Subtotal (USD) | Alternativa económica                    |
| :------------------------ | :----------------------------------- | :------- | :----------------- | :------------- | :--------------------------------------- |
| **Celular repartidor**    | Smartphone Android con datos móviles | 1–2      | $80 – $150         | $80 – $300     | Celular del propio repartidor (BYOD): $0 |
| **Subtotal repartidores** |                                      |          |                    | **$80 – $300** | **$0** (BYOD)                            |

---

### 2.6. Cliente (QR en mesa)

| Ítem                 | Especificación recomendada                    | Cantidad | Precio unit. (USD) | Subtotal (USD) | Alternativa económica                    |
| :------------------- | :-------------------------------------------- | :------- | :----------------- | :------------- | :--------------------------------------- |
| **QR impresos**      | Acrílico o vinil adhesivo, 10×10 cm, por mesa | 10       | $1 – $2            | $10 – $20      | Impresión casera + laminado: $3–$5 total |
| **Display de mesa**  | Porta-QR de acrílico                          | 10       | $2 – $4            | $20 – $40      | —                                        |
| **Subtotal cliente** |                                               |          |                    | **$30 – $60**  | **$3 – $5**                              |

> **Nota:** El QR se genera desde el panel de administración (RF-07) y se imprime localmente. No requiere hardware especial.

---

### 2.7. Conectividad y respaldo

| Ítem                       | Especificación recomendada             | Cantidad | Precio unit. (USD) | Subtotal (USD) | Alternativa económica |
| :------------------------- | :------------------------------------- | :------- | :----------------- | :------------- | :-------------------- |
| **Internet del local**     | Plan de datos fijo (ETECSA) o móvil 4G | 1        | $20 – $50/mes      | (mensual)      | —                     |
| **Disco externo respaldo** | SSD/HDD 500 GB USB 3.0                 | 1        | $40 – $70          | $40 – $70      | USB 128 GB: $15–$25   |
| **Subtotal respaldo**      |                                        |          |                    | **$40 – $70**  | **$15 – $25**         |

---

### 2.8. Nube (VPS)

| Ítem              | Especificación recomendada                   | Cantidad | Precio unit. (USD/mes) | Subtotal (USD/mes) | Alternativa económica       |
| :---------------- | :------------------------------------------- | :------- | :--------------------- | :----------------- | :-------------------------- |
| **VPS**           | 2 vCPU, 4 GB RAM, 80 GB SSD, backups diarios | 1        | $12 – $25/mes          | $12 – $25/mes      | VPS 1 vCPU/2 GB: $6–$10/mes |
| **Dominio + SSL** | Dominio .com/.cu + Let's Encrypt             | 1        | $10–$15/año            | ~$1/mes            | Subdominio gratuito: $0     |
| **Subtotal nube** |                                              |          |                        | **$13 – $26/mes**  | **$6 – $11/mes**            |

> **Nota:** La nube es **opcional en MVP**. Si el presupuesto es ajustado, se puede operar solo local y añadir nube en Fase 2.

---

## 3. RESUMEN DE INVERSIÓN — ESCENARIO B

### 3.1. Inversión inicial (CAPEX)

| Categoría                                            | Rango bajo (USD) | Rango alto (USD) |
| :--------------------------------------------------- | :--------------- | :--------------- |
| Servidor local (mini PC + UPS + router + cableado)   | $320             | $470             |
| Punto de venta (tablet + impresora + cajón + lector) | $215             | $380             |
| Cocina (KDS + soporte)                               | $95              | $180             |
| Meseros (2 tablets + fundas)                         | $160             | $280             |
| Repartidores (1–2 celulares)                         | $80              | $300             |
| QR impresos + displays                               | $30              | $60              |
| Disco de respaldo                                    | $40              | $70              |
| **TOTAL CAPEX**                                      | **$940**         | **$1,740**       |

### 3.2. Costos recurrentes (OPEX mensual)

| Categoría                          | Rango bajo (USD/mes) | Rango alto (USD/mes) |
| :--------------------------------- | :------------------- | :------------------- |
| Internet del local                 | $20                  | $50                  |
| VPS + dominio                      | $13                  | $26                  |
| Mantenimiento / soporte (opcional) | $0                   | $50                  |
| **TOTAL OPEX**                     | **$33**              | **$126**             |

> **Nota:** No hay comisiones por pedido ni por transacción. Este es un diferenciador clave frente a Maspedidos y plataformas similares.

---

## 4. COMPARATIVA DE ESCENARIOS

| Escenario              | CAPEX estimado  | OPEX/mes   | Mesas | Cajeros | Ideal para                    |
| :--------------------- | :-------------- | :--------- | :---- | :------ | :---------------------------- |
| **A — Mínimo viable**  | $550 – $900     | $25 – $60  | 6     | 1       | Cafetería pequeña que inicia. |
| **B — Recomendado**    | $940 – $1,740   | $33 – $126 | 10    | 1–2     | Cafetería en crecimiento.     |
| **C — Multi-sucursal** | $1,800 – $3,500 | $60 – $200 | 20+   | 2+      | Cadena con 2+ locales.        |

### 4.1. Detalle Escenario A (Mínimo viable)

| Ítem                                   | Cantidad | Precio (USD)    |
| :------------------------------------- | :------- | :-------------- |
| Raspberry Pi 4 (8 GB) + SSD USB 128 GB | 1        | $90 – $120      |
| UPS 600 VA                             | 1        | $50 – $70       |
| Router Wi-Fi 4                         | 1        | $25 – $40       |
| Tablet caja 7"                         | 1        | $50 – $70       |
| Impresora térmica 58 mm USB            | 1        | $40 – $60       |
| Cajón monedero manual                  | 1        | $25 – $35       |
| Tablet KDS 10"                         | 1        | $60 – $80       |
| QR impresos (casero)                   | 6        | $3 – $5         |
| Disco respaldo USB 128 GB              | 1        | $15 – $25       |
| **TOTAL**                              |          | **$358 – $505** |

> **Nota:** En Escenario A, los meseros y repartidores usan sus propios celulares (BYOD). La nube es opcional; se puede operar 100% local.

### 4.2. Detalle Escenario C (Multi-sucursal)

Repite el Escenario B por cada sucursal y añade:

- VPS más potente (4 vCPU, 8 GB RAM): $25–$50/mes.
- VPN site-to-site entre sucursales: $0 (WireGuard) a $20/mes.
- Servidor de respaldo centralizado: $10–$20/mes.

---

## 5. RECOMENDACIONES DE COMPRA PARA CUBA

### 5.1. Dónde comprar

- **Tiendas en MLC:** equipos nuevos con garantía limitada; precios más altos.
- **Importadores privados:** precios variables; verificar reputación.
- **Mercado informal:** riesgo de equipos sin garantía; solo para accesorios.
- **Donaciones / reacondicionados:** opción para ONG o proyectos con apoyo externo.

### 5.2. Priorización de compra (si el presupuesto es limitado)

1. **Servidor local + UPS + router** (sin esto no hay sistema).
2. **Impresora térmica + cajón monedero** (sin esto no hay caja formal).
3. **Tablet KDS** (sin esto la cocina no recibe comandas digitales).
4. **Tablet caja** (puede sustituirse por PC existente).
5. **Tablets mesero / celulares repartidor** (BYOD como alternativa).
6. **QR impresos** (bajo costo, alto impacto).
7. **Nube / VPS** (opcional en MVP, recomendado en Fase 2).

### 5.3. Consejos prácticos

- **UPS obligatorio:** los cortes eléctricos son frecuentes; sin UPS, el servidor se corrompe.
- **Router con doble banda:** 5 GHz reduce interferencia en locales concurridos.
- **Impresora 80 mm sobre 58 mm:** tickets más legibles y profesionales; vale la pena la inversión.
- **Tablets con Android 10+:** garantizan compatibilidad con navegadores modernos y PWA.
- **Evitar tablets de gama muy baja:** 2 GB RAM puede ser insuficiente para KDS con muchas comandas.
- **Comprar 1 unidad de repuesto** de impresora térmica si el presupuesto lo permite; es el componente que más falla.

---

## 6. COSTO TOTAL DE PROPIEDAD (TCO) A 3 AÑOS

| Concepto                   | Escenario A         | Escenario B         |
| :------------------------- | :------------------ | :------------------ |
| CAPEX inicial              | $550 – $900         | $940 – $1,740       |
| OPEX 36 meses              | $900 – $2,160       | $1,188 – $4,536     |
| **TCO 3 años**             | **$1,450 – $3,060** | **$2,128 – $6,276** |
| **Costo mensual promedio** | **$40 – $85**       | **$59 – $174**      |

> **Comparación:** Maspedidos Plan Pro cuesta ~$599 MXN/mes (~$30 USD) + hardware + comisiones. Para una cafetería cubana, CaféQR Cuba tiene un **TCO comparable o menor** y **sin comisiones por pedido**, además de funcionar sin internet.

---

## 7. HOJA DE COMPRA SUGERIDA (CHECKLIST)

### Escenario B — Checklist de adquisición

- [ ] Mini PC (Intel N100, 8 GB RAM, 256 GB SSD) — 1 ud.
- [ ] UPS 600–1000 VA con USB — 1 ud.
- [ ] Router Wi-Fi 5 doble banda — 1 ud.
- [ ] Cable UTP Cat 6 (30 m) + conectores — 1 kit.
- [ ] Tablet Android 10" para caja — 1 ud.
- [ ] Impresora térmica 80 mm ESC/POS — 1 ud.
- [ ] Cajón monedero RJ11 — 1 ud.
- [ ] Lector de códigos USB (opcional) — 1 ud.
- [ ] Tablet Android 10–12" para KDS — 1 ud.
- [ ] Soporte de pared para KDS — 1 ud.
- [ ] Tablet Android 8–10" para meseros — 2 ud.
- [ ] Funda protectora con correa — 2 ud.
- [ ] Celular Android para repartidor (o BYOD) — 1–2 ud.
- [ ] QR impresos en acrílico/vinil — 10 ud.
- [ ] Porta-QR de mesa — 10 ud.
- [ ] Disco externo SSD/HDD 500 GB — 1 ud.
- [ ] VPS 2 vCPU / 4 GB RAM (opcional MVP) — 1 ud.
- [ ] Dominio + SSL (opcional MVP) — 1 ud.

---

## 8. RIESGOS DE HARDWARE Y MITIGACIONES

| Riesgo                                     | Impacto               | Mitigación                                         |
| :----------------------------------------- | :-------------------- | :------------------------------------------------- |
| Falta de disponibilidad de equipos en Cuba | Retraso del proyecto. | Compra escalonada; priorizar servidor + impresora. |
| Precios volátiles por tasa de cambio       | Sobrecosto.           | Cotizar en MLC; comprar en bloque.                 |
| Cortes eléctricos dañan equipos            | Pérdida de hardware.  | UPS obligatorio + regulador de voltaje.            |
| Impresora térmica falla                    | Sin tickets.          | Compra de repuesto o impresora de respaldo.        |
| Tablet de gama baja no soporta PWA         | Mala experiencia.     | Mínimo 3 GB RAM y Android 10+.                     |
| Robo de equipos                            | Pérdida total.        | Anclaje de tablets, seguro (si disponible).        |

---

## 9. RECOMENDACIÓN FINAL

Para una cafetería que inicia en Cuba, se recomienda:

1. **Empezar con Escenario A** (CAPEX ~$500 USD) para validar el sistema con bajo riesgo.
2. **Escalar a Escenario B** una vez validado el MVP (3–6 meses después), añadiendo tablets de mesero, UPS de mayor capacidad y VPS en la nube.
3. **No comprar hardware de gama muy baja** en servidor ni impresora: son los componentes críticos que más impactan la operación.
4. **Priorizar UPS y respaldo** por encima de tablets adicionales: la continuidad operativa es más valiosa que la comodidad.

---

_Fin del documento — Presupuesto de Hardware CaféQR Cuba v1.0_
