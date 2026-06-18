# IPU - Simulador del Impuesto Predial Unificado

## Descripción

IPU es una herramienta web para apoyar el análisis y la simulación del Impuesto Predial Unificado (IPU) en municipios colombianos.

La aplicación permite cargar información catastral desde una plantilla de Excel, generar proyecciones de avalúo, evaluar escenarios de modificación de tarifas y visualizar los resultados mediante mapas interactivos.

El objetivo del sistema es facilitar el análisis de impacto de diferentes escenarios tributarios antes de su implementación. La herramienta no reemplaza los procesos oficiales de liquidación del impuesto.

---

## Funcionalidades principales

* Carga de información catastral desde archivos Excel.
* Proyección de avalúos para Año 1 y Año 2.
* Simulación de escenarios de modificación de tarifas.
* Visualización geográfica de predios mediante mapas interactivos.
* Análisis del impacto de cambios en avalúo y liquidación.
* Resúmenes estadísticos y agregados para apoyar la toma de decisiones.

---

## Arquitectura

El sistema está compuesto por tres componentes principales:

* **Frontend:** interfaz web desarrollada en React y servida como contenido estático.
* **Backend:** API desarrollada en Flask encargada del procesamiento de datos y cálculos.
* **Datos geográficos:** geodatabases en formato Esri File Geodatabase (.gdb) utilizadas para la representación espacial de los predios.

Actualmente la información procesada se mantiene en memoria durante la ejecución de la aplicación.

---

## Estructura del proyecto

```text
.
├── backend/                # API Flask
├── frontend/               # Aplicación web compilada
├── frontend_source/        # Código fuente de referencia
├── docs/                   # Documentación técnica
├── datos_geograficos/      # Datos geográficos (no incluidos)
├── docker-compose.yml
├── README.md
├── INSTALLATION.md
└── ARCHITECTURE.md
```

---

## Requisitos

### Opción recomendada

* Docker
* Docker Compose

### Ejecución sin Docker

* Python 3.11
* Dependencias definidas en `backend/requirements.txt`

---

## Configuración de datos geográficos

Los datos geográficos no se incluyen en este repositorio.

Antes de ejecutar la aplicación, debe ubicarse una geodatabase compatible dentro de la carpeta:

```text
datos_geograficos/
```

La aplicación buscará automáticamente la geodatabase disponible para generar la visualización espacial de los predios.

---

## Ejecución con Docker

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

Verificar que los servicios estén disponibles:

```bash
docker compose ps
```

Acceder a:

```text
Frontend:
http://localhost:3000

Backend:
http://localhost:5000
```

Para detener los servicios:

```bash
docker compose down
```

---

## Ejecución local

Backend:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
python -m http.server 3000
```

---

## Flujo básico de uso

1. Ingresar a la aplicación.
2. Configurar los parámetros generales de simulación.
3. Cargar la plantilla Excel con la información catastral.
4. Generar las proyecciones de avalúo.
5. Crear escenarios de modificación de tarifas.
6. Analizar los resultados en tablas, indicadores y mapas interactivos.

---

## Limitaciones conocidas

* La información procesada se almacena en memoria durante la ejecución de la aplicación.
* Si el backend se reinicia, es necesario volver a cargar los datos.
* Los datos geográficos deben ser suministrados externamente.
* El proyecto está orientado al análisis y simulación, no a la liquidación oficial del impuesto.

---

## Documentación adicional

* `INSTALLATION.md`: guía detallada de instalación.
* `ARCHITECTURE.md`: descripción técnica de la arquitectura y componentes internos.
* `docs/`: documentación complementaria del proyecto.
