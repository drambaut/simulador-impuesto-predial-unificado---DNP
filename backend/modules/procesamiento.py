import pandas as pd
import numpy as np
import os
from flask import jsonify
from openpyxl.styles.builtins import total
from modules import agregados


def procesamiento_catastral(df_catastral_y):
    df_catastral_y = df_catastral_y.iloc[:, :6]
    df_catastral_y['NUMERO_ORDEN'] = df_catastral_y['NUMERO_ORDEN'].astype(int)
    df_catastral_y = df_catastral_y[df_catastral_y['NUMERO_ORDEN'] == 1]
    df_catastral_y = df_catastral_y.drop(columns=['NUMERO_ORDEN'])

    return df_catastral_y

def transformacion_antes_actualizacion(df_liquidacion_y, df_catastral_y, destino_economico_data):
    df_liquidacion_y = df_liquidacion_y.drop_duplicates(subset='NUMERO_PREDIAL')
    df_proyeccion = pd.merge(df_catastral_y, df_liquidacion_y, on='NUMERO_PREDIAL', how='left')
    df_proyeccion['ZONA'] = df_proyeccion['NUMERO_PREDIAL'].apply(lambda x: x[5:7])
    df_proyeccion['ZONA'] = pd.to_numeric(df_proyeccion['ZONA'], errors='coerce').fillna(0).astype(int)
    df_proyeccion['ZONA'] = df_proyeccion['ZONA'].apply(lambda x: 0 if x > 1 else x)
    df_proyeccion['CONDICION_PROPIEDAD'] = df_proyeccion['NUMERO_PREDIAL'].apply(lambda x: x[21:22])
    df_proyeccion['CONDICION_PROPIEDAD'] = pd.to_numeric(df_proyeccion['CONDICION_PROPIEDAD'], errors='coerce').fillna(0).astype(int)
    df_proyeccion['AREA_HECTAREAS'] = df_proyeccion['AREA_TERRENO'] * 0.0001

    df_proyeccion['DESTINACION_ECONOMICA'] = (df_proyeccion['DESTINACION_ECONOMICA'].astype(str).str.strip())

    # Step 4: Convert destino_economico_data dictionary to DataFrame
    destino_economico_df = pd.DataFrame(list(destino_economico_data.items()), columns=['DESTINACION_ECONOMICA', 'EQUIVALENCIA_DESTINO'])

    destino_economico_df['EQUIVALENCIA_DESTINO'] = (
        destino_economico_df['EQUIVALENCIA_DESTINO']
        .astype(str)
        .str.upper()
        .str.replace('_', ' ', regex=False)
        .str.strip()
    )

    # Step 5: Merge with df_proyeccion on 'DESTINACION_ECONOMICA'
    df_proyeccion = pd.merge(df_proyeccion, destino_economico_df, on='DESTINACION_ECONOMICA', how='left')

    # Fill NaN values in critical columns
    df_proyeccion.fillna({
        'TARIFA': 0,
        'VALOR_LIQUIDADO': 0,
        'ESTRATO': 0,
        'EQUIVALENCIA_DESTINO': "NO EQUIVALENCIA"
    }, inplace=True)

    return df_proyeccion

def transformacion_desp_actualizacion(df_proyeccion_y):
    df_proyeccion_y = df_proyeccion_y[~((df_proyeccion_y['CONDICION_PROPIEDAD'] > 1) & (df_proyeccion_y['CONDICION_PROPIEDAD'] < 6))].reset_index(drop=True)
    return df_proyeccion_y

def modal_urbana_rural(df_proyeccion):
    tarifa_modal_urbana = df_proyeccion[df_proyeccion['ZONA'] == 1]['TARIFA'].mode().iloc[0] if not df_proyeccion[df_proyeccion['ZONA'] == 1]['TARIFA'].mode().empty else None
    tarifa_modal_rural = df_proyeccion[df_proyeccion['ZONA'] == 0]['TARIFA'].mode().iloc[0] if not df_proyeccion[df_proyeccion['ZONA'] == 0]['TARIFA'].mode().empty else None
    return {
        "tarifa_modal_urbana": tarifa_modal_urbana / 1000,
        "tarifa_modal_rural": tarifa_modal_rural / 1000
    }

def valor_avaluo_actualizado_1(x, FACTOR):
    if pd.isna(FACTOR['factor_pry_urbano']).any() or pd.isna(FACTOR['factor_pry_rural']).any():
        return None
    return x['AVALUO'] * FACTOR['factor_pry_urbano'] if x['ZONA'] == 1 else x['AVALUO'] * FACTOR['factor_pry_rural']

def valor_liquidado_actualizado_1(x):
    dest = x.get('EQUIVALENCIA_DESTINO', '') or ''
    # chequeo por substring en lugar de igualdad estricta
    lote_cond = (
        "LOTE URBANIZABLE NO URBANIZADO" in dest
        or "LOTE URBANIZADO NO CONSTRUIDO" in dest
    )

    if lote_cond and x['ZONA'] == 1:
        if pd.notna(x['TARIFA']) and pd.notna(x['AVALUO_ACTUALIZADO']):
            return (x['TARIFA'] / 1000) * x['AVALUO_ACTUALIZADO']
        else:
            return None

    elif pd.notna(x['TARIFA']) and pd.notna(x['AVALUO_ACTUALIZADO']) and pd.notna(x['VALOR_LIQUIDADO']):
        return min(
            (x['TARIFA'] / 1000) * x['AVALUO_ACTUALIZADO'],
            2 * x['VALOR_LIQUIDADO']
        )
    else:
        return None


def criterio_tamano(x):
    if (x['ZONA'] == 0 and x['AREA_HECTAREAS'] >= 100):
        return 1
    return 0

def valor_liquidado_actualizado_2(x, inflation):
    tarifaAdj = x['TARIFA']/1000
    valuationInfl = x['AVALUO']*(1+inflation)
    tariffLiq = tarifaAdj * valuationInfl
    doubleLiq =2 * x['VALOR_LIQUIDADO']
    return min(tariffLiq, doubleLiq)

def criterio_destino(x):
    dest = x.get('EQUIVALENCIA_DESTINO', '') or ''
    # chequeo por substring en lugar de igualdad estricta
    lote_cond = (
        "LOTE URBANIZABLE NO URBANIZADO" in dest
        or "LOTE URBANIZADO NO CONSTRUIDO" in dest
    )
    if lote_cond and x['ZONA'] == 1:
        return 1
    return 0

def criterio_tamanio(x):
    return 1 if (x['ZONA'] == 0) and (x['AREA_HECTAREAS'] >= 100) else 0

def criterio_habitacional(x):
    if (x['EQUIVALENCIA_DESTINO'] == "HABITACIONAL") and (x['ESTRATO'] == 1 or x['ESTRATO'] == 2) and (x['AVALUO_ACTUALIZADO_SMMLV'] <= 135 and x['AREA_HECTAREAS'] < 100):
        return 1
    return 0

def criterio_complemento(x):
    if ((x['CRITERIO_DESTINO'] + x['CRITERIO_TAMANO'] + x['CRITERIO_HABITACIONAL'])) == 0 and x['PAGO'] == 1:
        return 1
    return 0

def criterio_excluido(x):
    if ((x['CRITERIO_DESTINO'] + x['CRITERIO_TAMANO'] + x['CRITERIO_HABITACIONAL'])) == 0 and x['PAGO'] == 0:
        return 1
    return 0

def calculo(x, inflation):

    if inflation is None:
        return None
    if x['CRITERIO_DESTINO'] == 1:
        if pd.notna(x['TARIFA']) and pd.notna(x['AVALUO']) and inflation:
            return (x['TARIFA']/1000) * x['AVALUO'] * (1+inflation)
        else:
            return None
    elif x['CRITERIO_TAMANO'] == 1:
        if pd.notna(x['TARIFA']) and pd.notna(x['AVALUO']) and pd.notna(x['VALOR_LIQUIDADO']):
            return min((x['TARIFA']/1000  * x['AVALUO']), 2 * x['VALOR_LIQUIDADO'])
        else:
            return None
    elif x['CRITERIO_HABITACIONAL'] == 1:
        if pd.notna(x['VALOR_LIQUIDADO']):
            return x['VALOR_LIQUIDADO'] * (1 + inflation)
        else:
            return None
    elif x['CRITERIO_COMPLEMENTO'] == 1:
        if pd.notna(x['VALOR_LIQUIDADO']) and pd.notna(x['PAGO']):
            return x['VALOR_LIQUIDADO'] * (1 + inflation + 0.08)
        else:
            return None
    elif x['CRITERIO_EXCLUIDO'] == 1:
        if pd.notna(x['TARIFA']) and pd.notna(x['AVALUO']) and pd.notna(x['VALOR_LIQUIDADO']):
            return min(((x['TARIFA']/1000)  * (x['AVALUO'] * (1 + inflation))), 2 * x['VALOR_LIQUIDADO'])
        else:
            return None
    else:
        return None

def calcular_proyeccion(coeficiente, comercial_u, comercial_r, df_proyeccion, df_agregados, params):
    projection_factor = agregados.factor_calculo(coeficiente, comercial_u, comercial_r, df_agregados, params)
    df_proyeccion['AVALUO_ACTUALIZADO'] = df_proyeccion.apply(
        lambda row: valor_avaluo_actualizado_1(row, projection_factor), axis=1
    )

    df_proyeccion['AVALUO_ACTUALIZADO_SMMLV'] = (df_proyeccion['AVALUO_ACTUALIZADO'] / params['smmlvC'])

    df_proyeccion['AVALUO_ACTUALIZADO_UVT'] = (df_proyeccion['AVALUO_ACTUALIZADO'] / params['uvtC'])

    df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'] = df_proyeccion.apply(
        lambda row: valor_liquidado_actualizado_1(row), axis=1
    )

    liquidation_base = df_proyeccion.groupby('ZONA')['VALOR_LIQUIDADO'].sum()
    liquidation_projected = df_proyeccion.groupby('ZONA')['VALOR_LIQUIDADO_ACTUALIZADO'].sum()

    modal = modal_urbana_rural(df_proyeccion)

    # Calculate rural projection
    rural_projected = modal['tarifa_modal_rural'] * (params['new_rural_properties'] - df_agregados[df_agregados['Calculo'] == 'total_predios_inicial_rural'].Valor.values[0]) * projection_factor['act_avg_r']
    liquidation_previous = {
        'rural': liquidation_base[0],
        'urban': liquidation_base[1],
        'total': df_proyeccion['VALOR_LIQUIDADO'].sum()
    }

    liquidation_rural = {
        'total': liquidation_projected[0] + rural_projected,
        'diff': liquidation_projected[0] + rural_projected - liquidation_previous['rural'],
        'variation': ((liquidation_projected[0] + rural_projected) - liquidation_previous['rural']) / liquidation_previous['rural']
    }

    # Calculate urban projection
    urban_projected = modal['tarifa_modal_urbana'] * (params['new_urban_properties'] - df_agregados[df_agregados['Calculo'] == 'total_predios_inicial_urbano'].Valor.values[0]) * projection_factor['act_avg_u']

    liquidation_urban = {
        'total': liquidation_projected[1] + urban_projected,
        'diff': liquidation_projected[1] + urban_projected - liquidation_previous['urban'],
        'variation': ((liquidation_projected[1] + urban_projected) - liquidation_previous['urban']) / liquidation_previous['urban']
    }

    liquidation_total = {
        'total': liquidation_rural['total'] + liquidation_urban['total'],
        'diff': liquidation_rural['diff'] + liquidation_urban['diff'],
        'variation': ((liquidation_rural['total'] + liquidation_urban['total']) - liquidation_previous['total']) / liquidation_previous['total']
    }

    # Combine results into the liquidation object
    liquidation = {
        'rural': liquidation_rural,
        'urbano': liquidation_urban,
        'total': liquidation_total
    }

    return {'liquidation': liquidation , "df": df_proyeccion, "projected": {"rural": rural_projected, "urban": urban_projected} }


def calcular_valor_liquidado_tariff(df_proyeccion):
    # Safety check to ensure dataframe is not empty
    if df_proyeccion.empty:
        raise ValueError("Under current filter setup, no value will be affected")

    df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'] = df_proyeccion.apply(
        lambda row: valor_liquidado_actualizado_1(row), axis=1
    )

    return df_proyeccion

def set_criteria(df):
    df['CRITERIO_DESTINO'] = df.apply(criterio_destino, axis=1)
    df['CRITERIO_TAMANO'] = df.apply(criterio_tamanio, axis=1)
    df['CRITERIO_HABITACIONAL'] = df.apply(criterio_habitacional, axis=1)
    df['CRITERIO_COMPLEMENTO'] = df.apply(criterio_complemento, axis=1)
    df['CRITERIO_EXCLUIDO'] = df.apply(criterio_excluido, axis=1)
    return df
