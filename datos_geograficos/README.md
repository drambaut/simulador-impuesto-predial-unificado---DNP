# datos_geograficos

Esta carpeta contiene los archivos geográficos y las plantillas de datos utilizadas por la aplicación para generar las visualizaciones espaciales de los predios.

Los datos no se distribuyen junto con el repositorio y deben ser suministrados por el usuario o la entidad responsable de la información.

## Estructura esperada

```text
datos_geograficos/
├── <municipio>.gdb
├── <plantilla>.xlsx
└── ...
```

### Geodatabase

La aplicación requiere una geodatabase en formato Esri File Geodatabase (`.gdb`) que contenga la información espacial de los predios.

La geodatabase debe incluir las siguientes capas:

* `U_TERRENO_CTM12` (predios urbanos)
* `R_TERRENO_CTM12` (predios rurales)

Además, ambas capas deben contener un campo denominado:

```text
CODIGO
```

Este campo se utiliza para relacionar las geometrías con la información cargada desde el archivo Excel.

### Plantilla Excel

La plantilla Excel contiene la información catastral y tributaria utilizada durante las simulaciones.

La aplicación espera las siguientes hojas:

| Hoja                    | Descripción                                          |
| ----------------------- | ---------------------------------------------------- |
| `base_catastral_0`      | Información catastral para Año 1                     |
| `base_catastral_1`      | Información catastral para Año 2                     |
| `base_liquidacion_0`    | Información de liquidación para Año 1                |
| `base_liquidacion_1`    | Información de liquidación para Año 2                |
| `destinacion_economica` | Equivalencias y clasificación de destinos económicos |

Las hojas catastrales deben incluir, como mínimo:

```text
NUMERO_PREDIAL
NUMERO_ORDEN
DESTINACION_ECONOMICA
AREA_TERRENO
AREA_CONSTRUIDA
AVALÚO
```

Las hojas de liquidación deben incluir:

```text
NUMERO_PREDIAL
TARIFA
ESTRATO
VALOR_LIQUIDADO
PAGO
```

## Cómo utiliza estos archivos la aplicación

Durante la ejecución:

1. El usuario carga una plantilla Excel desde la interfaz web.
2. El backend utiliza la geodatabase disponible para obtener las geometrías de los predios.
3. La información del Excel se relaciona con la información espacial mediante el identificador predial.
4. Se genera un GeoJSON que posteriormente es utilizado para construir los mapas interactivos.

La geodatabase se carga una sola vez por proceso y permanece en memoria para mejorar el rendimiento. Si se reemplaza el archivo `.gdb`, es necesario reiniciar el backend para que los cambios sean reconocidos.

## Utilizar otra geodatabase

Para trabajar con otro municipio o conjunto de datos:

1. Copia la geodatabase correspondiente dentro de esta carpeta.
2. Verifica que existan las capas requeridas.
3. Verifica que el campo `CODIGO` sea compatible con el campo `NUMERO_PREDIAL` de la plantilla Excel.
4. Reinicia el backend.

Opcionalmente, puede configurarse una geodatabase específica mediante las variables de entorno documentadas en el archivo `.env.example`.

## Importante

Los datos geográficos y las plantillas de trabajo no forman parte del repositorio.

Por razones de tamaño, gestión documental y manejo de información institucional, los archivos utilizados durante el desarrollo fueron excluidos del control de versiones.

Si necesitas ejecutar la aplicación, solicita los datos correspondientes al administrador del proyecto o a la entidad responsable de la información.
