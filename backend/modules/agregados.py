import pandas as pd
import numpy as np

def df_agregados(df):
    total_predios_inicial = len(df)
    total_predios_inicial_urbano = sum(df['ZONA'])
    total_predios_inicial_rural = total_predios_inicial - total_predios_inicial_urbano
    total_area_construida_inicial = sum(df['AREA_CONSTRUIDA'])
    total_area_construida_inicial_urbano = sum(df[df['ZONA'] == 1]['AREA_CONSTRUIDA'])
    total_area_construida_inicial_rural = total_area_construida_inicial - total_area_construida_inicial_urbano
    total_area_terreno_inicial = sum(df['AREA_TERRENO'])
    total_area_terreno_inicial_urbano = sum(df[df['ZONA'] == 1]['AREA_TERRENO'])
    total_area_terreno_inicial_rural = total_area_terreno_inicial - total_area_terreno_inicial_urbano
    total_avaluo_catastral_inicial = sum(df['AVALUO'])
    total_avaluo_catastral_inicial_urbano = sum(df[df['ZONA'] == 1]['AVALUO'])
    total_avaluo_catastral_inicial_rural = total_avaluo_catastral_inicial - total_avaluo_catastral_inicial_urbano
    avaluo_inicial_urbano_promedio = total_avaluo_catastral_inicial_urbano / total_predios_inicial_urbano
    avaluo_inicial_rural_promedio = total_avaluo_catastral_inicial_rural / total_predios_inicial_rural
    
    data = pd.DataFrame({
        'total_predios_inicial': [total_predios_inicial],
        'total_predios_inicial_urbano': [total_predios_inicial_urbano],
        'total_predios_inicial_rural': [total_predios_inicial_rural],
        'total_area_construida_inicial': [total_area_construida_inicial],
        'total_area_construida_inicial_urbano': [total_area_construida_inicial_urbano],
        'total_area_construida_inicial_rural': [total_area_construida_inicial_rural],
        'total_area_terreno_inicial': [total_area_terreno_inicial],
        'total_area_terreno_inicial_urbano': [total_area_terreno_inicial_urbano],
        'total_area_terreno_inicial_rural': [total_area_terreno_inicial_rural],
        'total_avaluo_catastral_inicial': [total_avaluo_catastral_inicial],
        'total_avaluo_catastral_inicial_urbano': [total_avaluo_catastral_inicial_urbano],
        'total_avaluo_catastral_inicial_rural': [total_avaluo_catastral_inicial_rural],
        'avaluo_inicial_urbano_promedio': [avaluo_inicial_urbano_promedio],
        'avaluo_inicial_rural_promedio': [avaluo_inicial_rural_promedio]
    })
    data = data.T.reset_index()
    data.columns = ['Calculo', 'Valor']
    return data

# Este cálculo solo aplica para los módulos de actualización catastral
# coeficiente_avaluo_catastral este coeficiente se mueve de 0.6 a 1

#Estos factores de proyección serán utilizados únicamente para la proyección del primer año (y=0).

def calculo_actualizacion_coeficiente(coeficiente_avaluo_catastral, valor_comercial_u, valor_comercial_r, valor_comercial):
    #Calculos
    proy_avaluo_urbano = coeficiente_avaluo_catastral * valor_comercial_u
    proy_avaluo_rural = coeficiente_avaluo_catastral * valor_comercial_r
    proy_avaluo_total = coeficiente_avaluo_catastral * valor_comercial

    return pd.DataFrame({
        "proy_avaluo_urbano": [proy_avaluo_urbano],
        "proy_avaluo_rural": [proy_avaluo_rural],
        "proy_avaluo_total": [proy_avaluo_total]
    })

def calculo_avaluo_catastral(coeficiente_avaluo_catastral, valor_comercial_u, valor_comercial_r, valor_comercial, df_agregados, df_proyectado):

    #Calculos
    proy_avaluo_urbano = coeficiente_avaluo_catastral * valor_comercial_u
    proy_avaluo_rural = coeficiente_avaluo_catastral * valor_comercial_r
    proy_avaluo_total = coeficiente_avaluo_catastral * valor_comercial
    proy_avaluo_actualizacion_promedio_urbano = proy_avaluo_urbano / df_agregados[df_agregados['Calculo'] == 'total_predios_inicial_urbano'].Valor.values[0]
    proy_avaluo_actualizacion_promedio_rural = proy_avaluo_rural / df_agregados[df_agregados['Calculo'] == 'total_predios_inicial_rural'].Valor.values[0]
    proy_avaluo_actualizacion_promedio = proy_avaluo_total / df_agregados[df_agregados['Calculo'] == 'total_predios_inicial'].Valor.values[0]
    factor_pry_urbano = (proy_avaluo_actualizacion_promedio_urbano / df_agregados[df_agregados['Calculo'] == 'avaluo_inicial_urbano_promedio'].Valor.values[0])
    factor_pry_rural = (proy_avaluo_actualizacion_promedio_rural / df_agregados[df_agregados['Calculo'] == 'avaluo_inicial_rural_promedio'].Valor.values[0])
    predios_nuevos_urbano = df_proyectado['predios_urbano'].values[0] - df_agregados[df_agregados['Calculo'] == 'total_predios_inicial_urbano'].Valor.values[0]
    predios_nuevos_rural = df_proyectado['predios_rural'].values[0] - df_agregados[df_agregados['Calculo'] == 'total_predios_inicial_rural'].Valor.values[0]
    predios_nuevos_total = df_proyectado['predios_total'].values[0] - df_agregados[df_agregados['Calculo'] == 'total_predios_inicial'].Valor.values[0]

    return pd.DataFrame({
        "proy_avaluo_urbano": [proy_avaluo_urbano],
        "proy_avaluo_rural": [proy_avaluo_rural],
        "proy_avaluo_total": [proy_avaluo_total],
        "proy_avaluo_actualizacion_promedio_urbano": [proy_avaluo_actualizacion_promedio_urbano],
        "proy_avaluo_actualizacion_promedio_rural": [proy_avaluo_actualizacion_promedio_rural],
        "proy_avaluo_actualizacion_promedio": [proy_avaluo_actualizacion_promedio],
        "factor_pry_urbano": [factor_pry_urbano],
        "factor_pry_rural": [factor_pry_rural],
        "predios_nuevos_urbano": [predios_nuevos_urbano],
        "predios_nuevos_rural": [predios_nuevos_rural],
        "predios_nuevos_total": [predios_nuevos_total],
    })

def factor_calculo(coeficiente_avaluo_catastral, valor_comercial_u, valor_comercial_r, df_agregados, params):

    #Calculos
    proy_avaluo_urbano = coeficiente_avaluo_catastral * valor_comercial_u
    proy_avaluo_rural = coeficiente_avaluo_catastral * valor_comercial_r
    proy_avaluo_actualizacion_promedio_urbano = proy_avaluo_urbano / params['new_urban_properties']
    proy_avaluo_actualizacion_promedio_rural = proy_avaluo_rural / params['new_rural_properties']
    factor_pry_urbano = (proy_avaluo_actualizacion_promedio_urbano / df_agregados[df_agregados['Calculo'] == 'avaluo_inicial_urbano_promedio'].Valor.values[0])
    factor_pry_rural = (proy_avaluo_actualizacion_promedio_rural / df_agregados[df_agregados['Calculo'] == 'avaluo_inicial_rural_promedio'].Valor.values[0])

    return pd.DataFrame({
        "act_avg_u": [proy_avaluo_actualizacion_promedio_urbano],
        "act_avg_r": [proy_avaluo_actualizacion_promedio_rural],
        "factor_pry_urbano": [factor_pry_urbano],
        "factor_pry_rural": [factor_pry_rural]
    })