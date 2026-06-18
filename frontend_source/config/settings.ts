import { excelToDTO } from '../mapper/dtoMapper';
import {sendData} from "../requests/sendIPU";

export interface Template {
    id: TemplateType;
    name: string;
    sheets: Sheet[];
}

export interface Sheet {
    sName: string;
    headers: string[];
    headerComments?: (string | undefined)[];
}

export interface IdentifyTemplate {
    index: number;
    templateId: TemplateType;
    templateName: string;
    sheetName: string;
    sheetIndex: number;
}

export interface ProcessedData {
  template: TemplateType;
  data: { [sheetName: string]: any[][] };
  templateName: string;
}

export interface Executioner {
  template: TemplateType;
  mapData: (data: { [sheetName: string]: any[][] }, parameters: any) => PayloadType;
  sendData: (dto: PayloadType) => Promise<any>;
}

export type TemplateType = 'template0' | 'data';

export type PayloadType = {
    [sheetName: string]: any[];
};

export const template: Template =
    {
      id: 'data',
      name: "Informacion de Proyeccion",
      sheets: [
        {
          sName: 'base_catastral_0',
          headers: [
            "NUMERO_PREDIAL",
            "NUMERO_ORDEN",
            "DESTINACION_ECONOMICA",
            "AREA_TERRENO",
            "AREA_CONSTRUIDA",
            "AVALUO"
          ],
          headerComments: [
            'Tipo: texto. Debe tener 30 caracteres, de acuerdo con la estructura definida por el Instituto Geográfico Agustín Codazzi.',
            'El predio puede tener asociado uno o varios interesados. Si la base catastral de su gestor no tiene la información “número de orden”, deje esa columna en blanco.',
            'Tipo:texto, por ejemplo la letra "D". Incluir solo la codificación. La destinación económica  es la clasificación que se da a cada inmueble en su conjunto -terreno y unidades de construcción-, en el momento de la identificación predial de conformidad con la actividad predominante que en él se desarrolle. (Resolución 746, 2024, IGAC). Las equivalencias de la codificación se incluyen en la hoja "destinacion_economica".',
            'Debe ser un valor numérico, sin puntos, ni comas, medido en mt2.',
            'Debe ser un valor numérico, sin puntos, ni comas, medido en mt2.',
            'Debe ser un valor numérico, sin puntos, ni comas.'
          ]
        },
        {
          sName: 'base_catastral_1',
          headers: [
            "NUMERO_PREDIAL",
            "NUMERO_ORDEN",
            "DESTINACION_ECONOMICA",
            "AREA_TERRENO",
            "AREA_CONSTRUIDA",
            "AVALUO"
          ],
          headerComments: [
            'Tipo: texto. Debe tener 30 caracteres, de acuerdo con la estructura definida por el Instituto Geográfico Agustín Codazzi.',
            'El predio puede tener asociado uno o varios interesados. Si la base catastral de su gestor no tiene la información “número de orden”, deje esa columna en blanco.',
            'Tipo:texto, por ejemplo la letra "D". Incluir solo la codificación. La destinación económica  es la clasificación que se da a cada inmueble en su conjunto -terreno y unidades de construcción-, en el momento de la identificación predial de conformidad con la actividad predominante que en él se desarrolle. (Resolución 746, 2024, IGAC). Las equivalencias de la codificación se incluyen en la hoja "destinacion_economica".',
            'Debe ser un valor numérico, sin puntos, ni comas, medido en mt2.',
            'Debe ser un valor numérico, sin puntos, ni comas, medido en mt2.',
            'Debe ser un valor numérico, sin puntos, ni comas.'
          ]
        },
        {
          sName: 'base_liquidacion_0',
          headers: [
                    "NUMERO_PREDIAL",
                    "TARIFA",
                    "ESTRATO",
                    "VALOR_LIQUIDADO",
                    "PAGO"
          ],
          headerComments: [
            'Tipo: texto. Debe tener 30 caracteres, de acuerdo con la estructura definida por el Instituto Geográfico Agustín Codazzi.',
            'La tarifa por mil correspondiente al predio, debe ser un valor numérico. Si por ejemplo la tarifa es 5 por mil, en la casilla debe ir el número 5.',
            'Debe ir el número de estrato correspondiente. Debe ser un valor numérico, sin puntos, ni comas. Si no tiene información de estrato, deje en blanco.',
            'Debe ser un valor numérico, sin puntos, ni comas.',
            'Coloque 1 si pagó el IPU en el año de reporte, coloque 2 si no pagó. Por ejemplo, si está cargando la información del año 2026, coloca 1 si el contribuyente pagó el IPU en el año 2026.'
          ]
        },
        {
          sName: 'base_liquidacion_1',
          headers: [
                    "NUMERO_PREDIAL",
                    "TARIFA",
                    "ESTRATO",
                    "VALOR_LIQUIDADO",
                    "PAGO"
          ],
          headerComments: [
            'Tipo: texto. Debe tener 30 caracteres, de acuerdo con la estructura definida por el Instituto Geográfico Agustín Codazzi.',
            'La tarifa por mil correspondiente al predio, debe ser un valor numérico. Si por ejemplo la tarifa es 5 por mil, en la casilla debe ir el número 5.',
            'Debe ir el número de estrato correspondiente. Debe ser un valor numérico, sin puntos, ni comas. Si no tiene información de estrato, deje en blanco.',
            'Debe ser un valor numérico, sin puntos, ni comas.',
            'Coloque 1 si pagó el IPU en el año de reporte, coloque 2 si no pagó. Por ejemplo, si está cargando la información del año 2026, coloca 1 si el contribuyente pagó el IPU en el año 2026.'
          ]
        },
        {
          sName: 'destinacion_economica',
          headers: []
          }
        ]
      };


export const ExecutionerList: Executioner[] = [
    { template: 'data', mapData: excelToDTO, sendData: sendData },
];
