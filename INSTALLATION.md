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

Los datos geográficos no se distribuyen junto con el código fuente y son **opcionales**.

La aplicación ya no busca ninguna geodatabase interna ni carpeta local (`datos_geograficos/` no se utiliza). La base geográfica `.gdb` se carga manualmente desde la interfaz, comprimida en un archivo `.zip`:

1. Carga la plantilla Excel y envíala normalmente.
2. En el panel del mapa, usa el campo "Cargar base geográfica (opcional)" para subir un `.zip` que contenga la carpeta `.gdb` (con las capas `U_TERRENO_CTM12` y `R_TERRENO_CTM12`, cada una con la columna `CODIGO`).
3. Si no cargas ningún `.zip`, los resultados y cálculos funcionan igual; el mapa simplemente mostrará un mensaje indicando que no hay base geográfica cargada.

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

La geodatabase ya no se configura mediante variables de entorno: se carga manualmente desde la interfaz (ver sección "Datos geográficos").

## Solución de problemas

### Error instalando dependencias geográficas

Las librerías geoespaciales pueden presentar dificultades de instalación en algunos sistemas operativos. En estos casos se recomienda utilizar la ejecución mediante Docker.

### El mapa no muestra información

Esto es esperado si no has cargado un `.zip` con la geodatabase: el mapa mostrará el mensaje "No se puede mostrar el mapa porque no se cargó una base de datos geográfica.". Si cargaste un `.zip` y aun así no ves el mapa, verifica que:

* El `.zip` contenga una carpeta `.gdb` con las capas `U_TERRENO_CTM12` y `R_TERRENO_CTM12`, cada una con la columna `CODIGO`.
* La carga a `/geo/upload` haya respondido con éxito (revisa la pestaña Network del navegador).
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
