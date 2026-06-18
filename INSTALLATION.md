# Guía de Instalación - IPU Simulador

Esta guía describe los pasos necesarios para ejecutar la aplicación en un entorno local.

## Requisitos

La forma recomendada de ejecutar el proyecto es mediante Docker.

### Opción recomendada

* Docker
* Docker Compose

### Opción alternativa

* Python 3.11
* Entorno virtual de Python

## Obtener el proyecto

Clona el repositorio y ubícate en la carpeta raíz:

```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

## Configuración inicial

### Usuarios de acceso

Crea el archivo de usuarios a partir de la plantilla incluida:

```bash
cp backend/users.json.example backend/users.json
```

Luego edita el archivo y configura las credenciales que utilizarás para acceder a la aplicación.

### Clave de autenticación

Opcionalmente puedes definir una clave propia para la firma de tokens JWT:

```bash
export SECRET_KEY=<tu_clave>
```

Si no se define, el sistema utilizará la configuración por defecto.

## Datos geográficos

Los datos geográficos no se distribuyen junto con el código fuente.

Antes de iniciar la aplicación debes ubicar una geodatabase compatible dentro de la carpeta:

```text
datos_geograficos/
```

La aplicación detectará automáticamente la geodatabase disponible y la utilizará para construir las visualizaciones geográficas.

## Ejecución con Docker

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

El proceso construirá las imágenes necesarias y levantará los servicios del sistema.

### Verificar el estado de los servicios

```bash
docker compose ps
```

### Verificar el backend

```bash
curl -i http://localhost:5000/healthz
```

Debe responder:

```text
204 NO CONTENT
```

### Acceder a la aplicación

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:5000
```

### Ver logs

Backend:

```bash
docker compose logs backend
```

Frontend:

```bash
docker compose logs frontend
```

### Detener los servicios

```bash
docker compose down
```

## Ejecución sin Docker

### Crear entorno virtual

```bash
cd backend

python -m venv .venv
```

Activar el entorno:

Windows:

```bash
.venv\Scripts\activate
```

Linux / MacOS:

```bash
source .venv/bin/activate
```

### Instalar dependencias

```bash
pip install -r requirements.txt
```

### Ejecutar backend

```bash
python app.py
```

El backend quedará disponible en:

```text
http://localhost:5000
```

### Ejecutar frontend

En otra terminal:

```bash
cd frontend
python -m http.server 3000
```

Accede a:

```text
http://localhost:3000
```

## Primer uso

1. Inicia sesión con una de las credenciales configuradas en `backend/users.json`.
2. Completa los parámetros generales de simulación.
3. Carga una plantilla Excel compatible.
4. Envía la información para generar el conjunto de datos.
5. Explora los módulos de:

   * Avalúo Catastral Año 1
   * Avalúo Catastral Año 2
   * Modificación de Tarifas Año 1
   * Modificación de Tarifas Año 2
6. Utiliza los mapas para analizar el impacto de los escenarios generados.

## Variables de configuración

La aplicación admite las siguientes variables de entorno:

| Variable         | Descripción                                 |
| ---------------- | ------------------------------------------- |
| SECRET_KEY       | Clave utilizada para la firma de tokens JWT |
| USERS_FILE       | Ruta al archivo de usuarios                 |
| GEODATA_DIR      | Directorio que contiene la geodatabase      |
| GEODATA_GDB_PATH | Ruta directa a una geodatabase específica   |

### Ejemplo

```bash
export GEODATA_DIR=/ruta/a/datos_geograficos
```

o

```bash
export GEODATA_GDB_PATH=/ruta/a/municipio.gdb
```

## Solución de problemas

### El backend no encuentra la geodatabase

Verifica que exista una geodatabase válida dentro de la carpeta configurada en `datos_geograficos`.

### Error instalando dependencias geográficas

Las librerías geoespaciales pueden presentar dificultades de instalación en algunos sistemas operativos. En estos casos se recomienda utilizar la ejecución mediante Docker.

### El mapa no muestra información

Verifica que:

* Los datos hayan sido cargados correctamente.
* Exista una geodatabase compatible.
* El backend esté respondiendo correctamente.
* El navegador no esté utilizando archivos en caché.

### No es posible iniciar sesión

Verifica que:

* El archivo `backend/users.json` exista.
* Las credenciales configuradas sean correctas.
* El frontend esté apuntando al backend correcto.

## Limpieza del entorno

Si utilizas Docker:

```bash
docker compose down
```

Si utilizas entorno virtual:

```bash
rm -rf backend/.venv
```

y elimina los directorios temporales generados durante la ejecución.
