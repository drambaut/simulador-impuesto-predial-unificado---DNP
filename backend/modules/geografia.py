import math
import zipfile
from functools import lru_cache
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pyogrio


TERRENO_LAYERS = (
    ("U_TERRENO_CTM12", "urbano"),
    ("R_TERRENO_CTM12", "rural"),
)
REQUIRED_LAYER_NAMES = tuple(layer_name for layer_name, _ in TERRENO_LAYERS)
WEB_CRS = "EPSG:4326"


class GeodatabaseValidationError(ValueError):
    """Raised when an uploaded .gdb does not meet the expected structure."""


def validate_geodatabase(gdb_path) -> None:
    """Valida que la .gdb tenga las capas requeridas y la columna CODIGO."""
    gdb_path = Path(gdb_path)
    try:
        layers = pyogrio.list_layers(str(gdb_path))
    except Exception as exc:
        raise GeodatabaseValidationError(
            f"No fue posible leer la geodatabase: {exc}"
        ) from exc

    available_layer_names = {row[0] for row in layers}
    missing_layers = [
        layer_name
        for layer_name in REQUIRED_LAYER_NAMES
        if layer_name not in available_layer_names
    ]
    if missing_layers:
        raise GeodatabaseValidationError(
            f"Faltan las siguientes capas en la geodatabase: {', '.join(missing_layers)}"
        )

    for layer_name in REQUIRED_LAYER_NAMES:
        info = pyogrio.read_info(str(gdb_path), layer=layer_name)
        if "CODIGO" not in info["fields"]:
            raise GeodatabaseValidationError(
                f"La capa {layer_name} no tiene la columna CODIGO"
            )


def extract_gdb_from_zip(zip_path, extract_dir) -> Path:
    """Descomprime un ZIP y devuelve la ruta a la carpeta .gdb que contiene."""
    extract_dir = Path(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(extract_dir)
    except zipfile.BadZipFile as exc:
        raise GeodatabaseValidationError(
            "El archivo ZIP no es valido o esta corrupto"
        ) from exc

    gdb_dirs = sorted(p for p in extract_dir.rglob("*.gdb") if p.is_dir())
    if not gdb_dirs:
        raise GeodatabaseValidationError(
            "El ZIP no contiene una carpeta .gdb"
        )
    return gdb_dirs[0]


@lru_cache(maxsize=8)
def load_terrain_geometries(gdb_path: str) -> gpd.GeoDataFrame:
    frames = []

    for layer_name, zone_name in TERRENO_LAYERS:
        frame = gpd.read_file(gdb_path, layer=layer_name)
        frame = frame[["CODIGO", "geometry"]].copy()
        frame["CODIGO"] = frame["CODIGO"].astype(str).str.strip()
        frame["zona_geografica"] = zone_name
        frame["capa_origen"] = layer_name
        frames.append(frame)

    terrain = pd.concat(frames, ignore_index=True)
    terrain = gpd.GeoDataFrame(terrain, geometry="geometry", crs=frames[0].crs)
    terrain = terrain.to_crs(WEB_CRS)
    terrain["geometry"] = terrain.geometry.simplify(0.00001, preserve_topology=True)
    return terrain


def _clean_value(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value


def _to_numeric(series):
    return pd.to_numeric(series, errors="coerce")


def _add_avaluo_year1_fields(df):
    required_columns = {"AVALUO", "AVALUO_ACTUALIZADO"}
    if not required_columns.issubset(df.columns):
        return df

    base = _to_numeric(df["AVALUO"])
    updated = _to_numeric(df["AVALUO_ACTUALIZADO"])
    has_values = base.notna() & updated.notna()
    can_calculate_pct = has_values & (base > 0)

    diff = pd.Series([None] * len(df), index=df.index, dtype="Float64")
    pct = pd.Series([None] * len(df), index=df.index, dtype="Float64")
    diff.loc[has_values] = updated.loc[has_values] - base.loc[has_values]
    pct.loc[can_calculate_pct] = (
        diff.loc[can_calculate_pct] / base.loc[can_calculate_pct]
    ) * 100

    df["DIFERENCIA_AVALUO"] = diff
    df["VARIACION_AVALUO_PCT"] = pct
    return df


def _prepare_attributes(records, context=None):
    if not records:
        return pd.DataFrame(columns=["NUMERO_PREDIAL"])

    df = pd.DataFrame(records).copy()
    if "NUMERO_PREDIAL" not in df.columns:
        return pd.DataFrame(columns=["NUMERO_PREDIAL"])

    df["NUMERO_PREDIAL"] = df["NUMERO_PREDIAL"].astype(str).str.strip()
    df = df.drop_duplicates(subset="NUMERO_PREDIAL", keep="first")

    keep_columns = [
        "NUMERO_PREDIAL",
        "DESTINACION_ECONOMICA",
        "EQUIVALENCIA_DESTINO",
        "ZONA",
        "ESTRATO",
        "AREA_TERRENO",
        "AREA_CONSTRUIDA",
        "AREA_HECTAREAS",
        "AVALUO",
        "AVALUO_ACTUALIZADO",
        "AVALUO_SMMLV",
        "AVALUO_UVT",
        "AVALUO_ACTUALIZADO_SMMLV",
        "AVALUO_ACTUALIZADO_UVT",
        "TARIFA",
        "VALOR_LIQUIDADO",
        "VALOR_LIQUIDADO_ACTUALIZADO",
        "PAGO",
        "CRITERIO_DESTINO",
        "CRITERIO_TAMANO",
        "CRITERIO_HABITACIONAL",
        "CRITERIO_COMPLEMENTO",
        "CRITERIO_EXCLUIDO",
    ]
    if context == "avaluo_year1":
        df = _add_avaluo_year1_fields(df)
        keep_columns.extend([
            "DIFERENCIA_AVALUO",
            "VARIACION_AVALUO_PCT",
        ])

    if context in ("tarifa_year1", "tarifa_year2"):
        keep_columns.extend([
            "TARIFA_ORIGINAL",
            "TARIFA_NUEVA",
            "PREDIO_AFECTADO",
            "VALOR_LIQUIDADO_ORIGINAL",
            "VALOR_LIQUIDADO_MODIFICADO",
            "DIFERENCIA_LIQUIDACION",
        ])

    if context == "tarifa_year2":
        keep_columns.append("CATEGORIA_PREDIO")

    existing_columns = [col for col in keep_columns if col in df.columns]
    return df[existing_columns]


def build_predios_geojson(records, gdb_path, context=None):
    if not gdb_path:
        raise ValueError("gdb_path es requerido para construir el GeoJSON de predios")

    terrain = load_terrain_geometries(str(gdb_path))
    attributes = _prepare_attributes(records, context=context)

    merged = terrain.merge(
        attributes,
        left_on="CODIGO",
        right_on="NUMERO_PREDIAL",
        how="left",
    )
    merged["coincide_tabla"] = merged["NUMERO_PREDIAL"].notna()

    features = []
    for feature in merged.iterfeatures(na="null"):
        properties = {
            key: _clean_value(value)
            for key, value in feature.get("properties", {}).items()
        }
        features.append(
            {
                "type": "Feature",
                "geometry": feature.get("geometry"),
                "properties": properties,
            }
        )

    matched = int(merged["coincide_tabla"].sum())
    total_geometries = int(len(merged))
    table_count = int(len(attributes))

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total_geometrias": total_geometries,
            "total_registros_tabla": table_count,
            "coincidencias": matched,
            "sin_tabla": total_geometries - matched,
            "sin_geometria": max(table_count - matched, 0),
            "crs": WEB_CRS,
            "capas": [layer for layer, _ in TERRENO_LAYERS],
        },
    }
