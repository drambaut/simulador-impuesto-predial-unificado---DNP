import {arraysContainSameElements} from './validationUtils';
import {IdentifyTemplate, Template} from '../config/settings';

const findHeaderPositions = (row: any[], expectedHeaders: string[]): number[] => {
    const headerPositions: number[] = [];
  
    expectedHeaders.forEach(header => {
        const index = row.indexOf(header);
        if (index !== -1) {
            headerPositions.push(index);
        } else {
            throw new Error("Invalid Header in File");
        }
    });

    return headerPositions;
};

export const getTemplateFromData = (
        data: { [sheetName: string]: any[][] },
        template: Template
      ): IdentifyTemplate => {
        for (const [sheetName, sheetData] of Object.entries(data)) {
          for (let j = 0; j < template.sheets.length; j++) {
            const sheetTemplate = template.sheets[j];
            if (sheetName === sheetTemplate.sName) {
              const expectedHeaders = sheetTemplate.headers.map((h) => h.trim().toLowerCase());
              const dataHeaders = sheetData[0].map((h: string) => h.trim().toLowerCase());
              if (arraysContainSameElements(dataHeaders, expectedHeaders)) {
                return {
                  index: 0,
                  templateId: template.id,
                  templateName: template.name,
                  sheetName: sheetName,
                  sheetIndex: j,
                };
              }
            }
          }
        }

        throw new Error('Template not found in the data');
      };

export const getDataFromTable = (
        data: { [sheetName: string]: any[][] },
        identifyTemplate: IdentifyTemplate,
        template: Template
      ) => {
        const sheetData = data[identifyTemplate.sheetName];
        if (!sheetData) {
          throw new Error(`Sheet ${identifyTemplate.sheetName} not found in the data`);
        }

        const sheetTemplate = template.sheets[identifyTemplate.sheetIndex];
        const headers = sheetTemplate.headers;

        return sheetData.slice(1).map((row) => {
          const obj: { [key: string]: any } = {};
          for (let i = 0; i < headers.length; i++) {
            obj[headers[i]] = row[i];
          }
          return obj;
        });
      };

export const jsonArrayToMatrix = (
        jsonArray: any[],
        template: Template,
        sheetIndex: number
      ): any[][] => {
        const sheet = template.sheets[sheetIndex];
        if (!sheet) {
          throw new Error(
            `Sheet with index ${sheetIndex} not found in template ${template.name}`
          );
        }

        const headers = [...sheet.headers, 'message'];
        console.log('Generating the Excel file. This should only appear once.');
        const data = jsonArray.map(obj => headers.map(header => obj[header]));
        return [headers, ...data];
      };
