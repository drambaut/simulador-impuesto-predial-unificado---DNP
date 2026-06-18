# `datos_geograficos/`

Carpeta de datos de entrada geoespaciales y de ejemplo que usa el backend para construir los mapas (`GET /geo/predios`). El backend la lee directamente; no requiere ningún paso de importación previo.

## Contenido actual

| Archivo/carpeta | Tamaño aprox. | Qué es |
|---|---|---|
| `15092_Betéitiva.gdb/` | ≈54 MB | Geodatabase de Esri (formato `.gdb`) con la geometría predial del municipio de Betéitiva (Boyacá). |
| `Beteitiva_plantilla.xlsx` | ≈680 KB | Plantilla Excel de ejemplo con datos catastrales y de liquidación del mismo municipio, lista para usarse como demo end-to-end. |

## Cómo la usa el backend

- `backend/modules/geografia.py:20-33` busca, en este orden:
  1. La ruta exacta indicada por la variable de entorno `GEODATA_GDB_PATH`, si existe.
  2. El primer archivo `*.gdb` encontrado dentro de la carpeta indicada por `GEODATA_DIR` (por defecto, **esta misma carpeta**, calculada como `<raíz-del-repo>/datos_geograficos` — `backend/modules/geografia.py:12`).
- Si no encuentra ningún `.gdb`, falla con `FileNotFoundError: No se encontro una geodatabase .gdb en <ruta>` (`backend/modules/geografia.py:30-32`).
- Lee únicamente dos capas de la geodatabase (`backend/modules/geografia.py:13-16`):
  - `U_TERRENO_CTM12` — predios urbanos.
  - `R_TERRENO_CTM12` — predios rurales.
- Cada capa se reproyecta de su CRS original (MAGNA-SIRGAS CTM12, según `docs/INTEGRACION_GIS.md:35`) a `EPSG:4326` para mostrarse en el mapa web (`backend/modules/geografia.py:17,51`), y la geometría se simplifica (tolerancia `0.00001`) para reducir el peso de la respuesta (`backend/modules/geografia.py:52`).
- El resultado se cachea en memoria con `@lru_cache(maxsize=1)` (`backend/modules/geografia.py:36`): **la geodatabase solo se lee una vez por proceso**. Si reemplazas el archivo `.gdb` en disco, debes reiniciar el backend para que tome efecto.
- La unión con los datos del Excel se hace por `CODIGO` (campo de la geodatabase) = `NUMERO_PREDIAL` (campo del Excel) — ver `backend/modules/geografia.py:145-151`. Esta unión **no tiene cobertura del 100%**: para el dataset de Betéitiva hay predios sin geometría y geometrías sin registro (detalle exacto en `docs/INTEGRACION_GIS.md:56-62`).

`Beteitiva_plantilla.xlsx` no la lee el backend directamente: se carga desde el navegador (pantalla de "Cargar Base de Cálculo"), se parsea ahí mismo y se envía como JSON a `POST /store-data`. Sirve como plantilla de referencia/demo para probar la aplicación sin tener que construir un Excel desde cero (ver `INSTALLATION.md`, sección 4).

## Formato esperado del Excel

El Excel debe tener estas hojas, con estas columnas exactas (`frontend_source/config/settings.ts:42-124`):

| Hoja | Columnas |
|---|---|
| `base_catastral_0` | `NUMERO_PREDIAL`, `NUMERO_ORDEN`, `DESTINACION_ECONOMICA`, `AREA_TERRENO`, `AREA_CONSTRUIDA`, `AVALUO` |
| `base_catastral_1` | mismas columnas que `base_catastral_0` |
| `base_liquidacion_0` | `NUMERO_PREDIAL`, `TARIFA`, `ESTRATO`, `VALOR_LIQUIDADO`, `PAGO` |
| `base_liquidacion_1` | mismas columnas que `base_liquidacion_0` |
| `destinacion_economica` | equivalencias de código de destino (sin columnas fijas validadas en el frontend) |

Los sufijos `_0` / `_1` corresponden a Año 1 / Año 2 respectivamente. Si solo se diligencian las hojas `_0`, la aplicación solo habilita el módulo de Año 1.

## Cómo usar otra geodatabase / otro municipio

1. Reemplaza (o agrega junto a esta) tu propio archivo `*.gdb`, asegurándote de que tenga las capas `U_TERRENO_CTM12` y `R_TERRENO_CTM12` con un campo `CODIGO` que coincida con `NUMERO_PREDIAL` del Excel que vayas a cargar.
2. Si quieres mantener varias geodatabases en esta carpeta sin ambigüedad, usa la variable de entorno `GEODATA_GDB_PATH` para apuntar a la exacta (ver `.env.example` en la raíz del repo).
3. Reinicia el backend (la geodatabase se cachea en memoria, ver arriba).

## ⚠️ Antes de subir esta carpeta a un repositorio público

Estos archivos contienen **datos catastrales reales** (avalúos, tarifas, estratos y geometría predial) de un municipio real. Esta auditoría **no pudo confirmar** desde el código si son datos públicos/abiertos según la normativa catastral colombiana. No se asume que sea seguro publicarlos — es una decisión que debe tomar alguien con autoridad sobre esos datos (ver `README.md` de la raíz, secciones "Información sensible" y "Checklist antes de publicar en GitHub").

Adicionalmente:
- La geodatabase puede contener archivos de bloqueo temporal (`*.lock`, `*.sr.lock`) generados por software de escritorio tipo ArcGIS al abrirla. Ya están excluidos vía `.gitignore` en la raíz del repositorio — no deben versionarse.
- Por su tamaño (~54 MB), si decides publicarla, evalúa usar Git LFS en vez de un commit normal.
