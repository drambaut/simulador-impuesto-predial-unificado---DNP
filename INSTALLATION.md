# Guía de instalación — IPU Simulador

Esta guía asume que **nunca has visto el proyecto**. Sigue los pasos en orden. Cada paso indica cómo verificar que funcionó antes de continuar.

## 0. Antes de empezar

Verifica que tienes:

- Git.
- **Opción A (recomendada): Docker + Docker Compose.**
- **Opción B (sin Docker): Python 3.11** y algún servidor de archivos estáticos (puede ser tan simple como `python -m http.server`).

No necesitas Node.js/npm para ejecutar la aplicación tal como está en el repositorio: el frontend en `frontend/` ya viene **compilado**. Node.js solo sería necesario si quisieras reconstruir el frontend desde `frontend_source/`, y eso **no es posible hoy** porque ese código fuente está incompleto (falta `package.json`, ver `docs/INTEGRACION_GIS.md:7`).

## 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd <carpeta-del-repositorio>
```

## 2. Verificar los datos geográficos

El repositorio debe incluir, dentro de `datos_geograficos/`:

- Una carpeta `*.gdb` (geodatabase de Esri). En este proyecto: `15092_Betéitiva.gdb`.
- Un archivo Excel de ejemplo: `Beteitiva_plantilla.xlsx`.

```bash
ls datos_geograficos/
```

Si esta carpeta no existe o está vacía, el backend fallará al pedir el mapa con el error `No se encontró una geodatabase .gdb en <ruta>` (`backend/modules/geografia.py:30-32`). Esta auditoría **no puede confirmar** si estos archivos deben distribuirse junto con el código o por separado (ver `README.md`, sección "Checklist"); si tu copia del repositorio no los incluye, debes obtenerlos por otro medio antes de continuar.

## 3A. Instalación con Docker (recomendada)

### 3A.0. Configurar autenticación (obligatorio)

El `dockerfile` del backend hace `COPY . .` (`backend/dockerfile:15`), así que `users.json` debe existir **antes** de construir la imagen:

```bash
cp backend/users.json.example backend/users.json
# Edita backend/users.json con las credenciales reales.
```

Si quieres definir una `SECRET_KEY` propia para el contenedor, agrégala como variable de entorno del servicio `backend` en `docker-compose.yml` (hoy no está definida ahí; sin ella se usa el valor por defecto heredado, ver sección 9 de `README.md`).

### 3A.1. Construir y levantar los servicios

Desde la raíz del repositorio (donde está `docker-compose.yml`):

```bash
docker compose up -d --build
```

Esto:
1. Construye la imagen del backend desde `backend/dockerfile` (Python 3.11-slim + dependencias de `backend/requirements.txt` + `gunicorn`).
2. Levanta el backend en `http://localhost:5000`.
3. Levanta el frontend (servido por Apache httpd) en `http://localhost:3000`, esperando a que el backend pase su *healthcheck* (`docker-compose.yml:28-30`).

### 3A.2. Verificar que todo levantó bien

```bash
docker compose ps
```

Ambos servicios deben mostrar estado `healthy` (puede tardar hasta ~30s por el intervalo del healthcheck).

```bash
curl -i http://localhost:5000/healthz
```

Debe responder `HTTP/1.1 204 NO CONTENT` (`backend/app.py:19-21`).

```bash
curl -i http://localhost:3000/
```

Debe responder `200 OK` con el HTML de `frontend/index.html`.

### 3A.3. Ver logs si algo falla

```bash
docker compose logs backend
docker compose logs frontend
```

### 3A.4. Detener

```bash
docker compose down
```

## 3B. Instalación sin Docker

### 3B.0. Configurar autenticación (obligatorio desde el refactor de credenciales)

El backend ya **no** trae usuarios hardcodeados en el código. Antes de arrancarlo:

```bash
cd backend
cp users.json.example users.json
# Edita users.json con las credenciales reales que vayas a usar.
```

Si `backend/users.json` no existe, el backend falla al arrancar con un error explícito (`backend/app.py:1013-1018`) indicando este mismo paso.

Opcionalmente, define una `SECRET_KEY` propia (si no la defines, se usa un valor por defecto heredado que ya quedó expuesto en el historial del proyecto — válido para pruebas locales, no para producción):

```bash
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
```

### 3B.1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
```

> **Nota sobre `geopandas`/`pyogrio`**: estos paquetes dependen de librerías nativas (GDAL). Las versiones fijadas en `requirements.txt` (`geopandas==1.0.1`, `pyogrio==0.10.0`) se construyeron y probaron bajo Python 3.11 en Linux (imagen `python:3.11-slim`, `backend/dockerfile:2`). En Windows o con otra versión de Python, la instalación de estos dos paquetes es el punto más probable de fallo; si falla, usa la opción Docker.

Ejecutar el servidor:

```bash
python app.py
```

Por defecto corre con el servidor de desarrollo de Flask en modo `debug=True`, puerto `5000` (`backend/app.py:1037-1038`). Verifica:

```bash
curl -i http://localhost:5000/healthz
```

### 3B.2. Frontend

En **otra terminal**, desde la raíz del repositorio:

```bash
cd frontend
python -m http.server 3000
```

Abre `http://localhost:3000` en el navegador.

⚠️ Si navegas directamente a una ruta como `http://localhost:3000/dashboard` y recargas la página, obtendrás un 404, porque `python -m http.server` no hace *fallback* a `index.html` para rutas de React Router. Esto solo está resuelto para Apache (`frontend/.htaccess`). Si necesitas navegación profunda con recarga, usa un servidor estático que soporte modo SPA (por ejemplo `npx serve -s frontend`) o usa la opción Docker.

## 4. Primer uso

1. Abre `http://localhost:3000`.
2. En la pantalla de login, usa una de las credenciales definidas en `backend/app.py:993-1007`, o el botón "Ingresar como Invitado" (usuario `admin` / contraseña `admin12345`, hardcodeado en `frontend_source/components/LoginPage.tsx:54`).

   > ⚠️ Estas credenciales están en el código fuente en texto plano. Si vas a usar este proyecto más allá de una prueba local, cámbialas primero (ver `README.md`, sección 14-15).

3. Acepta los términos de servicio (checkbox obligatorio, `frontend_source/components/LoginPage.tsx:107-124`).
4. Diligencia los parámetros generales (coeficiente, SMMLV, UVT, inflación esperada, etc.).
5. Carga `datos_geograficos/Beteitiva_plantilla.xlsx` como plantilla de prueba.
6. Haz clic en "Enviar". Si todo funciona, serás redirigido al dashboard.
7. Explora las pestañas: Avalúo Catastral (Año 1 / Año 2) y Modificación de Tarifas (Año 1 / Año 2). Cada una debería mostrar un mapa con un panel lateral de información del predio seleccionado.

Si el paso 6 falla, revisa la consola del navegador y los logs del backend — la causa más común es una plantilla Excel con columnas/hojas que no coinciden con lo esperado (`frontend_source/config/settings.ts:42-124`).

## 5. Variables de entorno / configuración avanzada

No existe (ni existía) un archivo `.env` en este proyecto. Si necesitas apuntar el backend a una geodatabase distinta o en otra ruta, exporta antes de levantar el backend:

```bash
export GEODATA_DIR=/ruta/a/carpeta/con/gdb       # backend/modules/geografia.py:27
# o, para apuntar a un .gdb específico sin depender del nombre de carpeta:
export GEODATA_GDB_PATH=/ruta/exacta/archivo.gdb  # backend/modules/geografia.py:21
```

Con Docker, esto ya está resuelto vía `docker-compose.yml:7-10` (monta `./datos_geograficos` y define `GEODATA_DIR`).

Se incluye un archivo `.env.example` en la raíz como referencia, aunque hoy el backend no usa `python-dotenv` ni carga `.env` automáticamente — estas variables deben exportarse manualmente en el entorno o agregarse al `docker-compose.yml` si decides adoptar un flujo basado en `.env`.

## 6. Desinstalar / limpiar

```bash
docker compose down -v       # detiene y elimina contenedores (sin -v no borra volúmenes, aquí no hay volúmenes nombrados)
rm -rf backend/.venv backend/__pycache__ backend/modules/__pycache__ backend/utils/__pycache__
```

## 7. Problemas comunes durante la instalación

Ver la tabla "Solución de problemas frecuentes" en [README.md](./README.md). Específicamente para instalación:

- **`ModuleNotFoundError` al instalar dependencias geoespaciales**: usa Docker en vez de instalación local en Windows/Mac.
- **El backend arranca pero `/geo/predios` da 500 o `FileNotFoundError`**: revisa que `datos_geograficos/` tenga un `.gdb` válido y que la variable `GEODATA_DIR` (si la defines) apunte a la carpeta correcta, no al archivo `.gdb` directamente.
- **El login no funciona con ninguna credencial conocida**: revisa que el frontend esté apuntando al backend correcto. El bundle de producción de React tiene horneada la URL `http://localhost:5000`; si tu backend corre en otro host/puerto, el login fallará silenciosamente porque las llamadas van a la URL equivocada.
