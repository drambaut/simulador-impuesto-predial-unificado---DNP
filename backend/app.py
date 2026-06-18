from flask import Flask, jsonify, request
from flask_cors import CORS  # Import CORS
from modules import procesamiento, agregados, geografia
from decimal import Decimal
import pandas as pd
import datetime
import jwt
import uuid
import numpy as np
import json
import os


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


# In-memory storage for our data
data_store = {}

@app.route("/healthz", methods=["GET"])
def healthz():
    return "", 204

#TODO Add validation checks to missing values in front
@app.route('/store-data', methods=['POST'])
def store_data():
    try:
        # Extracting data from the request
        liq_0 = request.json.get('base_liquidacion_0')
        cat_0 = request.json.get('base_catastral_0')
        liq_1 = request.json.get('base_liquidacion_1')
        cat_1 = request.json.get('base_catastral_1')
        params = request.json.get('params')
        destinations = request.json.get('destinacion_economica')[0]
        modules = 0

        df_agregados = pd.DataFrame()
        df_proyeccion_act = pd.DataFrame()
        liquidation_base_serialized = {}
        lower_liquidation_serialized = {}
        upper_liquidation_serialized = {}
        projected = {}
        base_stratum = pd.DataFrame()
        current_destinations = {}

        df_proyeccion_p = pd.DataFrame()
        destination_criteria = pd.DataFrame()
        size_criteria = pd.DataFrame()
        habitational_criteria = pd.DataFrame()
        complement_criteria = pd.DataFrame()
        excluded_criteria = pd.DataFrame()
        projected_stratum = pd.DataFrame()
        updated_destinations = {}

        if any(bool(d) for d in cat_0):
            modules = modules + 1

            # Create and process DataFrames
            df_liquidacion = pd.DataFrame(liq_0)

            df_catastral = pd.DataFrame(cat_0)
            df_catastral = procesamiento.procesamiento_catastral(df_catastral)

            df_proyeccion = procesamiento.transformacion_antes_actualizacion(df_liquidacion, df_catastral, destinations)

            df_proyeccion_records = df_proyeccion.to_dict(orient='records')

            df_proyeccion_act = procesamiento.transformacion_desp_actualizacion(df_proyeccion)

            # Extract unique current destinations
            current_destinations = {}
            for item in df_proyeccion_records:
                key = item.get('DESTINACION_ECONOMICA')
                value = item.get('EQUIVALENCIA_DESTINO')
                if key and value:  # Ensure both key and value are not None
                    current_destinations[key] = value

            base_stratum = sorted({entry.get("ESTRATO") for entry in df_proyeccion_act.to_dict(orient='records') if isinstance(entry, dict) and "ESTRATO" in entry})

            df_agregados = agregados.df_agregados(df_proyeccion_act)

            # Extract base values
            comercial_u = params['commercial_value_u']
            comercial_r = params['commercial_value_r']

            # Calculate projections
            lower_liquidation = procesamiento.calcular_proyeccion(
                    0.6, comercial_u, comercial_r, df_proyeccion_act, df_agregados, params)
            upper_liquidation = procesamiento.calcular_proyeccion(
                    1, comercial_u, comercial_r, df_proyeccion_act, df_agregados, params)

            lower_liquidation_serialized = to_native(lower_liquidation['liquidation'])
            upper_liquidation_serialized = to_native(upper_liquidation['liquidation'])

            projected = to_native(upper_liquidation['projected'])

            liquidation_grouped = df_proyeccion.groupby('ZONA')['VALOR_LIQUIDADO'].sum()

            liquidation_base = {
                'rural': liquidation_grouped[0],
                'urban': liquidation_grouped[1],
                'total': df_proyeccion_act['VALOR_LIQUIDADO'].sum()
            }

            liquidation_base_serialized = make_serializable(liquidation_base)



        if any(bool(d) for d in cat_1):
            modules = modules + 2

            df_liquidacion_p = pd.DataFrame(liq_1)
            df_catastral_p = pd.DataFrame(cat_1)
            df_catastral_p = procesamiento.procesamiento_catastral(df_catastral_p)

            smmlvP = params['smmlvP']
            uvtP = params['uvtP']
            inflation = params['expectedInflation']


            df_proyeccion_p = procesamiento.transformacion_antes_actualizacion(df_liquidacion_p, df_catastral_p, destinations)

            df_proyeccion_p["AVALUO_SMMLV"] = (df_proyeccion_p["AVALUO"] / smmlvP)
            df_proyeccion_p["AVALUO_UVT"] = (df_proyeccion_p["AVALUO"] / uvtP)

            df_proyeccion_p["AVALUO_ACTUALIZADO"] = (df_proyeccion_p["AVALUO"] * (1 + inflation))
            df_proyeccion_p["AVALUO_ACTUALIZADO_UVT"] = (df_proyeccion_p["AVALUO"] / uvtP)
            df_proyeccion_p["AVALUO_ACTUALIZADO_SMMLV"] = (df_proyeccion_p["AVALUO"] / smmlvP)

            df_proyeccion_p = procesamiento.set_criteria(df_proyeccion_p)

            df_proyeccion_p['VALOR_LIQUIDADO_ACTUALIZADO'] = df_proyeccion_p.apply(lambda row: procesamiento.calculo(row, inflation), axis=1)
            #df_proyeccion_p['VALOR_LIQUIDADO_ACTUALIZADO_2'] = df_proyeccion_p.apply(lambda row: procesamiento.valor_liquidado_actualizado_2(row, inflation), axis=1)

            projected_stratum = sorted({entry.get("ESTRATO") for entry in df_proyeccion_p.to_dict(orient='records') if isinstance(entry, dict) and "ESTRATO" in entry})

            destination_criteria = df_proyeccion_p.loc[df_proyeccion_p['CRITERIO_DESTINO']==1]
            size_criteria = df_proyeccion_p.loc[df_proyeccion_p['CRITERIO_TAMANO']==1]
            habitational_criteria = df_proyeccion_p.loc[df_proyeccion_p['CRITERIO_HABITACIONAL']==1]
            complement_criteria = df_proyeccion_p.loc[df_proyeccion_p['CRITERIO_COMPLEMENTO']==1]
            excluded_criteria = df_proyeccion_p.loc[df_proyeccion_p['CRITERIO_EXCLUIDO']==1]

            for item in df_proyeccion_p.to_dict(orient='records'):
                key = item.get('DESTINACION_ECONOMICA')
                value = item.get('EQUIVALENCIA_DESTINO')
                if key and value:  # Ensure both key and value are not None
                    updated_destinations[key] = value

        # Store everything in a dictionary
        data = {
            **({
                'agregados': df_agregados.to_dict(orient='records'),
                'current_destinations': current_destinations,
                'proyeccion_actualizada': df_proyeccion_act.to_dict(orient='records'),
                'params': params,
                'precomputed_limits': {
                    'previous_liq': liquidation_base_serialized,
                    'lower_liq': lower_liquidation_serialized,
                    'upper_liq': upper_liquidation_serialized,
                },
                'projected_year_1': projected,
                'base_stratum': base_stratum,
            } if not df_proyeccion_act.empty else {}),
            **({
                'projected_stratum': projected_stratum,
                'updated_destinations': updated_destinations,
                'proyeccion_actualizada_p': df_proyeccion_p.to_dict(orient='records'),
                'projected_liq_2': {
                    'current_liquidation': int(df_proyeccion_p['VALOR_LIQUIDADO'].sum()),
                    'projected_liquidation': int(df_proyeccion_p['VALOR_LIQUIDADO_ACTUALIZADO'].sum()),
                    'update_diff': int(df_proyeccion_p['VALOR_LIQUIDADO_ACTUALIZADO'].sum()
                                       - df_proyeccion_p['VALOR_LIQUIDADO'].sum()),
                    'variation': (0 if df_proyeccion_p['VALOR_LIQUIDADO'].sum()==0
                                  else (df_proyeccion_p['VALOR_LIQUIDADO_ACTUALIZADO'].sum()
                                        - df_proyeccion_p['VALOR_LIQUIDADO'].sum())
                                  / df_proyeccion_p['VALOR_LIQUIDADO'].sum()),
                    'destination': {
                        'count': len(destination_criteria),
                        'liquidation': int(destination_criteria['VALOR_LIQUIDADO_ACTUALIZADO'].sum())
                    },
                    'size': {
                        'count': len(size_criteria),
                        'liquidation': int(size_criteria['VALOR_LIQUIDADO_ACTUALIZADO'].sum())
                    },
                    'habitational': {
                        'count': len(habitational_criteria),
                        'liquidation': int(habitational_criteria['VALOR_LIQUIDADO_ACTUALIZADO'].sum())
                    },
                    'complement': {
                        'count': len(complement_criteria),
                        'liquidation': int(complement_criteria['VALOR_LIQUIDADO_ACTUALIZADO'].sum())
                    },
                    'excluded': {
                        'count': len(excluded_criteria),
                        'liquidation': int(excluded_criteria['VALOR_LIQUIDADO_ACTUALIZADO'].sum())
                    },
                }
            } if not df_proyeccion_p.empty else {})
        }

        # Generate a unique ID for the dataset
        data_id = str(uuid.uuid4())

        # Store the data (already serialized as dictionaries)
        data_store[data_id] = to_native(data)

        # Return the generated ID
        return jsonify({"data_id": data_id, "modules": modules}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


def make_serializable(obj):
    if isinstance(obj, pd.Series):
        # If the Series has a single value, extract it directly
        if len(obj) == 1:
            return obj.iloc[0]
        return obj.to_dict()
    if isinstance(obj, dict):
        # Recursively handle nested dictionaries
        return {key: make_serializable(val) for key, val in obj.items()}
    if isinstance(obj, pd.DataFrame):
        # Convert DataFrame to list of dictionaries
        return obj.to_dict(orient="records")
    return obj

def to_native(obj):
    # Normalize "missing"
    if obj is None or obj is pd.NaT:
        return None

    # NumPy scalars (np.int64, np.float64, etc.)
    if isinstance(obj, np.generic):
        return obj.item()

    # Pandas Series — collapse length-1 to scalar; else to list
    if isinstance(obj, pd.Series):
        if obj.size == 1:
            return to_native(obj.iloc[0])
        return [to_native(v) for v in obj.tolist()]

    # Pandas DataFrame — records
    if isinstance(obj, pd.DataFrame):
        return [to_native(rec) for rec in obj.to_dict(orient='records')]

    # NumPy arrays
    if isinstance(obj, np.ndarray):
        return [to_native(v) for v in obj.tolist()]

    # Datetime-like via duck typing (pd.Timestamp, datetime, etc.)
    iso = getattr(obj, "isoformat", None)
    if callable(iso):
        try:
            return iso()
        except Exception:
            pass

    # Decimals (DB drivers)
    if isinstance(obj, Decimal):
        return float(obj)

    # Containers
    if isinstance(obj, dict):
        return {str(k): to_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [to_native(v) for v in obj]

    # Plain Python types
    return obj


# Helper function to retrieve data
def retrieve_data_helper(data_id):
    # Check if the data_id exists in the data store
    if data_id not in data_store:
        return None, "Data ID not found"

    print(data_id)
    # Retrieve the DataFrame using the data_id
    df = data_store[data_id]
    return df, None

@app.route('/retrieve-data/aggregates', methods=['GET'])
def retrieve_aggreate_data():
    try:
        data_id = request.args.get('dataId')
        # Use the helper function to retrieve data
        if data_id not in data_store:
            return jsonify({"error": "Data ID not found"}), 404

        # Retrieve the data dictionary
        data = data_store[data_id]
        aggregates = data['agregados']

        # Return the data directly as it's already in a serializable format
        return jsonify({"data": aggregates}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/retrieve-data/destinations', methods=['GET'])
def retrieve_destination_data():
    try:
        data_id = request.args.get('dataId')
        type = request.args.get('type')

        # Use the helper function to retrieve data
        if data_id not in data_store:
            return jsonify({"error": "Data ID not found"}), 404

        # Retrieve the data dictionary
        data = data_store[data_id]
        if type == 'base':
            destinations = data['current_destinations']
        elif type == 'projected':
            destinations = data['updated_destinations']
        else:
            return jsonify({"error": 'The input type variable does not exists'}), 400

        # Return the data directly as it's already in a serializable format
        return jsonify({"data": destinations}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/retrieve-data/stratum', methods=['GET'])
def retrieve_stratum_data():
    try:
        data_id = request.args.get('dataId')
        type = request.args.get('type')

        # Use the helper function to retrieve data
        if data_id not in data_store:
            return jsonify({"error": "Data ID not found"}), 404

        # Retrieve the data dictionary
        data = data_store[data_id]
        if type == 'base':
            destinations = data['base_stratum']
        elif type == 'projected':
            destinations = data['projected_stratum']
        else:
            return jsonify({"error": 'The input type variable does not exists'}), 400

        # Return the data directly as it's already in a serializable format
        return jsonify({"data": destinations}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/retrieve-data/<data_id>', methods=['GET'])
def retrieve_data(data_id):
    try:
        # Use the helper function to retrieve data
        if data_id not in data_store:
            return jsonify({"error": "Data ID not found"}), 404

        # Retrieve the data dictionary
        data = data_store[data_id]

        # Return the data directly as it's already in a serializable format
        return jsonify({"data": data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


GEO_CONTEXT_TO_STORE_KEY = {
    "avaluo_year1": "proyeccion_actualizada",
    "tarifa_year1": "proyeccion_actualizada",
    "avaluo_year2": "proyeccion_actualizada_p",
    "tarifa_year2": "proyeccion_actualizada_p",
}


@app.route('/geo/predios', methods=['GET'])
def retrieve_predios_geojson():
    try:
        data_id = request.args.get('dataId')
        context = request.args.get('context', 'avaluo_year1')

        if not data_id:
            return jsonify({"error": "Data ID is required"}), 400
        if context not in GEO_CONTEXT_TO_STORE_KEY:
            return jsonify({
                "error": "Invalid context",
                "valid_contexts": sorted(GEO_CONTEXT_TO_STORE_KEY.keys())
            }), 400
        if data_id not in data_store:
            return jsonify({"error": "Data ID not found"}), 404

        data = data_store[data_id]
        if context == "tarifa_year1" and data.get("tariff_scenario_year1"):
            records = data["tariff_scenario_year1"]
        elif context == "tarifa_year2" and data.get("tariff_scenario_year2"):
            records = data["tariff_scenario_year2"]
        else:
            store_key = GEO_CONTEXT_TO_STORE_KEY[context]
            records = data.get(store_key, [])

        if not records:
            return jsonify({
                "error": f"No hay datos disponibles para el contexto {context}"
            }), 404

        geojson = geografia.build_predios_geojson(records, context=context)
        geojson["metadata"]["dataId"] = data_id
        geojson["metadata"]["context"] = context
        return jsonify(geojson), 200

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/calculate/liquidation/base', methods=['GET'])
def calculate_total_liquidation_base():
    try:
        # Retrieve the data ID and coefficient from the query parameters
        data_id = request.args.get('dataId')
        coefficient = request.args.get('coefficient')

        print(data_id)
        print(coefficient)

        if not data_id:
            return jsonify({"error": "Data ID is required"}), 400
        if coefficient is None:
            return jsonify({"error": "Coefficient is required"}), 400

        try:
            coefficient = float(coefficient)
            if not 0.6 <= coefficient <= 1:
                return jsonify({"error": "Coefficient must be between 0.6 and 1"}), 400
        except ValueError:
            return jsonify({"error": "Coefficient must be a number"}), 400

        data, error = retrieve_data_helper(data_id)
        if error:
            return jsonify({"error": error}), 404

        precomputed_limits = data.get('precomputed_limits', {})
        df_proyeccion = pd.DataFrame(data.get('proyeccion_actualizada', []))
        df_agregado = pd.DataFrame(data.get('agregados', []))

        params = data.get('params', {})
        comercial_u = params.get('commercial_value_u', 0)
        comercial_r = params.get('commercial_value_r', 0)

        params['valuationCoefficient'] = coefficient
        data['params'] = params

        user_input_result = procesamiento.calcular_proyeccion(
            coefficient, comercial_u, comercial_r, df_proyeccion, df_agregado, params
        )

        user_input_result_serialized = make_serializable(user_input_result['liquidation'])
        print(user_input_result_serialized)

        data['projected_year_1'] = make_serializable(user_input_result['projected'])

        data['proyeccion_actualizada'] = make_serializable(user_input_result['df'])

        previous_liquidation = precomputed_limits.get('previous_liq', [{"error": "previous liquidation data missing"}])
        lower_limit = precomputed_limits.get('lower_liq', [{"error": "lower limit data missing"}])
        upper_limit = precomputed_limits.get('upper_liq', [{"error": "upper limit data missing"}])
        precomputed_limits['user_liq'] = user_input_result_serialized

        # Format the response
        result = {
            "projections": {
                'previous_liquidation': {
                    'rural': previous_liquidation['rural'],
                    'urbano': previous_liquidation['urban'],
                    'total': previous_liquidation['total']
                },
                "lower_limit": {
                    "rural": lower_limit['rural'],
                    "total": lower_limit['total'],
                    "urbano": lower_limit['urbano']
                },
                "upper_limit": {
                    "rural": upper_limit['rural'],
                    "total": upper_limit['total'],
                    "urbano": upper_limit['urbano']
                },
                "user_input": {
                    "rural": user_input_result_serialized['rural'],
                    "total": user_input_result_serialized['total'],
                    "urbano": user_input_result_serialized['urbano']
                },
            }
        }

        print(result)

        return jsonify(result), 200

    except KeyError as e:
        return jsonify({"error": f"KeyError: {e}"}), 400
    except IndexError as e:
        return jsonify({"error": f"IndexError: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/calculate/liquidation/projected', methods=['GET'])
def calculate_total_liquidation_projected():
    try:
        # Retrieve the data ID and coefficient from the query parameters
        data_id = request.args.get('dataId')
        inflation = request.args.get('inflation')
        smmlv = request.args.get('smmlv')

        if not data_id:
            return jsonify({"error": "Data ID is required"}), 400
        if inflation is None:
            return jsonify({"error": "Inflation is required"}), 400
        if smmlv is None:
            return jsonify({"error": "SMMLV is required"}), 400

        try:
            inflation = float(inflation)
            if not 0 < inflation <= .2:
                return jsonify({"error": "Inflation must be between 0 and 20"}), 400
        except ValueError:
            return jsonify({"error": "Inflation must be a number"}), 400

        try:
            smmlv = float(smmlv)
            if not 1300000 <= smmlv <= 2000000:
                return jsonify({"error": "SMMLV must be between $1.300.000 and $2.000.000"}), 400
        except ValueError:
            return jsonify({"error": "SMMLV must be a number"}), 400

        data, error = retrieve_data_helper(data_id)
        if error:
            return jsonify({"error": error}), 404

        params = data.get('params', {})
        initInflation = params.get('expectedInflation', 0)
        initSMMLV = params.get('smmlvP', 0)

        # if(inflation == initInflation and smmlv == initSMMLV):
        #     liquidation = data.get('proyected_liq_2', {})
        #     print(data.get('proyected_liq_2', {}))
        #     return jsonify(liquidation), 200

        df_proyeccion = pd.DataFrame(data.get('proyeccion_actualizada_p', []))

        if(smmlv != initSMMLV):
            params['smmlvP'] = smmlv
            data['params'] = params
            df_proyeccion["AVALUO_SMMLV"] = (df_proyeccion["AVALUO"] / smmlv)
            df_proyeccion = procesamiento.set_criteria(df_proyeccion)

        if(inflation != initInflation):
            params['expectedInflation'] = inflation
            data['params'] = params

        df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'] = df_proyeccion.apply(lambda row: procesamiento.calculo(row, inflation), axis=1)
        df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO_2'] = df_proyeccion.apply(lambda row: procesamiento.valor_liquidado_actualizado_2(row, inflation), axis=1)

        destination_criteria = df_proyeccion.loc[df_proyeccion['CRITERIO_DESTINO']==1]
        size_criteria = df_proyeccion.loc[df_proyeccion['CRITERIO_TAMANO']==1]
        habitational_criteria = df_proyeccion.loc[df_proyeccion['CRITERIO_HABITACIONAL']==1]
        complement_criteria = df_proyeccion.loc[df_proyeccion['CRITERIO_COMPLEMENTO']==1]
        excluded_criteria = df_proyeccion.loc[df_proyeccion['CRITERIO_EXCLUIDO']==1]

        result = {
            'current_liquidation': sum(df_proyeccion['VALOR_LIQUIDADO']),
            'projected_liquidation': sum(df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO']),
            'update_diff': sum(df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO']) - sum(df_proyeccion['VALOR_LIQUIDADO']),
            'variation': (sum(df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO']) - sum(df_proyeccion['VALOR_LIQUIDADO'])) / sum(df_proyeccion['VALOR_LIQUIDADO']),
            'destination': {
                'count': len(destination_criteria),
                'liquidation': sum(destination_criteria['VALOR_LIQUIDADO_ACTUALIZADO'])
                },
            'size': {
                'count': len(size_criteria),
                'liquidation': sum(size_criteria['VALOR_LIQUIDADO_ACTUALIZADO'])
            },
            'habitational': {
                'count': len(habitational_criteria),
                'liquidation': sum(habitational_criteria['VALOR_LIQUIDADO_ACTUALIZADO'])
            },
            'complement': {
                'count': len(complement_criteria),
                'liquidation': sum(complement_criteria['VALOR_LIQUIDADO_ACTUALIZADO'])
            },
            'excluded': {
                'count': len(excluded_criteria),
                'liquidation': sum(excluded_criteria['VALOR_LIQUIDADO_ACTUALIZADO'])
            },
        }

        return jsonify(result), 200

    except KeyError as e:
        return jsonify({"error": f"KeyError: {e}"}), 400
    except IndexError as e:
        return jsonify({"error": f"IndexError: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/calculate/tariff/base', methods=['POST'])
def get__base_tariff_scenario():
    try:
        # Retrieve the data ID and tariff from the request JSON
        data_id = request.json.get('dataId')
        tariff = request.json.get('tariff')
        destination = request.json.get('destination', [])  # Array
        area = request.json.get('area', {})  # Object
        zone = request.json.get('zone')  # Boolean
        stratum = request.json.get('stratum', [])  # Array
        valuation = request.json.get('valuation', {})  # Object
        valuation_smmlv = request.json.get('valuation_smmlv', {})  # Object
        valuation_uvt = request.json.get('valuation_uvt', {})  # Object

        # Validate that the required parameters are provided
        if not data_id:
            return jsonify({"error": "Data ID is required"}), 400
        if not tariff:
            return jsonify({"error": "Tariff is required"}), 400

        # Retrieve data
        data, error = retrieve_data_helper(data_id)
        if error:
            return jsonify({"error": error}), 404

        df_proyeccion = pd.DataFrame(data['proyeccion_actualizada'])

        limits = data['precomputed_limits']
        projected = data['projected_year_1']

        rural = projected['rural']
        urban = projected['urban']

        user_liq = limits['user_liq']

        total = user_liq['total']['total']

        mask = pd.Series(True, index=df_proyeccion.index)

        # Apply filters dynamically
        if destination:
            mask &= df_proyeccion['DESTINACION_ECONOMICA'].isin(destination)

        if area:
            if 'min' in area and 'max' in area:
                mask &= df_proyeccion['AREA_TERRENO'].between(area['min'], area['max'])

        if valuation:
            if 'min' in valuation and 'max' in valuation:
                mask &= df_proyeccion['AVALUO_ACTUALIZADO'].between(valuation['min'], valuation['max'])

        if valuation_smmlv:
            if 'min' in valuation_smmlv and 'max' in valuation_smmlv:
                mask &= df_proyeccion['AVALUO_ACTUALIZADO_SMMLV'].between(valuation_smmlv['min'], valuation_smmlv['max'])

        if valuation_uvt:
            if 'min' in valuation_uvt and 'max' in valuation_uvt:
                mask &= df_proyeccion['AVALUO_ACTUALIZADO_UVT'].between(valuation_uvt['min'], valuation_uvt['max'])

        if zone is not None:
            mask &= df_proyeccion['ZONA'] == int(zone)

        if stratum:
            mask &= df_proyeccion['ESTRATO'].isin(map(int, stratum))

        row_count = int(mask.sum())
        average_tariff = (
            df_proyeccion.loc[mask, 'TARIFA'].mean()
            if row_count > 0
            else 0
        )

        tarifa_original = df_proyeccion['TARIFA'].copy()
        valor_liquidado_original = df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'].copy()

        df_proyeccion.loc[mask, 'TARIFA'] = tariff

        df_proyeccion = procesamiento.calcular_valor_liquidado_tariff(df_proyeccion)

        new_liquidation = (urban + rural + df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'].sum())

        analysis_result = {
            "coefficient": data['params']['valuationCoefficient'],
            "lot_count": row_count,
            "average_tariff": average_tariff,
            "total_liq_update": total,
            "total_liq_update_tariff": new_liquidation,
            "delta_liq": new_liquidation - total
        }

        scenario_columns = [
            "NUMERO_PREDIAL", "DESTINACION_ECONOMICA", "ZONA", "ESTRATO",
            "AREA_TERRENO", "AVALUO",
        ]
        scenario_df = df_proyeccion[
            [col for col in scenario_columns if col in df_proyeccion.columns]
        ].copy()
        scenario_df['TARIFA_ORIGINAL'] = tarifa_original
        scenario_df['TARIFA_NUEVA'] = df_proyeccion['TARIFA']
        scenario_df['PREDIO_AFECTADO'] = mask
        scenario_df['VALOR_LIQUIDADO_ORIGINAL'] = valor_liquidado_original
        scenario_df['VALOR_LIQUIDADO_MODIFICADO'] = df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO']
        scenario_df['DIFERENCIA_LIQUIDACION'] = (
            scenario_df['VALOR_LIQUIDADO_MODIFICADO'] - scenario_df['VALOR_LIQUIDADO_ORIGINAL']
        )

        data['tariff_scenario_year1'] = to_native(scenario_df)

        return jsonify(analysis_result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/calculate/tariff/projected', methods=['POST'])
def get__projected_tariff_scenario():
    try:
        # Retrieve the data ID and tariff from the request JSON
        data_id = request.json.get('dataId')
        tariff = request.json.get('tariff')
        destination = request.json.get('destination', [])  # Array
        area = request.json.get('area', {})  # Object
        zone = request.json.get('zone')  # Boolean
        stratum = request.json.get('stratum', [])  # Array
        valuation = request.json.get('valuation', {})  # Object
        valuation_smmlv = request.json.get('valuation_smmlv', {})  # Object
        valuation_uvt = request.json.get('valuation_uvt', {})  # Object

        # Validate that the required parameters are provided
        if not data_id:
            return jsonify({"error": "Data ID is required"}), 400
        if not tariff:
            return jsonify({"error": "Tariff is required"}), 400

        # Retrieve data
        data, error = retrieve_data_helper(data_id)
        if error:
            return jsonify({"error": error}), 404

        params = data.get('params', {})
        inflation = params.get('expectedInflation', 0)
        df_proyeccion = pd.DataFrame(data['proyeccion_actualizada_p'])

        mask = pd.Series(True, index=df_proyeccion.index)

        # Apply filters dynamically
        if destination:
            mask &= df_proyeccion['DESTINACION_ECONOMICA'].isin(destination)

        if area:
            if 'min' in area and 'max' in area:
                mask &= df_proyeccion['AREA_TERRENO'].between(area['min'], area['max'])

        if valuation:
            if 'min' in valuation and 'max' in valuation:
                mask &= df_proyeccion['AVALUO_ACTUALIZADO'].between(valuation['min'], valuation['max'])

        if valuation_smmlv:
            if 'min' in valuation_smmlv and 'max' in valuation_smmlv:
                mask &= df_proyeccion['AVALUO_ACTUALIZADO_SMMLV'].between(valuation_smmlv['min'], valuation_smmlv['max'])

        if valuation_uvt:
            if 'min' in valuation_uvt and 'max' in valuation_uvt:
                mask &= df_proyeccion['AVALUO_ACTUALIZADO_UVT'].between(valuation_uvt['min'], valuation_uvt['max'])

        if zone is not None:
            mask &= df_proyeccion['ZONA'] == int(zone)

        if stratum:
            mask &= df_proyeccion['ESTRATO'].isin(map(int, stratum))

        row_count = int(mask.sum())
        average_tariff = (
            df_proyeccion.loc[mask, 'TARIFA'].mean()
            if row_count > 0
            else 0
        )

        total_liq = df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'].sum()

        tarifa_original = df_proyeccion['TARIFA'].copy()
        valor_liquidado_original = df_proyeccion['VALOR_LIQUIDADO_ACTUALIZADO'].copy()

        df_proyeccion.loc[mask, 'TARIFA'] = tariff

        valor_liquidado_modificado = df_proyeccion.apply(lambda row: procesamiento.calculo(row, inflation), axis=1)
        new_liquidation = valor_liquidado_modificado.sum()

        analysis_result = {
            "lot_count": int(row_count),
            "average_tariff": float(average_tariff),  # Convert to float if it might be a numpy float
            "total_liq_update": float(total_liq),
            "total_liq_update_tariff": new_liquidation,
            "delta_liq": new_liquidation - total_liq
        }

        scenario_columns = [
            "NUMERO_PREDIAL", "DESTINACION_ECONOMICA", "ZONA", "ESTRATO",
            "AREA_TERRENO", "AVALUO",
        ]
        scenario_df = df_proyeccion[
            [col for col in scenario_columns if col in df_proyeccion.columns]
        ].copy()
        scenario_df['TARIFA_ORIGINAL'] = tarifa_original
        scenario_df['TARIFA_NUEVA'] = df_proyeccion['TARIFA']
        scenario_df['PREDIO_AFECTADO'] = mask
        scenario_df['VALOR_LIQUIDADO_ORIGINAL'] = valor_liquidado_original
        scenario_df['VALOR_LIQUIDADO_MODIFICADO'] = valor_liquidado_modificado
        scenario_df['DIFERENCIA_LIQUIDACION'] = (
            scenario_df['VALOR_LIQUIDADO_MODIFICADO'] - scenario_df['VALOR_LIQUIDADO_ORIGINAL']
        )

        criteria_conditions = [
            df_proyeccion.get('CRITERIO_DESTINO') == 1,
            df_proyeccion.get('CRITERIO_TAMANO') == 1,
            df_proyeccion.get('CRITERIO_HABITACIONAL') == 1,
            df_proyeccion.get('CRITERIO_COMPLEMENTO') == 1,
            df_proyeccion.get('CRITERIO_EXCLUIDO') == 1,
        ]
        criteria_labels = [
            "Destinación especial (lote urbanizable/urbanizado no construido)",
            "Predio rural de gran tamaño (>=100 ha)",
            "Habitacional con beneficio (estrato 1-2)",
            "Complemento (con pago)",
            "Excluido (sin pago)",
        ]
        scenario_df['CATEGORIA_PREDIO'] = np.select(
            criteria_conditions, criteria_labels, default="Sin categoría aplicable"
        )

        data['tariff_scenario_year2'] = to_native(scenario_df)

        return jsonify(analysis_result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/calculate/liquidation/<data_id>', methods=['GET'])
def procesar_datos_completo(data_id):
    try:
        if not data_id:
            return jsonify({"error": "Data ID is required"}), 400

        # Use the helper function to retrieve the stored data
        data, error = retrieve_data_helper(data_id)
        if error:
            return jsonify({"error": error}), 404

        # Retrieve necessary values from the 'agregados' list and precomputed limits
        df_proyeccion = pd.DataFrame(data['proyeccion_actualizada'])
        df_agregado = pd.DataFrame(data['agregados'])


        df_proyeccion_1 = pd.DataFrame(data['proyeccion_actualizada_p'])
        # Update params extraction
        params = data['params']  # params is a dictionary, use it directly


        # Step 3: Initial Calculations on Original Data
        initial_liquidacion = {
            "total": df_proyeccion['VALOR_LIQUIDADO'].sum(),
            "rural": df_proyeccion[df_proyeccion['ZONA'] == 0]['VALOR_LIQUIDADO'].sum(),
            "urbano": df_proyeccion[df_proyeccion['ZONA'] == 1]['VALOR_LIQUIDADO'].sum(),
            "by_destination": df_proyeccion.groupby("EQUIVALENCIA_DESTINO")['VALOR_LIQUIDADO'].sum().to_dict()
        }

        # Step 4: Apply Base 0 Update Calculations
        # Extract parameters from combined input
        valuationCoefficient = float(params.get('valuationCoefficient', 0))
        smmlvCurrent = float(params.get('smmlvCurrent', 0))
        smmlvP = float(params.get('smmlvP', 0))
        expectedInflation = float(params.get('expectedInflation', 0))
        uvtP = float(params.get('uvtP', 0))
        projectedRuralProperties_0 = 0
        projectedUrbanProperties_0 = 0
        totalProperties_0 = 0
        comercialValueU = float(params.get('commercial_value_u', 0))
        comercialValueR = float(params.get('commercial_value_r', 0))
        comercialValueTotal = comercialValueU + comercialValueR
        projectedRuralProperties_1 = int(params.get('new_rural_properties', 0))
        projectedUrbanProperties_1 = int(params.get('new_urban_properties', 0))
        totalProperties_1 = projectedRuralProperties_1 + projectedUrbanProperties_1

        # Create DataFrame for the first year projection
        df_proyeccion_sig_0 = pd.DataFrame({
            'predios_total': [totalProperties_0],
            'predios_rural': [projectedRuralProperties_0],
            'predios_urbano': [projectedUrbanProperties_0],
            'SMMV_y': [smmlvCurrent],
            'SMMV_2': [smmlvP],
            'inflacion_y': [expectedInflation],
            'UVT_y': [uvtP]
        })

        # Calculate the valuation using agregados.calculo_avaluo_catastral
        avaluo_catastral_base_0 = agregados.calculo_avaluo_catastral(
            valuationCoefficient,
            comercialValueU,
            comercialValueR,
            comercialValueTotal,
            df_agregado,
            df_proyeccion_sig_0
        )

        # Apply updates for Base 0
        df_proyeccion_act_base_0 = procesamiento.transformacion_desp_actualizacion(df_proyeccion)

        # Explicitly calculate criteria before proceeding
        df_proyeccion_act_base_0['criterio_destino'] = df_proyeccion_act_base_0.apply(procesamiento.criterio_destino, axis=1)
        df_proyeccion_act_base_0['criterio_tamaño'] = df_proyeccion_act_base_0.apply(procesamiento.criterio_tamano, axis=1)
        df_proyeccion_act_base_0['criterio_habitacional'] = df_proyeccion_act_base_0.apply(procesamiento.criterio_habitacional, axis=1)
        df_proyeccion_act_base_0['criterio_complemento'] = 1 - (
                df_proyeccion_act_base_0['criterio_destino'] +
                df_proyeccion_act_base_0['criterio_tamaño'] +
                df_proyeccion_act_base_0['criterio_habitacional']
        )

        # Calculate updated values for Base 0
        df_proyeccion_act_base_0['valor_avaluo_actualizado_1'] = df_proyeccion_act_base_0.apply(
            lambda row: procesamiento.valor_avaluo_actualizado_1(row, avaluo_catastral_base_0), axis=1
        )
        df_proyeccion_act_base_0['valor_liquidado_actualizado'] = df_proyeccion_act_base_0.apply(
            procesamiento.valor_liquidado_actualizado_1, axis=1
        )

        updated_liquidacion_base_0 = {
            "total": df_proyeccion_act_base_0['valor_liquidado_actualizado'].sum(),
            "rural": df_proyeccion_act_base_0[df_proyeccion_act_base_0['ZONA'] == 0]['valor_liquidado_actualizado'].sum(),
            "urbano": df_proyeccion_act_base_0[df_proyeccion_act_base_0['ZONA'] == 1]['valor_liquidado_actualizado'].sum(),
            "by_destination": df_proyeccion_act_base_0.groupby("EQUIVALENCIA_DESTINO")['valor_liquidado_actualizado'].sum().to_dict()
        }

        updated_liquidacion_base_1 = {
            "total": df_proyeccion_1['VALOR_LIQUIDADO_ACTUALIZADO'].sum(),
            "rural": df_proyeccion_1[df_proyeccion_1['ZONA'] == 0]['VALOR_LIQUIDADO_ACTUALIZADO'].sum(),
            "urbano": df_proyeccion_1[df_proyeccion_1['ZONA'] == 1]['VALOR_LIQUIDADO_ACTUALIZADO'].sum(),
            "by_destination": df_proyeccion_1.groupby("EQUIVALENCIA_DESTINO")['VALOR_LIQUIDADO_ACTUALIZADO'].sum().to_dict()
        }

        # Step 7: Calculate Differences
        delta_liquidacion = {
            "total": updated_liquidacion_base_1["total"] - initial_liquidacion["total"],
            "rural": updated_liquidacion_base_1["rural"] - initial_liquidacion["rural"],
            "urbano": updated_liquidacion_base_1["urbano"] - initial_liquidacion["urbano"],
            "by_destination": {
                dest: updated_liquidacion_base_1["by_destination"].get(dest, 0) - initial_liquidacion["by_destination"].get(dest, 0)
                for dest in set(initial_liquidacion["by_destination"].keys()).union(updated_liquidacion_base_1["by_destination"].keys())
            }
        }

        # Step 8: Generate Impact Analysis
        average_tax_initial = initial_liquidacion["total"] / totalProperties_0 if totalProperties_0 else 0
        average_tax_updated = updated_liquidacion_base_1["total"] / totalProperties_1 if totalProperties_1 else 0

        impact_analysis = {
            "average_tax_per_property_initial": average_tax_initial,
            "average_tax_per_property_updated": average_tax_updated,
            "percentage_change_average_tax": ((average_tax_updated - average_tax_initial) / average_tax_initial * 100) if average_tax_initial != 0 else 0,
            "total_new_properties": {
                "rural": projectedRuralProperties_1 - projectedRuralProperties_0,
                "urban": projectedUrbanProperties_1 - projectedUrbanProperties_0
            },
            "average_tax_by_destination_initial": {k: v / totalProperties_0 if totalProperties_0 else 0 for k, v in initial_liquidacion["by_destination"].items()},
            "average_tax_by_destination_updated": {k: v / totalProperties_1 if totalProperties_1 else 0 for k, v in updated_liquidacion_base_1["by_destination"].items()}
        }

        # Step 9: Combine Insights and Generate Output
        response = {
            "mensaje": "Datos procesados correctamente",
            "data": {
                "initial_liquidacion": initial_liquidacion,
                "updated_liquidacion_base_0": updated_liquidacion_base_0,
                "updated_liquidacion_base_1": updated_liquidacion_base_1,
                "delta_liquidacion": delta_liquidacion,
                "impact_analysis": impact_analysis
            }
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# SECRET_KEY se lee de la variable de entorno SECRET_KEY. El valor por defecto
# reproduce la llave que estaba hardcodeada antes de esta refactorización, para
# no romper despliegues existentes que aun no la hayan configurado. En
# produccion SIEMPRE se debe definir SECRET_KEY como variable de entorno
# (ver .env.example) y no depender de este valor por defecto.
app.config['SECRET_KEY'] = os.environ.get(
    'SECRET_KEY', '7jzDMDsH8kRfr39btHo$&bejsfJpCd7#SkG5dK9#'
)

# Los usuarios ya no viven en el codigo fuente. Se cargan desde un archivo
# JSON (por defecto backend/users.json, configurable con USERS_FILE) que NO
# se versiona en git. El formato esperado esta documentado en
# backend/users.json.example.
USERS_FILE = os.environ.get(
    'USERS_FILE', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.json')
)


def _load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    raise FileNotFoundError(
        f"No se encontro el archivo de usuarios en '{USERS_FILE}'. "
        "Copia backend/users.json.example a backend/users.json (o define "
        "USERS_FILE) y completa las credenciales reales."
    )


users = _load_users()

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    if username in users and users[username] == password:
        # Create JWT token
        token = jwt.encode(
            {
                'username': username,
                'exp': datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )

        # PyJWT returns bytes in version 2.x+, convert to string if necessary
        if isinstance(token, bytes):
            token = token.decode('utf-8')

        return jsonify({'token': token})

    return jsonify({'error': 'Invalid credentials'}), 401


if __name__ == '__main__':
    app.run(debug=True)
    #app.config.from_object('config.Config')
    #app.run(host="0.0.0.0", port=5000)
