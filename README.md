# IPU — Simulador del Impuesto Predial Unificado

> Auditoría y documentación generadas a partir del código fuente real del repositorio (sin asumir funcionalidad no verificada en el código). Cada afirmación importante cita archivo y línea aproximada.

## 1. Descripción funcional

Aplicación web para simular el **Impuesto Predial Unificado (IPU)** de un municipio colombiano a partir de una plantilla Excel con información catastral y de liquidación. Permite:

- Cargar una plantilla Excel con bases catastrales y de liquidación de dos años (`ExcelReader.tsx`, `frontend_source/components/ExcelReader.tsx:32-61`).
- Calcular proyecciones de avalúo actualizado (Año 1 y Año 2) bajo distintos coeficientes de actualización (`backend/app.py:417-505`, endpoints `/calculate/liquidation/base` y `/calculate/liquidation/projected`).
- Simular **escenarios de modificación de tarifas** por filtros (zona, área, avalúo, estrato, destinación económica) y ver el impacto agregado en la liquidación (`backend/app.py:607-841`, endpoints `/calculate/tariff/base` y `/calculate/tariff/projected`).
- Visualizar en un **mapa interactivo (SVG)** los predios del municipio, coloreados temáticamente por aumento de avalúo o por afectación de un escenario de tarifa (`frontend/static/geo/geo-map.js`).
- Autenticarse con un usuario/contraseña por municipio (`backend/app.py:993-1031`).

El proyecto declara explícitamente: *"Esta aplicación no es un liquidador de IPU"* (`frontend_source/components/ExcelReader.tsx:142`) — es una herramienta de **simulación/proyección**, no de liquidación oficial.

## 2. Arquitectura

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────┐
│  Frontend (React)   │ ───────────────────────▶ │  Backend (Flask)     │
│  build estático      │ ◀─────────────────────── │  + Gunicorn (Docker) │
│  + script geo-map.js │                          │  data_store en RAM   │
└─────────────────────┘                          └──────────┬───────────┘
                                                              │ lee
                                                   ┌──────────▼───────────┐
                                                   │ Geodatabase .gdb      │
                                                   │ (datos_geograficos/)  │
                                                   └───────────────────────┘
```

- **Frontend servido como archivos estáticos** (`frontend/`): un build de Create React App ya compilado (`frontend/static/js/main.31843331.js`) más un script adicional vanilla JS para los mapas (`frontend/static/geo/geo-map.js`), referenciado directamente en `frontend/index.html:1`.
- **No hay build step en producción**: el `docker-compose.yml` (raíz) sirve `frontend/` con la imagen `httpd:2.4` montando la carpeta como solo lectura (`docker-compose.yml:18-27`). No se compila nada de `frontend_source/`.
- **`frontend_source/` es código fuente reconstruido/decompilado**, usado como referencia para entender y modificar el comportamiento, pero **está incompleto**: no tiene `package.json`, `styles/` ni `ArcGISMap.tsx` (confirmado en `docs/INTEGRACION_GIS.md:7`). **No se puede recompilar tal cual.**
- **Backend Flask** (`backend/app.py`, 1039 líneas) expone una API REST y mantiene **todo el estado en memoria de proceso** (`data_store = {}`, `backend/app.py:17`). No hay base de datos. Si el proceso se reinicia, todos los `dataId` se pierden.
- **Datos geográficos**: una geodatabase de Esri (`.gdb`) leída con GeoPandas/Pyogrio (`backend/modules/geografia.py:42`), reproyectada a `EPSG:4326` y combinada (merge) con los datos del Excel por el campo `NUMERO_PREDIAL` = `CODIGO` (`backend/modules/geografia.py:145-151`).

## 3. Estructura de carpetas

```
.
├── backend/                     # API Flask
│   ├── app.py                   # Rutas HTTP, lógica de negocio (1039 líneas)
│   ├── modules/
│   │   ├── procesamiento.py     # Transformaciones de DataFrames, fórmulas de liquidación
│   │   ├── agregados.py         # Cálculos agregados (factores de proyección)
│   │   └── geografia.py         # Lectura .gdb, reproyección, GeoJSON
│   ├── utils/convert.py         # Script suelto de conversión Excel→JSON (no usado por la app)
│   ├── requirements.txt         # Dependencias Python
│   ├── dockerfile               # Imagen del backend
│   └── README.md                # ⚠️ Archivo con encoding corrupto, ver Checklist
├── frontend/                     # Build estático servido en producción
│   ├── index.html
│   └── static/
│       ├── js/ , css/            # Bundle de Create React App (ya compilado)
│       └── geo/geo-map.js, geo-map.css   # Capa de mapas añadida sobre el build estático
├── frontend_source/              # Fuente TSX reconstruida (INCOMPLETA, no compila)
├── datos_geograficos/
│   ├── 15092_Betéitiva.gdb/      # Geodatabase real de un municipio (≈54 MB)
│   └── Beteitiva_plantilla.xlsx  # Plantilla Excel de ejemplo/demo
├── docs/
│   └── INTEGRACION_GIS.md        # Auditoría previa de la integración geográfica
├── rescate_ipu/                  # ⚠️ Volcado de contenedores Docker (≈524 MB), ver sección 9
└── docker-compose.yml            # Orquestación local (build backend + frontend estático)
```

## 4. Tecnologías utilizadas

| Capa | Tecnología | Evidencia |
|---|---|---|
| Backend | Python 3.11, Flask 3.0.3, Flask-CORS | `backend/dockerfile:2`, `backend/requirements.txt` |
| Servidor WSGI (producción) | Gunicorn | `backend/dockerfile:19` |
| Procesamiento de datos | pandas, numpy | imports en `backend/app.py`, `backend/modules/*.py` |
| Datos geoespaciales | GeoPandas + Pyogrio | `backend/modules/geografia.py:6,42` |
| Lectura de Excel | openpyxl (vía pandas) | `backend/utils/convert.py:21`, dependencia en `requirements.txt` |
| Autenticación | PyJWT (JWT firmado con HS256) | `backend/app.py:1018-1024` |
| Frontend | React + TypeScript (Create React App), react-bootstrap, react-router-dom, axios, js-cookie | imports en `frontend_source/**/*.tsx` |
| Mapa interactivo | JavaScript vanilla (SVG generado a mano, sin librerías GIS de cliente) | `frontend/static/geo/geo-map.js` |
| Contenedores | Docker / docker-compose | `docker-compose.yml`, `backend/dockerfile` |
| Servidor estático frontend | Apache httpd 2.4 (imagen oficial) | `docker-compose.yml:19` |

**No se encontró** ninguna base de datos relacional/NoSQL en el código (no hay SQLAlchemy, psycopg2, pymongo, etc. en imports ni en `requirements.txt`). Toda la persistencia es el diccionario en memoria `data_store` (`backend/app.py:17`).

## 5. Requisitos previos

- Docker y Docker Compose (recomendado), **o**
- Python 3.11 (las versiones de `geopandas`/`pyogrio` fijadas en `requirements.txt` se construyeron y probaron contra esta versión, según `backend/dockerfile:2`; no se verificó compatibilidad con otras versiones de Python).
- Un servidor de archivos estáticos para `frontend/` si no se usa Docker (ver sección de instalación).
- La geodatabase y la plantilla Excel ya están incluidas en `datos_geograficos/` en este repositorio (no se requiere descarga adicional para la demo de Betéitiva).

## 6. Instalación

Ver [INSTALLATION.md](./INSTALLATION.md) para el paso a paso completo, incluida configuración para alguien que nunca ha visto el proyecto.

## 7. Ejecución local (sin Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py            # Flask dev server, debug=True (backend/app.py:1037-1038), puerto 5000

# Frontend (en otra terminal, desde la raíz del repo)
cd frontend
python -m http.server 3000   # o cualquier servidor estático
```

⚠️ El bundle de producción (`frontend/static/js/main.31843331.js`) tiene **horneada (build-time)** la URL del backend `http://localhost:5000` (confirmado inspeccionando el bundle). Si el backend corre en otra URL, ver sección "Configuración" más abajo sobre `window.IPU_API_BASE`.

## 8. Ejecución con Docker

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:5000/healthz   # debe responder 204
curl http://localhost:3000/          # debe responder el index.html
```

Esto usa `docker-compose.yml` (raíz), que:

- Construye el backend desde `./backend/dockerfile` (`docker-compose.yml:3-5`).
- Monta `./datos_geograficos` como solo lectura en `/app/datos_geograficos` y define `GEODATA_DIR` (`docker-compose.yml:7-10`).
- Sirve `./frontend` como contenido estático con la imagen oficial `httpd:2.4`, habilitando `mod_rewrite` para que las rutas de React Router funcionen al recargar la página (`docker-compose.yml:19-24`, ver también `frontend/.htaccess:1-7`).

No construye nada de `frontend_source/` — es solo el contenido ya compilado de `frontend/`.

## 9. Configuración

No se encontró ningún archivo `.env` en el repositorio. Las variables de entorno realmente leídas por el código son:

| Variable | Dónde se usa | Por defecto | Obligatoria |
|---|---|---|---|
| `GEODATA_DIR` | `backend/modules/geografia.py:27` | `<repo>/datos_geograficos` (calculado relativo al archivo, `backend/modules/geografia.py:12`) | No |
| `GEODATA_GDB_PATH` | `backend/modules/geografia.py:21` | (ninguno; si no existe, cae a `GEODATA_DIR` y busca el primer `*.gdb`) | No |
| `SECRET_KEY` | `backend/app.py:997-999` | Llave heredada del código original, solo por compatibilidad — **debe sobreescribirse en producción**, ya quedó expuesta en este repositorio | Recomendada (no obligatoria por compatibilidad) |
| `USERS_FILE` | `backend/app.py:1005-1006` | `backend/users.json` (junto a `app.py`) | No (pero el archivo en sí sí es obligatorio, ver más abajo) |
| `REACT_APP_API` | Usada en `frontend_source/**` (p. ej. `frontend_source/requests/sendIPU.ts:6`) | — | Solo aplica si se **reconstruye** el frontend; el bundle ya compilado en `frontend/` no la lee en runtime (la variable de CRA se inyecta en tiempo de build). |

### Autenticación (`SECRET_KEY` y usuarios) — actualizado

Desde la refactorización de autenticación, `backend/app.py` **ya no contiene credenciales hardcodeadas**:

- `app.config['SECRET_KEY']` se lee de la variable de entorno `SECRET_KEY` (`backend/app.py:997-999`). Si no se define, usa el mismo valor que tenía el código original — se conserva solo por compatibilidad con despliegues existentes, pero **debe considerarse comprometido** porque estuvo en texto plano en este repositorio; genera uno nuevo con `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- Los usuarios/contraseñas se cargan desde un archivo JSON (`backend/app.py:1002-1021`, función `_load_users`), ubicado por defecto en `backend/users.json` y configurable con la variable `USERS_FILE`. Ese archivo **no se versiona en git** (ver `.gitignore`). La plantilla versionada es `backend/users.json.example`.
- Si `users.json` no existe, el backend falla al arrancar con un `FileNotFoundError` explícito que indica copiar `users.json.example` (`backend/app.py:1013-1018`) — comportamiento intencional para no arrancar con credenciales por defecto silenciosas.
- El login de invitado hardcodeado en el frontend (`frontend_source/components/LoginPage.tsx:54`) **no se modificó** en esta refactorización — sigue pendiente.

El mapa interactivo (`frontend/static/geo/geo-map.js:25,54-56,69-77`) sí permite cambiar la URL del backend **en runtime**, sin rebuild, mediante:
- `window.IPU_API_BASE` (definir antes de cargar el script, p. ej. en `frontend/index.html`), o
- `localStorage.setItem("ipuApiBase", "http://mi-backend:5000")`.

Esto **no afecta** las llamadas que hace el bundle de React (`main.31843331.js`), que siguen apuntando a la URL horneada en el build. Solo afecta las llamadas que hace `geo-map.js` directamente.

No existe archivo `.env.example` en el repo original; se generó uno en esta auditoría (ver sección 12).

## 10. Flujo de uso de la aplicación

1. El usuario abre `http://localhost:3000` y se autentica (`frontend_source/components/LoginPage.tsx`) contra `POST /login` (`backend/app.py:1009-1031`).
2. Diligencia parámetros generales (coeficiente de actualización, SMMLV, UVT, inflación esperada, predios proyectados, valores comerciales) — `frontend_source/components/Parameters.tsx` (no auditado en detalle, ver Architecture.md).
3. Carga la plantilla Excel (`frontend_source/components/ExcelReader.tsx`). El archivo se procesa **en el navegador** (no se sube el archivo binario al backend) y se transforma a JSON antes de enviarse a `POST /store-data` (`backend/app.py:24`).
4. El backend calcula proyecciones, agregados y (si hay datos de Año 2) la base proyectada, y devuelve un `data_id` (`backend/app.py:201-207`).
5. El navegador navega al dashboard (`/dashboard`) y consulta:
   - Avalúo Catastral Año 1 / Año 2 (mapas temáticos por aumento de avalúo).
   - Modificación de Tarifas Año 1 / Año 2 (creación de escenarios vía `POST /calculate/tariff/base` o `/projected`, mapa temático de predios afectados/no afectados).
6. El componente `geo-map.js` detecta automáticamente las respuestas de red relevantes (intercepta `XMLHttpRequest`/`fetch`) para saber cuándo refrescar cada mapa, sin que el resto del frontend tenga que integrarse explícitamente con él (`frontend/static/geo/geo-map.js:105-171`).

## 11. Capturas sugeridas (pendientes de agregar)

> No se encontraron capturas de pantalla en el repositorio. Se sugiere agregar, en una carpeta `docs/screenshots/`:
> 1. Pantalla de login.
> 2. Carga de Excel + parámetros.
> 3. Dashboard — pestaña Avalúo Catastral Año 1 (mapa temático con leyenda Q1–Q4).
> 4. Dashboard — pestaña Modificación de Tarifas Año 1 sin escenario (mapa base).
> 5. Dashboard — pestaña Modificación de Tarifas Año 1 con escenario aplicado (afectados/no afectados + resumen).

## 12. Solución de problemas frecuentes

| Síntoma | Causa probable | Evidencia / solución |
|---|---|---|
| `No se encontró una geodatabase .gdb` | `GEODATA_DIR` mal configurado o carpeta vacía | `backend/modules/geografia.py:30-32` lanza `FileNotFoundError` explícito |
| El mapa nunca se actualiza tras crear un escenario | El backend Flask sigue corriendo una versión vieja del código (el *reloader* de `debug=True` no siempre detecta todos los cambios) | Reiniciar el proceso de Flask manualmente |
| `Data ID not found` (404) al consultar el mapa o agregados | El backend se reinició y `data_store` (en memoria) se vació | Volver a cargar el Excel para obtener un `dataId` nuevo — es una limitación de diseño, no un bug |
| El frontend muestra 404 al recargar una ruta como `/dashboard` | El servidor estático no hace *fallback* a `index.html` | Usar Apache con `mod_rewrite` (como en Docker) o configurar el servidor estático elegido para SPA fallback; `frontend/.htaccess` solo aplica a Apache |
| El bundle de React sigue llamando a `http://localhost:5000` aunque el backend esté en otra URL | La URL está horneada en build-time en `main.31843331.js` | Reconstruir el frontend con `REACT_APP_API` correcto (requiere completar `frontend_source/`, ver Limitaciones) o exponer el backend en `localhost:5000` |
| Tarifa con valor `0` rechazada al crear un escenario | `if not tariff:` trata `0` como valor faltante | `backend/app.py:622` (Año 1) y línea equivalente en Año 2 — comportamiento actual del código, no documentado como intencional |

## 13. Consideraciones para despliegue

- **Sin persistencia real**: cualquier despliegue debe asumir que un reinicio del backend borra todos los datos cargados por los usuarios (`data_store`, `backend/app.py:17`). No apto para múltiples réplicas/balanceo de carga sin rediseñar el almacenamiento (hoy no funcionaría detrás de más de un proceso/worker de Gunicorn, porque cada worker tendría su propio `data_store`).
- **CORS abierto a cualquier origen**: `CORS(app)` sin restricciones (`backend/app.py:13`). Revisar antes de exponer a Internet.
- **Sin autenticación real en los endpoints de datos**: el JWT emitido por `/login` no es verificado por ningún otro endpoint (no se encontró `jwt.decode` ni revisión de `Authorization` fuera de `/login`). Cualquiera con acceso de red al backend puede llamar `/store-data`, `/geo/predios`, `/calculate/*` sin autenticarse.
- **Credenciales hardcodeadas en el código** (ver sección 14) — deben rotarse/externalizarse antes de cualquier despliegue público.
- **Tamaño de la geodatabase**: el diseño actual carga toda la GeoJSON del municipio en cada respuesta de `/geo/predios` (`backend/modules/geografia.py:141-183`); para municipios más grandes que Betéitiva esto no escala (ya señalado en `docs/INTEGRACION_GIS.md:143`).

## 14. Limitaciones conocidas

- `frontend_source/` está incompleto y **no se puede compilar** (`docs/INTEGRACION_GIS.md:7`); cualquier cambio de frontend en producción debe hacerse editando directamente los archivos estáticos en `frontend/` (como se hizo con `geo-map.js`).
- Estado en memoria (`data_store`) sin expiración, sin límite de tamaño y sin persistencia — crece indefinidamente mientras el proceso viva.
- Autenticación simplificada: usuarios y contraseñas en texto plano (ya no en el código fuente, sino en `backend/users.json`, no versionado); no hay control de roles, hashing de contraseñas, ni expiración de sesión más allá de 1 hora en el JWT (no verificado de todas formas).
- El `.gitignore`, `.env.example` y los tres documentos de esta auditoría (`README.md`, `INSTALLATION.md`, `ARCHITECTURE.md`) **no existían antes de esta auditoría** — fueron generados ahora.
- `backend/README.md` existe pero su contenido está corrupto/ilegible (problema de encoding, parece UTF-16 leído como UTF-8) — ver Checklist.
- Hay un directorio `backend/.git` vacío (sin objetos de Git reales) cuyo origen no pudo determinarse a partir del código; revisar antes de publicar para no confundir herramientas de Git con un submódulo.
- La cobertura de unión entre el Excel y la geodatabase no es total: documentado en `docs/INTEGRACION_GIS.md:56-62` (decenas de predios sin geometría o geometrías sin registro, para el dataset de Betéitiva).

## 15. Checklist antes de publicar en GitHub

- [x] ~~Rotar y externalizar `app.config['SECRET_KEY']`~~ — **hecho**: ahora se lee de la variable de entorno `SECRET_KEY` (`backend/app.py:997-999`). **Pendiente**: definir un valor nuevo en el entorno real antes de desplegar; el valor por defecto sigue siendo el que ya quedó expuesto.
- [x] ~~Eliminar o externalizar el diccionario `users`~~ — **hecho**: ahora se carga desde `backend/users.json` (gitignored), con plantilla en `backend/users.json.example` (`backend/app.py:1002-1021`).
- [ ] **Eliminar el login de invitado hardcodeado** `admin`/`admin12345` en el frontend (`frontend_source/components/LoginPage.tsx:54`) — **no se tocó** en esta refactorización.
- [ ] **Confirmar que `backend/users.json` real (con las contraseñas vigentes) nunca se commitea** — verificar con `git status` antes del primer commit que solo aparece `users.json.example`.
- [ ] **No subir `rescate_ipu/`** (≈524 MB de imágenes Docker exportadas `.tar`, más volcados de inspección de contenedores). No aporta valor para el desarrollo y excede ampliamente los límites razonables de un repositorio Git.
- [ ] **Confirmar si `datos_geograficos/15092_Betéitiva.gdb` y `Beteitiva_plantilla.xlsx` son datos públicos/abiertos** del municipio antes de publicarlos; si no hay certeza, no subirlos o usar Git LFS + un dataset de ejemplo anonimizado.
- [ ] **Eliminar archivos `*.sr.lock`** dentro de la geodatabase (bloqueos temporales de ArcGIS, no deben versionarse).
- [ ] **Eliminar `__pycache__/`** en `backend/`, `backend/modules/`, `backend/utils/` (bytecode compilado).
- [ ] **Revisar el directorio `backend/.git`** (vacío) y decidir si se elimina antes de inicializar el repositorio en la raíz.
- [ ] **Corregir o eliminar `backend/README.md`** (encoding corrupto, contenido ilegible).
- [ ] **Eliminar la línea inválida `v==1`** de `backend/requirements.txt` (no corresponde a ningún paquete real) y revisar las dependencias de Jupyter/matplotlib que no usa la aplicación (ver sección 16).
- [ ] Agregar `.gitignore` (generado en esta auditoría, ver sección 18).
- [ ] Agregar `.env.example` (generado en esta auditoría, ver sección 18) aunque hoy no haya secretos en variables de entorno — documenta `GEODATA_DIR`/`GEODATA_GDB_PATH`.
- [ ] Decidir explícitamente la licencia del proyecto (no se encontró archivo `LICENSE`).
- [ ] Revisar y quitar los `print()` de depuración en `backend/app.py` (líneas 278, 424, 425, 459, 496) antes de un release "limpio" (no es un riesgo de seguridad, pero ensucia logs de producción).

## 16. Dependencias (`requirements.txt`)

Existe `backend/requirements.txt`, pero **no refleja únicamente lo que la aplicación usa**: contiene paquetes de un entorno de trabajo interactivo (Jupyter/matplotlib) que no se importan en ningún módulo de `backend/`, y una línea inválida (`v==1`, línea 49) que no es un paquete real.

Se verificaron los imports reales con `grep` sobre `backend/app.py`, `backend/modules/*.py` y `backend/utils/*.py`. Resultado — dependencias de terceros realmente importadas:

```
flask, flask_cors, geopandas, jwt (PyJWT), numpy, openpyxl, pandas
```

Más `gunicorn` (no se importa en Python, pero es el servidor WSGI usado en `backend/dockerfile:19`) y `pyogrio` (motor de lectura usado por GeoPandas para `.gdb`, no se importa explícitamente pero es necesario para que `gpd.read_file` funcione con geodatabases de Esri).

Se propone un `requirements.txt` limpio en la sección 18. **No se inventaron versiones**: se conservaron las versiones ya fijadas en el archivo original para los paquetes que sí se usan.

## 17. Variables de entorno, configuración y datos geográficos — resumen

Ya cubierto en las secciones 9 y 16. Como resumen de "Datos geográficos utilizados" (punto explícito solicitado):

- Formato: **File Geodatabase de Esri (`.gdb`)**, leída con GeoPandas + motor Pyogrio.
- Ubicación esperada: `datos_geograficos/` en la raíz del repo (o la ruta que indique `GEODATA_DIR`/`GEODATA_GDB_PATH`).
- Capas leídas: `U_TERRENO_CTM12` (urbano) y `R_TERRENO_CTM12` (rural) — `backend/modules/geografia.py:13-16`.
- CRS de origen: el de la geodatabase (MAGNA CTM12 según `docs/INTEGRACION_GIS.md:35`); se reproyecta a `EPSG:4326` (`backend/modules/geografia.py:17,51`).
- La geometría se simplifica con tolerancia `0.00001` para reducir el tamaño de la respuesta web (`backend/modules/geografia.py:52`).
- Se cachea en memoria con `@lru_cache(maxsize=1)` tras la primera lectura (`backend/modules/geografia.py:36`) — si se cambia el archivo `.gdb` en disco, hay que reiniciar el backend para que se note.

## 18. Archivos generados en esta auditoría

Ver también [INSTALLATION.md](./INSTALLATION.md) y [ARCHITECTURE.md](./ARCHITECTURE.md).

- `README.md` (este archivo).
- `INSTALLATION.md`.
- `ARCHITECTURE.md`.
- `.gitignore`.
- `.env.example`.
- `backend/requirements.txt` — depurado (se eliminaron dependencias no usadas y la línea inválida `v==1`; se conservó todo lo demás).

Ninguno de estos archivos existía previamente en el repositorio (se verificó con búsquedas de archivo antes de crearlos).
