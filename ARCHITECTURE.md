# Arquitectura del Sistema - IPU Simulador

## Visión general

IPU es una aplicación web para el análisis y simulación del Impuesto Predial Unificado (IPU). El sistema permite cargar información catastral desde archivos Excel, generar proyecciones de avalúo, simular cambios tarifarios y visualizar el impacto de estos escenarios mediante mapas interactivos.

La solución está compuesta por tres elementos principales:

* Frontend desarrollado en React.
* Backend desarrollado en Flask.
* Módulo geográfico basado en geodatabases (File Geodatabase de Esri).

## Arquitectura general

```text
Usuario
   │
   ▼
Frontend (React)
   │
   ├── Carga y procesamiento inicial del Excel
   ├── Visualización de resultados
   └── Gestión de escenarios
   │
   ▼
Backend (Flask)
   │
   ├── Procesamiento de información catastral
   ├── Simulación de avalúos
   ├── Simulación de tarifas
   ├── Generación de indicadores
   └── Construcción de GeoJSON
   │
   ▼
Geodatabase (.gdb)
```

## Componentes principales

### Frontend

El frontend es una aplicación React encargada de:

* Cargar y validar archivos Excel.
* Convertir la información a estructuras JSON.
* Invocar los servicios del backend.
* Mostrar resultados tabulares y gráficos.
* Administrar escenarios de simulación.
* Integrar el componente cartográfico.

La comunicación con el backend se realiza mediante solicitudes HTTP utilizando una URL base configurable mediante variables de entorno.

### Módulo cartográfico

El mapa se implementa mediante el archivo `geo-map.js`, que funciona de manera independiente al ciclo de vida de React.

Sus responsabilidades incluyen:

* Solicitar información geográfica al backend.
* Construir visualizaciones SVG.
* Aplicar simbología temática.
* Mostrar información detallada de cada predio.
* Actualizar automáticamente la visualización cuando se generan nuevos escenarios.

Actualmente existen cuatro contextos principales de visualización:

* Avalúo Año 1
* Avalúo Año 2
* Tarifa Año 1
* Tarifa Año 2

### Backend

El backend está construido sobre Flask y expone una API REST encargada de:

* Recibir información procesada desde el frontend.
* Generar cálculos de avalúo.
* Aplicar escenarios tarifarios.
* Calcular indicadores agregados.
* Construir GeoJSON para la visualización geográfica.

La información procesada se almacena temporalmente en memoria utilizando un identificador único (`dataId`) que permite relacionar todas las consultas posteriores con el conjunto de datos cargado por el usuario.

## Flujo de carga de información

1. El usuario selecciona una plantilla Excel.
2. El frontend procesa el archivo localmente.
3. El archivo se transforma en estructuras JSON.
4. Se envía la información al endpoint `/store-data`.
5. El backend genera las proyecciones iniciales.
6. Se crea un identificador único (`dataId`).
7. Los resultados quedan disponibles para consultas posteriores.

El archivo Excel nunca es almacenado directamente en el backend; únicamente se transmite la información ya estructurada.

## Flujo de visualización geográfica

Cuando el usuario solicita una visualización:

1. El frontend invoca `/geo/predios`.
2. El backend recupera los datos asociados al `dataId`.
3. Se cargan las geometrías desde la geodatabase.
4. Se realiza la unión entre geometría y atributos mediante el número predial.
5. Se construye un GeoJSON.
6. El GeoJSON es enviado al navegador.
7. El mapa genera la representación visual correspondiente.

Las geometrías se cargan una sola vez por proceso y permanecen en caché para mejorar el rendimiento.

## Simulación de avalúos

### Año 1

Permite recalcular avalúos utilizando diferentes coeficientes de actualización.

Los resultados incluyen:

* Avalúo base.
* Avalúo actualizado.
* Variación absoluta.
* Variación porcentual.

### Año 2

Permite recalcular avalúos utilizando parámetros de inflación y actualización definidos por el usuario.

Los resultados se utilizan tanto para análisis estadístico como para representación cartográfica.

## Simulación de tarifas

El sistema permite generar escenarios tarifarios utilizando filtros sobre:

* Zona.
* Destinación económica.
* Estrato.
* Área.
* Avalúo.
* Rangos en UVT.
* Rangos en SMMLV.

Al crear un escenario:

1. Se identifica el conjunto de predios afectados.
2. Se aplica la nueva tarifa.
3. Se recalcula la liquidación.
4. Se generan indicadores agregados.
5. Se almacena un escenario activo asociado al `dataId`.
6. El mapa actualiza automáticamente su representación.

Actualmente cada contexto mantiene únicamente el último escenario generado.

## Datos geográficos

La visualización utiliza geodatabases de Esri (.gdb) suministradas externamente al proyecto.

Las capas utilizadas corresponden a:

* U_TERRENO_CTM12
* R_TERRENO_CTM12

Las geometrías son transformadas a EPSG:4326 para su representación en el navegador.

Los datos geográficos no se distribuyen dentro del repositorio.

## Seguridad y autenticación

El sistema implementa autenticación basada en JWT.

Los usuarios se cargan desde un archivo externo de configuración (`users.json`), excluido del repositorio.

La llave utilizada para la firma de tokens se configura mediante variables de entorno.

Actualmente la autenticación controla el acceso a la interfaz de usuario. Cualquier fortalecimiento futuro deberá considerar la validación explícita de tokens en los endpoints del backend.

## Persistencia

La aplicación no utiliza una base de datos relacional.

Toda la información procesada se mantiene en memoria durante la ejecución del servidor.

Si el backend se reinicia:

* Se pierden los datos cargados.
* Se pierden los escenarios generados.
* Es necesario volver a cargar la información.

## Documentación relacionada

* README.md
* INSTALLATION.md
* docs/INTEGRACION_GIS.md
