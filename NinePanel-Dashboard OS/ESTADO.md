# Estado del proyecto — Nine Palet (Supplier Quality Dashboard)

> Archivo de continuidad. Si retomas el trabajo otro día, lee esto primero y con eso
> recuperas el contexto sin releer la conversación completa.

**Última actualización:** 13 de noviembre de 2026
**Estado:** prototipo local con datos demo · tema corporativo Stoneridge · 9 paneles en una sola pantalla · barra lateral interactiva · drill-down, ventana flotante y **descarga a Excel por panel** activos · logo vectorial SVG

---

## 1. Qué es

Tablero de Calidad de Proveedores con el concepto **"Nine-Panel KPI"** del mockup
`NINE PALET.png` (en el Escritorio). Prototipo local, **sin dependencias** (Node.js puro),
mismo estilo de trabajo que PPAP-Recordatorios.

- Corre en `http://127.0.0.1:5124`
- Doble clic en `ninepanel.cmd`
- Datos **demo** embebidos en `server.mjs` (los KPIs "respiran" un poco en cada carga para
  simular datos vivos)
- `/` sirve directamente el dashboard; se eliminó la landing.
- `/ayuda.html` explica funcionalidad, controles y mediciones de los 9 paneles.

## 2. Referencias

| Cosa | Dónde |
|---|---|
| Mockup del concepto | `\\juafile03\jua-home$\OSauceda\Desktop\NINE PALET.png` |
| Anotaciones a implementar | `\\juafile02\Common\DF\NinePanel-Dashboard\comments.md` |
| Plataforma de referencia (estilo) | https://ncedfdev02.nce-dev-ilb-ase.appserviceenvironment.net — "Digital Factory" (SPA Vue.js, tema oscuro #212) |
| Plataforma mencionada en el mockup | SupplierQuest (focus: claims, scorecard, delivery, COPQ, PPAP, project readiness, audits) |
| Proyecto hermano (patrón de código) | `C:\Users\OSauceda\PPAP-Recordatorios` |

## 3. Qué está hecho

- **9 paneles** en grid 3×3 compacto, visibles en una sola pantalla (sin scroll vertical a
  1920×1080 ni a 1366×768):
  1. Top Focus Suppliers (Top 3 EU + 3 NA) — **es uno de los 9 paneles**
  2. Supplier Claims (histograma L1/L2/L3 del mes actual + tendencia anual por nivel)
  3. Supplier Scorecard (por rating A/B/C, toggle base completa / top focus)
  4. On-time Delivery (consolidado o por proveedor, target, guía de mouse, meses por cumplimiento)
  5. COPQ · Containment (kEUR)
  6. Chargeback Recovery (% recovery + comparativo mensual Charged vs. Recovery)
  7. Supplier PPAP Requalification (status share, % on time)
  8. Supplier Project Readiness (APQP, Pillar 4)
  9. Supplier Audits Status (completitud normalizada por mes; clic en mes → proveedores)
- **Tema corporativo Stoneridge:** rojo `#C8102E`, gris claro `#E6E7E8`, blanco `#FFFFFF`,
  gris oscuro de apoyo `#4A4A4A`. El rojo es el acento; los grises cubren lo positivo/neutro
  y el ámbar apagado `#9A6A00` queda solo para advertencias.
- **Gráficas SVG** hechas a mano: barras, barras agrupadas, barras horizontales, línea con target,
  dona y gauge. Sin librerías. Ajustes visuales aplicados a gráficas/números de paneles 3 y 7.
- **Barra lateral interactiva de funcionalidades (izquierda):**
  - Colapsada por defecto mostrando solo el icono `☰`; se expande al pasar el mouse o enfocar (`:hover` / `:focus-within`).
  - Contiene rango (**6M / 12M / Quarter**), guía de interacción, listado de **9 paneles** y botón **Ayuda y mediciones** al final del menú.
  - Clic en un panel del listado abre su vista de **Detalle** (como `⤢ Detalle`).
- **Interacción homogénea en los 9 paneles (CSS/controles unificados):**
  - Tooltip al pasar el mouse (o enfocar con teclado) sobre cualquier dato.
  - Clic en un dato (fila, barra, punto, segmento de dona, KPI, gauge, mes) → modal de
    drill-down con KPIs, gráfica comparativa, tabla y lectura ("insight").
  - Botón `⤢ Detalle` en la cabecera de cada panel → detalle general del panel.
  - Botón `⤓` en la cabecera de cada panel (y `⤓ Excel` en la ventana flotante y en el modal) →
    **descarga el panel en `.xlsx`** con los datos y filtros vigentes.
  - Clic en un **área vacía/sin información** del panel → **ventana flotante centrada** con sus métricas (el fondo no se mueve).
  - Desde la ventana flotante, `⤢ Detalle` (o detalle desde contenido) cierra la flotante y abre solo el modal de detalle.
  - Títulos de panel con hover visual (subrayado/color de acento y cursor pointer).
  - Filtro **Todos / EU / NA** en el panel 1; toggle **Base completa / Top focus** en el panel 3; selector **Todos / proveedor** en el panel 4 con guía de mouse.
  - Cierre con `Esc`, clic en el fondo o botón ✕.
- **Página de ayuda:** `public/ayuda.html` con explicación del dashboard, controles e interpretación/mediciones de los 9 paneles y targets.
- **Layout y legibilidad:** medidas ajustadas para convivir con la barra lateral; protecciones contra desborde de texto (`overflow`, `ellipsis`, `min-width: 0`) en paneles/controles.
- Footer con los targets del concepto (slide 12b).
- `/api/datos` en `server.mjs` devuelve el payload demo (lista para sustituir por fuente real).
- Lanzador a prueba de doble arranque (puerto 5124). Rutas: `/`, `/dashboard`, `/ayuda.html`, `/api/datos`.

## 4. Pendiente

- [ ] Revisar visualmente contra el mockup (el OCR del PNG fue la única fuente de texto;
      puede haber diferencias de colores, orden o contenido en los paneles).
- [ ] Confirmar datos reales por panel (fórmulas, fuente, dueño de cada KPI).
- [ ] Decidir si se conecta a una API real (¿SupplierQuest? ¿otra?) y con qué auth.
- [ ] Validar los renombres propuestos para las clasificaciones PPAP antes de cambiarlas:
      `Full approved → Approved`, `In process → In review`, `Expiring → Expiring soon`,
      `Expired → Expired`. Se conservaron los nombres actuales a propósito.
- [ ] Decidir dónde vivirá al final (¿módulo de Digital Factory? ¿app aparte?).

## 5. Notas técnicas

- El OCR del mockup se hizo con el motor de Windows (`Windows.Media.Ocr`) desde PowerShell;
      el script queda en `C:\Users\OSauceda\AppData\Local\Temp\opencode\ocr4.ps1` (temporal).
- Texto extraído del mockup (ruidoso) para referencia rápida:
  "Supplier Quality Dashboard: Nine-Panel KPI Concept · Stoneridge · panes with live data ·
  FOCUS Claims Scorecard delivery COPQ PPAP project readiness and audits - SupplierQuest ·
  Top Focus Suppliers (Top3 EU + Top3 NA) · 74 PPM's · Claims (0km/Field) 3 EU 3 NA top5 shown ·
  Supplier claims L1 L2 L3 · SCARS L1 L2/L3 · COPQ containment (kEUR) Pillar 1 ·
  Supplier project readiness Pillar 4 · Supplier scorecard Overview by rating ·
  On-time delivery (OTD) target · Supplier PPAP requalification Status share % time ·
  Chargeback recovery (kEUR) Pillar 2 90% · Supplier audits status 2027 ·
  Targets (slide 12b): L1 SCAR 0 L2,3 SCAR 0.50 scorecard PPAP COPQ ·
  I would like tooling allocation cost and status in 9panel"
- Nombres de proveedores genéricos (Supplier B…G), igual que el mockup.
- Puerto 5124 para no chocar con PPAP Recordatorios (5123).
- Logo de Stoneridge: original raster oficial `Stoneridge_rgb-1.png` (1345×663) recortado a
  `public\assets\stoneridge-logo-trim.png` (1216×544). Desde el 12-nov-2026 el dashboard usa
  **`public\assets\stoneridge-logo.svg`** (vector, 5 KB, viewBox 1550×681) y el favicon usa
  `public\assets\stoneridge-mark.svg` (solo la "S", 938 B). El PNG se conserva como respaldo/fallback.
  El SVG se validó contra el PNG: IoU de la máscara de tinta **0.957** y mismo rojo (PNG `#CF0E2D`,
  SVG `#CE0E2D`), así que es la misma marca, ahora escalable sin pérdida.
- **Icono del ejecutable (13-nov-2026):** `ninepanel.exe` es un binario compilado con
  `bun build --compile` (Bun 1.4.4). Por defecto usa el **logo completo** "STONERIDGE"
  (`public\assets\stoneridge-logo.ico`, sobre fondo blanco, 7 tamaños: 16/24/32/48/64/128/256 px),
  generado desde `public\assets\stoneridge-logo.svg`. Se conserva la variante de solo la "S"
  (`public\assets\stoneridge.ico`, transparente) y `build-exe.cmd s` recompila con ella.
  `docs\icono-exe.png` es una vista previa a 256 px.
  Bun deja **dos grupos** de iconos en el .exe y el Explorador usa el viejo (`IDI_MYICON`),
  por eso `tools\fix-exe-icon.ps1` copia el grupo correcto sobre `IDI_MYICON` tras compilar.
- **`server.mjs` en el .exe:** al compilar con Bun, `import.meta.url` apunta al filesystem virtual
  (`B:\~BUN\root`); por eso `ROOT` detecta la carpeta que realmente contiene `public\index.html`
  (normalmente la del ejecutable) y el .exe sirve el dashboard además de `/api/datos`.
- Rutas: `/` y `/dashboard` = tablero, `/api/datos` = payload demo.
- Datos demo clave: claims YTD `16/30/20` (L1/L2/L3); chargeback `1,043` charged / `939`
  recovered / `90.0%`; auditorías `50` totales / `42` completadas / `84.0%`; enero `6/6 = 100%`,
  febrero `4/6 = 66.7%`.
- La gráfica 4 usa una serie OTD demo determinista por focus supplier (`otd.porProveedor`).

## 6. Archivos clave

```
ninepanel.cmd              lanzador
ninepanel.exe              versión compilada con Bun + icono Stoneridge
build-exe.cmd              regenera el .exe con el icono
tools\fix-exe-icon.ps1     corrige el grupo de iconos que usa el Explorador
server.mjs                 servidor + rutas + datos demo (payloadDemo)
public\index.html          estructura dashboard, barra lateral y ventana flotante
public\ayuda.html          explicación del dashboard y mediciones de los 9 paneles
public\app.js              render + gráficas SVG + drill-down + flotante + interacciones
public\styles.css          tema corporativo compacto, barra lateral, controles homogéneos
public\assets\             logo de Stoneridge (SVG + PNG) + iconos del .exe (.ico)
docs\captura.png           captura/referencia
README.md                  cómo se usa
```

## 7. Sesión guardada (resumen de cambios recientes)
- Barra vertical de funcionalidades colapsable (icono `☰`, hover/focus para mostrar).
- Lista de 9 paneles en menú abre detalle; ventana flotante centrada al clic en área vacía del panel (sin mover fondo).
- Al abrir **Detalle** desde flotante, se cierra la flotante para mostrar solo el detalle.
- Interacción/CSS homogéneos en controles, títulos de panel con hover/cursor, ayuda en `ayuda.html`.
- Ajustes de medidas/overflow de texto y de gráficas/números en paneles 3 y 7.
- **Descarga a Excel por panel (12-nov-2026):** generador `.xlsx` propio en `public\app.js`
  (ZIP store + SpreadsheetML, sin dependencias). Un libro por panel con metadatos, encabezados,
  totales, porcentajes y autofiltro; el panel 9 incluye hojas "Resumen mensual" y "Detalle proveedores".
  Respeta rango 6M/12M/Quarter, región EU/NA y proveedor OTD seleccionado. Verificado con `xlsx` (npm):
  9 libros legibles, XML válido y flujo real de descarga (3 archivos) en Chrome headless.
- **Logo vectorial:** se reemplazó el PNG por `stoneridge-logo.svg` (y `stoneridge-mark.svg` como favicon).
- **Icono del .exe (13-nov-2026):** `ninepanel.exe` recompilado con Bun 1.4.4 usando el logo
  completo "STONERIDGE" (`public\assets\stoneridge-logo.ico`, 7 tamaños, fondo blanco). Se conserva
  la variante de la "S" (`public\assets\stoneridge.ico`) y `build-exe.cmd s` recompila con ella.
  Se agregó `build-exe.cmd` para regenerarlo. Además se corrigió `ROOT` en `server.mjs` para que
  el binario compilado sirva `public\` desde la carpeta del ejecutable (antes `/` daba 404).
  El Explorador seguía mostrando otro icono porque Bun deja **dos grupos** (`IDI_MYICON` viejo y
  `#0` con los 7 tamaños); `tools\fix-exe-icon.ps1` copia el grupo bueno sobre `IDI_MYICON` en cada
  compilación.
- **Flujo enero → diciembre (12-nov-2026):** las series temporales (Claims, OTD, COPQ, Chargeback
  y Auditorías) se muestran siempre en orden calendario **enero → diciembre**, con **diciembre al
  cierre** (si la ventana abre en diciembre se rota al final). Aplica en 6M/12M/Quarter, gráficas,
  detalles/modales, ventana flotante y Excel. Los KPIs de "mes actual" y deltas siguen usando la
  serie cronológica. **Quarter** mantiene los 12 meses y los segmenta con bandas/separadores y
  etiquetas `Q1`–`Q4` (panel 9 con columna de trimestre). Verificado con CDP a 1366×768 y
  1920×1080: 0 recortes, 0 solapamientos, 0 desbordes.
- Documentación actualizada: `README.md` y `public\ayuda.html` describen la descarga Excel y el logo.



## 8. Sesion Guardada

