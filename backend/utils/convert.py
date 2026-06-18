import pandas as pd
import numpy as np
import os
import json    

def excel_to_json(file_path, sheet_names, output_file):
    """
    Convierte hojas específicas de un archivo Excel a formato JSON y guarda todas las hojas en un solo archivo JSON.

    Parámetros:
        file_path (str): Ruta al archivo Excel.
        sheet_names (list): Lista de nombres de hojas o índices de hojas a convertir.
        output_file (str): Ruta completa del archivo JSON de salida.
    """
    all_data = {}  # Diccionario para almacenar todas las hojas

    # Leer las hojas específicas y agregarlas al diccionario
    for sheet in sheet_names:
        try:
            # Leer la hoja de Excel
            df = pd.read_excel(file_path, sheet_name=sheet)
            df = df.replace({np.nan: None})
            # Convertir el DataFrame a lista de diccionarios
            data = df.to_dict(orient='records')
            # Agregar los datos al diccionario general con el nombre de la hoja como clave
            all_data[sheet] = data
        except Exception as e:
            print(f"Error al convertir la hoja '{sheet}': {e}")

    # Guardar el diccionario completo como un solo archivo JSON
    try:
        with open(output_file, 'w', encoding='utf-8') as json_file:
            json.dump(all_data, json_file, ensure_ascii=False, indent=4)
        print(f"Datos guardados correctamente en '{output_file}'")
    except Exception as e:
        print(f"Error al guardar el archivo JSON: {e}")

# Ejemplo de uso
ruta_excel = 'ruta/a/tu/archivo.xlsx'
nombres_hojas = ['Hoja1', 'Hoja2']  # Puedes usar nombres de hojas o sus índices (0, 1, 2, ...)


if __name__ == "__main__":
    ruta_excel = os.getcwd() + "/data/bases_ejemplo_app_2.xlsx"
    nombres_hojas = ['liquidacion_0', 'liquidacion_1', 'base_catastral_0', 'base-catastral_1']
    archivo_salida = os.getcwd() + '/data/datos_ipu.json'

    excel_to_json(ruta_excel, nombres_hojas, archivo_salida)
