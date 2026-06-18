# Integracion geografica IPU

## Auditoria de arquitectura

- Backend: Flask 3.0.3 con Gunicorn, CORS habilitado y almacenamiento en memoria en `data_store`.
- Frontend activo: `frontend/`, build estatico Create React App servido por httpd.
- Fuente recuperada: `frontend_source/`, parcial. No contiene `package.json`, `styles/` ni `ArcGISMap.tsx`, por lo que no es recompilable sin reconstruccion adicional.
- Docker anterior: `docker-compose.yml` usaba imagenes remotas `sdk6/ipu-backend:latest` y `sdk6/ipu-frontend:latest`; las carpetas locales no participaban en ejecucion.
- Comunicacion: REST desde el frontend hacia `process.env.REACT_APP_API`. La carga del Excel ocurre en navegador y se envia a `/store-data`.

## Endpoints existentes

- `GET /healthz`
- `POST /store-data`
- `GET /retrieve-data/aggregates`
- `GET /retrieve-data/destinations`
- `GET /retrieve-data/stratum`
- `GET /retrieve-data/<data_id>`
- `GET /calculate/liquidation/base`
- `GET /calculate/liquidation/projected`
- `POST /calculate/tariff/base`
- `POST /calculate/tariff/projected`
- `GET /calculate/liquidation/<data_id>`
- `POST /login`

## Datos analizados

La geodatabase en `datos_geograficos/15092_Beteitiva.gdb` aparece en disco como `15092_Betéitiva.gdb`.

Capas necesarias:

- `U_TERRENO_CTM12`: 112 poligonos urbanos.
- `R_TERRENO_CTM12`: 3.838 poligonos rurales.

Ambas capas estan en MAGNA CTM12 y se reproyectan a `EPSG:4326` para web.

Plantilla Excel:

- `base_catastral_0`: `NUMERO_PREDIAL`, `NUMERO_ORDEN`, `DESTINACION_ECONOMICA`, `AREA_TERRENO`, `AREA_CONSTRUIDA`, `AVALUO`.
- `base_catastral_1`: mismas columnas.
- `base_liquidacion_0`: `NUMERO_PREDIAL`, `TARIFA`, `ESTRATO`, `VALOR_LIQUIDADO`, `PAGO`.
- `base_liquidacion_1`: mismas columnas.
- `destinacion_economica`: equivalencias por codigo de destino.

El simulador usa todas esas hojas. En backend se filtra base catastral a `NUMERO_ORDEN == 1`, se unen catastral y liquidacion por `NUMERO_PREDIAL`, y luego se guardan:

- `proyeccion_actualizada` para Año 1.
- `proyeccion_actualizada_p` para Año 2.

## Validacion de llave

La llave de union correcta es:

`NUMERO_PREDIAL = CODIGO`

Resultados:

- Geodatabase: 3.950 codigos unicos.
- Año 1, despues de `NUMERO_ORDEN=001`: 3.976 predios unicos, 3.866 coincidencias, 110 registros sin geometria, 84 geometrias sin registro.
- Año 2, despues de `NUMERO_ORDEN=001`: 4.340 predios unicos, 3.950 coincidencias, 390 registros sin geometria, 0 geometrias sin registro.

La llave esta verificada, pero la cobertura no es total.

## Diseno implementado

Backend:

- Nuevo modulo `backend/modules/geografia.py`.
- Lee `U_TERRENO_CTM12` y `R_TERRENO_CTM12`.
- Reproyecta a `EPSG:4326`.
- Simplifica geometria para respuesta web.
- Une atributos procesados del simulador por `CODIGO = NUMERO_PREDIAL`.
- Cachea geometria en memoria para no leer la GDB en cada request.

Nuevo endpoint:

`GET /geo/predios?dataId=<uuid>&context=<context>`

Contextos validos:

- `avaluo_year1`
- `avaluo_year2`
- `tarifa_year1`
- `tarifa_year2`

Frontend:

- Se agrego una mejora estatica en `frontend/static/geo/`.
- No depende de CDN ni de reconstruir React.
- Captura el `dataId` desde las respuestas de `/store-data` y desde URLs con `dataId`.
- Inserta mapas SVG interactivos en:
  - Avalúo Catastral / Año 1
  - Avalúo Catastral / Año 2
  - Modificación Tarifas / Año 1
  - Modificación Tarifas / Año 2
- Permite seleccionar predios, resaltarlos y consultar atributos.

Docker:

- Backend ahora se construye desde `./backend`.
- `datos_geograficos/` se monta en `/app/datos_geograficos:ro`.
- Frontend usa `httpd:2.4` y monta `./frontend` como contenido estatico.

## Archivos modificados

- `backend/app.py`: agrega endpoint `/geo/predios`.
- `backend/modules/geografia.py`: lectura, reproyeccion, union y serializacion GeoJSON.
- `backend/requirements.txt`: agrega `geopandas` y `pyogrio`.
- `frontend/index.html`: carga JS/CSS GIS.
- `frontend/static/geo/geo-map.js`: componente estatico de mapa SVG.
- `frontend/static/geo/geo-map.css`: estilos institucionales del mapa.
- `docker-compose.yml`: usa backend local, frontend estatico local y monta datos geograficos.

## Comandos de reconstruccion y prueba

```powershell
docker compose down
docker compose build backend
docker compose up -d
docker compose ps
```

Pruebas basicas:

```powershell
curl http://localhost:5000/healthz
curl http://localhost:3000/
```

Prueba funcional:

1. Abrir `http://localhost:3000`.
2. Iniciar sesion.
3. Cargar `datos_geograficos/Beteitiva_plantilla.xlsx`.
4. Enviar la informacion.
5. Revisar las subpestañas de Avalúo Catastral y Modificación Tarifas.

## Riesgos y limitaciones

- `data_store` es memoria de proceso. Si el backend se reinicia, el `dataId` deja de existir.
- La union predial no tiene cobertura total por diferencias entre Excel y GDB.
- `frontend_source/` no es fuente completa; la integracion frontend se hizo sobre el build estatico.
- La respuesta GeoJSON incluye 3.950 poligonos. Funciona para este municipio, pero municipios mas grandes deberian usar tiles, paginacion espacial o simplificacion/cache persistente.
- La instalacion de dependencias GIS en Docker requiere acceso a paquetes Python al construir la imagen.
