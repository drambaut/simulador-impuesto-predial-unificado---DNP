import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {Template} from "../config/settings";

export const parseExcelFile = async (file: File): Promise<{ [sheetName: string]: any[][] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (evt: ProgressEvent<FileReader>) => {
      const bstr = evt.target?.result;
      if (!bstr) {
        reject('Failed to read file');
        return;
      }

      const wb = XLSX.read(bstr, { type: 'binary' });
      const sheetsData: { [sheetName: string]: any[][] } = {};

      wb.SheetNames.forEach((sheetName) => {
        const ws = wb.Sheets[sheetName];
        // Cast the result to 'any[][]' to match the expected type
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        sheetsData[sheetName] = data;
      });

      resolve(sheetsData);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
};

export const generateExcelFile = (
    template: Template,
    dataArrays: any[][][] = [],
    fileName?: string
  ) => {
    const wb = XLSX.utils.book_new();

    template.sheets.forEach((sheet, index) => {
      // 1) prepare the raw data: either your data or just the headers row
      const data = dataArrays[index] || [sheet.headers];
      const ws = XLSX.utils.aoa_to_sheet(data);

      // 2) set column widths based on header text length
      const headerRow = data[0] as string[];
      ws['!cols'] = headerRow.map(h => ({ wch: (h?.length || 10) + 2 }));

      // 3) **inject comments** on each header cell, if provided
      if (sheet.headerComments) {
        sheet.headerComments.forEach((comment, colIdx) => {
          if (!comment) return;                    // skip empty comments
          const cellRef = XLSX.utils.encode_cell({ c: colIdx, r: 0 });
          const cell = ws[cellRef];
          if (!cell) return;
          // initialize the comments array if needed
          cell.c = cell.c || [];
          cell.c.hidden = true;
          // push a new comment object
          cell.c.push({
            t: comment,  // text
            a: 'Sistema' // author (you can customize)
          });
        });
      }

      XLSX.utils.book_append_sheet(wb, ws, sheet.sName);
    });

    // write & download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, fileName || `${template.name}.xlsx`);
  };

