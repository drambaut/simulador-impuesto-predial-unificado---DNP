import { template } from '../config/settings';

export const excelToDTO = (
    data: { [sheetName: string]: any[][] },
    params: any
  ): any => { // Corrected the return type to `any`
    const result: any = { params };

  // Map for all sheets, adding to result
  [
    'base_catastral_0',
    'base_liquidacion_0',
    'base_catastral_1',
    'base_liquidacion_1',
    'destinacion_economica'
  ].forEach(sheetName => {
    const sheetData = data[sheetName];
    if (!sheetData || sheetData.length === 0) {
      return;
    }

    const sheetTemplate = template.sheets.find(sheet => sheet.sName === sheetName);
    if (!sheetTemplate) {
      return;
    }

    const headers = sheetTemplate.headers && sheetData[0];
    const mappedData = [];

    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const obj: any = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        obj[header] = row[j];
      }

      mappedData.push(obj);
    }

    result[sheetName] = mappedData;
  });

  return result; // Return `result` directly without wrapping it
};
