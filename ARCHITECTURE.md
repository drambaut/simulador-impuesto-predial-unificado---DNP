# Arquitectura — IPU Simulador

Este documento describe cómo se comunican las piezas del sistema y los flujos de datos principales, citando archivo y línea aproximada de cada afirmación. Donde el código no permite confirmar algo, se indica explícitamente como **"no verificable desde el código"**.

## 1. Componentes y comunicación frontend ↔ backend

```
Navegador
 ├─ React app (frontend/static/js/main.31843331.js)  ── axios/fetch ──▶ Flask API (puerto 5000)
 └─ geo-map.js (frontend/static/geo/geo-map.js)        ── fetch ──────▶ Flask API (puerto 5000)
```

- El React app y `geo-map.js` son **dos programas JS independientes** cargados en la misma página (`frontend/index.html:1`, dos `<script>` separados). No comparten estado de JavaScript directamente.
- El React app llama al backend mediante `axios`/`fetch` desde `frontend_source/requests/sendIPU.ts` (todas las funciones usan `process.env.REACT_APP_API` como base, p. ej. línea 6, 20, 34, 49, 64, 78, 93, 109).
- `geo-map.js` **no recibe props ni eventos del React app**. En su lugar, **intercepta las llamadas de red globales** (`XMLHttpRequest.prototype.open/send` y `window.fetch`) para enterarse de lo que pasa, sin que el resto del frontend tenga que llamarlo explícitamente (`frontend/static/geo/geo-map.js:105-156`).
  - Cuando detecta una respuesta de `/store-data`, extrae `data_id` de la respuesta y lo recuerda (`frontend/static/geo/geo-map.js:114-122,128`).
  - Cuando detecta una respuesta exitosa de `/calculate/tariff/base` o `/calculate/tariff/projected`, invalida el caché del mapa de tarifas correspondiente y vuelve a pedir el GeoJSON (`frontend/static/geo/geo-map.js:30-33,128-171`).
- `geo-map.js` se inserta a sí mismo dentro de los `<div>` que React ya renderizó, localizándolos por `id` (`frontend/static/geo/geo-map.js:2-23,538-549` aprox., función `mountAll`/`createPanel`). Usa un `MutationObserver` para reaccionar a cambios en el DOM hechos por React (final del archivo, alta del observer).
- Backend expone una **API REST sin estado de sesión del lado del servidor más allá de un diccionario en memoria** (`data_store`, `backend/app.py:17`), identificado por un `dataId` (UUID) que el cliente debe reenviar en cada petición posterior.
- **CORS está abierto sin restricciones** (`CORS(app)`, `backend/app.py:13`) — cualquier origen puede llamar a la API.

## 2. Autenticación — flujo real (y sus límites)

> **Actualizado tras refactor de autenticación**: `SECRET_KEY` y los usuarios ya no están hardcodeados en `app.py`. `SECRET_KEY` se lee de la variable de entorno `SECRET_KEY` (con un valor por defecto heredado solo por compatibilidad, `backend/app.py:997-999`), y los usuarios se cargan desde `backend/users.json` (no versionado; plantilla en `backend/users.json.example`) vía la función `_load_users()` (`backend/app.py:1010-1018`, invocada en la línea 1021). El flujo de login y el formato de la respuesta no cambiaron.

1. El usuario envía `POST /login` con `username`/`password` (`backend/app.py:1023-1045` aprox.).
2. El backend compara contra el diccionario `users` (cargado en memoria al iniciar el proceso desde `backend/users.json`, `backend/app.py:1021`) y, si coincide, firma un JWT con `app.config['SECRET_KEY']` (`backend/app.py:997-999`), válido 1 hora.
3. El frontend guarda el token en una cookie `sessionToken` (`frontend_source/components/LoginPage.tsx:29`) y marca `isAuthenticated = true` en un `React.Context` (`frontend_source/AuthContext.tsx:16-21`).
4. `App.tsx` decide qué rutas mostrar **solo mirando si existe la cookie** (`frontend_source/AuthContext.tsx:18-21`, `frontend_source/App.tsx:34,45-75`) — no decodifica ni valida el JWT en el cliente.
5. **Ningún endpoint del backend distinto de `/login` valida el JWT.** No se encontró `jwt.decode` ni lectura de `Authorization` en `backend/app.py` fuera del bloque de login. Esto significa que la "autenticación" es solo una barrera de UI en el frontend: cualquier cliente que conozca la URL del backend puede llamar `/store-data`, `/geo/predios`, `/calculate/*`, etc., sin token alguno.

## 3. Flujo de carga del Excel

```
Excel (.xlsx)
   │  (en el navegador, SheetJS u similar vía frontend_source/utils/excelUtils.ts — no auditado en detalle)
   ▼
parseExcelFile()  →  { [nombreHoja]: filas[][] }
   │
   ▼
getTemplateFromData()  →  identifica si calza con la plantilla "data" (frontend_source/config/settings.ts:42-124)
   │
   ▼
excelToDTO()  (frontend_source/mapper/dtoMapper.ts:3-46)
   - Para cada hoja esperada (base_catastral_0, base_liquidacion_0, base_catastral_1,
     base_liquidacion_1, destinacion_economica): convierte filas en objetos usando
     los headers definidos en el template.
   │
   ▼
sendData(dto)  →  POST /store-data  (frontend_source/requests/sendIPU.ts:4-16)
   │
   ▼
backend/app.py:24-210  (store_data)
   - Lee base_catastral_0/1, base_liquidacion_0/1, params, destinacion_economica[0]
     (líneas 28-33).
   - Si hay datos de Año 1 (cat_0 no vacío, línea 54): construye df_proyeccion,
     calcula agregados, proyecciones por coeficiente 0.6 y 1.0 (límites), etc.
   - Si hay datos de Año 2 (cat_1 no vacío, línea 108): construye df_proyeccion_p,
     aplica set_criteria() y calcula VALOR_LIQUIDADO_ACTUALIZADO con la fórmula de
     procesamiento.calculo() (línea 131).
   - Genera un dataId = uuid4() (línea 201) y guarda TODO en data_store[dataId]
     (línea 204), tras pasar por to_native() para asegurarse de que sea serializable
     (líneas 227-269).
   - Responde { data_id, modules } (línea 207). `modules` indica qué combinación de
     Año 1/Año 2 se detectó (1, 2 o 3 — ver líneas 54-55, 108-109).
```

**Importante**: el archivo Excel **nunca se sube como binario** al backend. Todo el parseo ocurre en el navegador; el backend solo recibe JSON ya estructurado por hoja.

## 4. Flujo de generación de mapas

```
GET /geo/predios?dataId=<uuid>&context=<contexto>   (backend/app.py:377-413)

contexto ∈ { avaluo_year1, avaluo_year2, tarifa_year1, tarifa_year2 }
   │
   ▼
GEO_CONTEXT_TO_STORE_KEY (backend/app.py:369-374) decide qué tabla usar:
   avaluo_year1 / tarifa_year1  →  data['proyeccion_actualizada']      (salvo que exista escenario, ver más abajo)
   avaluo_year2 / tarifa_year2  →  data['proyeccion_actualizada_p']    (salvo que exista escenario)
   │
   ▼
geografia.build_predios_geojson(records, context)   (backend/modules/geografia.py:141-183)
   1. load_terrain_geometries() — lee las capas U_TERRENO_CTM12 y R_TERRENO_CTM12 de
      la .gdb (líneas 36-53), reproyecta a EPSG:4326, simplifica geometría.
      Cacheado con @lru_cache(maxsize=1) (línea 36) — solo se lee una vez por proceso.
   2. _prepare_attributes(records, context) — limpia el DataFrame de atributos,
      selecciona columnas permitidas (keep_columns, líneas 105-129), y añade columnas
      extra según el contexto (avaluo_year1 → DIFERENCIA_AVALUO/VARIACION_AVALUO_PCT,
      líneas 130-135; tarifa_year1/tarifa_year2 → campos de escenario, líneas 137-145).
   3. merge() geometría × atributos por CODIGO = NUMERO_PREDIAL (líneas 145-151).
   4. Devuelve un FeatureCollection GeoJSON + metadata de coincidencias (líneas 167-183).
   │
   ▼
Frontend (geo-map.js): renderMap() construye un SVG a mano (sin librería de mapas),
coloreando cada predio según el contexto:
   - avaluo_year1 / avaluo_year2: tema por cuantiles (Q1–Q4) de DIFERENCIA_AVALUO
     (frontend/static/geo/geo-map.js, buildAvaluoTheme/getAvaluoThemeClass).
   - tarifa_year1 / tarifa_year2: tema binario afectado/no afectado/sin información
     (buildTarifaTheme/getTarifaThemeClass).
   - Sin tema aplicable: colores neutros (rural/urbano, sin coincidencia de tabla).
```

## 5. Flujo de escenarios de avalúo (Año 1 / Año 2)

```
GET /calculate/liquidation/base?dataId=&coefficient=      (backend/app.py:417-505)
GET /calculate/liquidation/projected?dataId=&inflation=&smmlv=  (backend/app.py:507-605)
```

- Estos endpoints **recalculan** la proyección de avalúo con un coeficiente/inflación elegido por el usuario, usando `procesamiento.calcular_proyeccion` (Año 1) o recálculo directo con `procesamiento.calculo` (Año 2).
- Devuelven agregados de liquidación (no GeoJSON). El mapa temático de "Avalúo Año 1/2" se basa en los campos `AVALUO` / `AVALUO_ACTUALIZADO` ya presentes en `data['proyeccion_actualizada']` / `data['proyeccion_actualizada_p']` desde que se cargó el Excel — **no hay un endpoint separado que persista "un escenario de avalúo"** como sí ocurre con las tarifas (sección 6). El mapa de avalúo siempre refleja los valores guardados al momento de `/store-data` (más la recalculación de coeficiente que el usuario haya pedido vía estos GET, si el frontend decide usarla para refrescar — no verificado en detalle en `frontend_source`, ya que los componentes `LiquidationBase.tsx`/`LiquidationProjected.tsx` no fueron auditados línea por línea en este documento).

## 6. Flujo de escenarios de modificación de tarifas (Año 1 / Año 2)

```
POST /calculate/tariff/base       (Año 1, backend/app.py:607-718)
POST /calculate/tariff/projected  (Año 2, backend/app.py:720-841)
```

Ambos siguen el mismo patrón:

1. Reciben `dataId`, `tariff` (tarifa nueva) y filtros opcionales: `destination`, `area`, `zone`, `stratum`, `valuation`, `valuation_smmlv`, `valuation_uvt`.
2. Cargan el DataFrame base (`proyeccion_actualizada` o `proyeccion_actualizada_p`) **como una copia nueva** (no modifican el original guardado en `data_store`).
3. Construyen una máscara booleana (`mask`) aplicando cada filtro presente.
4. Calculan la tarifa promedio y el conteo de predios afectados **antes** de modificar nada.
5. Sobrescriben `TARIFA` solo en las filas de la máscara con el valor nuevo.
6. Recalculan la liquidación modificada:
   - Año 1: `procesamiento.calcular_valor_liquidado_tariff()` (reasigna la columna `VALOR_LIQUIDADO_ACTUALIZADO` en el DataFrame).
   - Año 2: `procesamiento.calculo(row, inflation)` aplicado fila a fila (no reasigna el DataFrame original, se captura en una `Series` aparte).
7. Construyen una tabla por predio (`scenario_df`) con: `NUMERO_PREDIAL`, `DESTINACION_ECONOMICA`, `ZONA`, `ESTRATO`, `AREA_TERRENO`, `AVALUO`, `TARIFA_ORIGINAL`, `TARIFA_NUEVA`, `PREDIO_AFECTADO`, `VALOR_LIQUIDADO_ORIGINAL`, `VALOR_LIQUIDADO_MODIFICADO`, `DIFERENCIA_LIQUIDACION` (Año 2 añade además `CATEGORIA_PREDIO`, derivada de los criterios `CRITERIO_*`).
8. Guardan esa tabla en `data['tariff_scenario_year1']` o `data['tariff_scenario_year2']` (mutando el mismo diccionario referenciado por `data_store[dataId]`).
9. Devuelven al frontend solo los **agregados** (`lot_count`, `average_tariff`, `total_liq_update`, `total_liq_update_tariff`, `delta_liq`) — la tabla por predio nunca viaja en esta respuesta; se consulta después vía `/geo/predios`.

**Reflejo en el mapa**: `GET /geo/predios?context=tarifa_year1|tarifa_year2` revisa primero si existe `tariff_scenario_year1`/`tariff_scenario_year2` en `data_store[dataId]`; si existe, lo usa en vez de la tabla base (`backend/app.py:393-400`). Esto implica:

- **Solo el último escenario creado se refleja en el mapa** (cada llamada sobrescribe la clave anterior). No hay combinación de varios escenarios ni selección entre escenarios históricos.
- **Borrar una tarjeta de escenario en la interfaz (React) no avisa al backend.** El `Scenarios.tsx` solo filtra el arreglo en memoria del navegador (`frontend_source/components/Scenarios.tsx:34`); el backend sigue sirviendo el último escenario calculado hasta que se cree uno nuevo o el proceso se reinicie.
- El refresco del mapa tras crear un escenario depende de que `geo-map.js` intercepte exitosamente la llamada de red (sección 1); si el frontend cambiara de librería HTTP de forma que no pase por `XMLHttpRequest`/`fetch` global, este mecanismo dejaría de funcionar (no verificado como riesgo actual, axios usa XHR por defecto en navegador).

## 7. Resumen de endpoints (`backend/app.py`)

| Método | Ruta | Línea | Propósito |
|---|---|---|---|
| GET | `/healthz` | 19 | Healthcheck (Docker) |
| POST | `/store-data` | 24 | Carga inicial del Excel procesado |
| GET | `/retrieve-data/aggregates` | 283 | Agregados guardados |
| GET | `/retrieve-data/destinations` | 301 | Catálogo de destinos económicos |
| GET | `/retrieve-data/stratum` | 326 | Catálogo de estratos |
| GET | `/retrieve-data/<data_id>` | 352 | Datos crudos por id |
| GET | `/geo/predios` | 377 | GeoJSON temático (avalúo/tarifa, Año 1/2) |
| GET | `/calculate/liquidation/base` | 417 | Recalcular avalúo Año 1 por coeficiente |
| GET | `/calculate/liquidation/projected` | 507 | Recalcular avalúo Año 2 por inflación/SMMLV |
| POST | `/calculate/tariff/base` | 607 | Crear escenario de tarifa Año 1 |
| POST | `/calculate/tariff/projected` | 720 | Crear escenario de tarifa Año 2 |
| GET | `/calculate/liquidation/<data_id>` | 844 | Resumen completo de liquidación |
| POST | `/login` | 1009 | Autenticación (emite JWT, no verificado luego) |

## 8. Lo que este documento NO pudo verificar desde el código

- El comportamiento exacto de `frontend_source/components/Parameters.tsx`, `Summary.tsx`, `LiquidationBase.tsx`, `LiquidationProjected.tsx`, `TabbedDashboard.tsx` y `TabbedLiquidation.tsx` no se auditó línea por línea para este documento (sí se revisaron `ExcelReader.tsx`, `TariffSimulator.tsx`, `Simulator.tsx`, `Scenarios.tsx`, `TabbedSimulator.tsx`, `App.tsx`, `AuthContext.tsx`, `LoginPage.tsx`, `dtoMapper.ts`, `sendIPU.ts`, `settings.ts`).
- No se confirmó si `frontend_source/utils/excelUtils.ts` usa SheetJS u otra librería para leer el `.xlsx` en el navegador (no se abrió ese archivo en esta auditoría).
- No se verificó si el bundle compilado `frontend/static/js/main.31843331.js` corresponde exactamente, línea por línea, a `frontend_source/` — se asume que es una versión decompilada/reconstruida cercana, según indica `docs/INTEGRACION_GIS.md:7`, pero no se hizo una comparación exhaustiva.
- No se encontró ningún mecanismo de expiración o límite de tamaño para `data_store`; se asume que crece indefinidamente, pero no se hizo una prueba de carga para confirmarlo.
