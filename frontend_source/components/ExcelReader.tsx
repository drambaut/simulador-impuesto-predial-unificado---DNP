// src/components/ExcelReader.js

import React, { useState } from 'react';
import { parseExcelFile } from '../utils/excelUtils';
import { getTemplateFromData } from '../utils/tableUtils';
import '../styles/ExcelReader.css';
import LoadingOverlay from './LoadingOverlay';
import TemplateDownloader from './TemplateDownloader';
import { ProcessedData, IdentifyTemplate } from '../config/settings';
import { template } from '../config/settings';
import { useNavigate } from 'react-router-dom';
import {excelToDTO} from "../mapper/dtoMapper";
import {sendData} from "../requests/sendIPU";

// @ts-ignore
let globalDataId = null;
let modules = 0

// @ts-ignore
const ExcelReader = ({ parameters }) => {
  const [data, setData] = useState<ProcessedData>({
    data: {},
    template: 'template0',
    templateName: 'template0',
  });
  const [identifyTemplate, setIdentifyTemplate] = useState<IdentifyTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  // Handle file upload and parsing
  // @ts-ignore
  const handleFileUpload = async (event) => {
    const fileInput = event.target;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedData = await parseExcelFile(file);

      const identifyTemplate = getTemplateFromData(parsedData, template);
      setIdentifyTemplate(identifyTemplate);

      const output: ProcessedData = {
        data: parsedData,
        template: identifyTemplate.templateId,
        templateName: identifyTemplate.templateName,
      };

      setData(output);
    } catch (error) {
      console.error('Error parsing file:', error);
      fileInput.value = '';
      setData({ data: {}, template: 'template0', templateName: 'template0' });
      alert('File not supported by templates');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 369);
    }
  };

  // Handle sending data to API
  const handleSendData = async () => {
    if (!identifyTemplate) {
      alert('No se identifico la plantilla, por favor cargue un documento.');
      return;
    }

    // Validate parameters
    if (
      !parameters ||
      //parameters.smmlvP === '' ||
      parameters.expectedInflation === '' ||
      //parameters.uvtP === '' ||
      parameters.projectedRuralProperties === '' ||
      parameters.projectedUrbanProperties === '' ||
      parameters.comercialValueR === '' ||
      parameters.comercialValueU === ''
    ) {
      alert('Por favor diligenciar todos los parametros antes de proceder.');
      return;
    }

    if (parameters.uvtP && Number(parameters.uvtP) <= 40000) {
      alert('La UVT Proyectada no puede ser menor a $40.000.');
      return;
    }

    setLoading(true);

    try {
      const valuationCoefficient = Number(parameters.valuationCoefficient) / 100;
      const expectedInflationDecimal = Number(parameters.expectedInflation) / 100;

      const parsed = {
        expectedInflation: expectedInflationDecimal,
        valuationCoefficient: Number(valuationCoefficient),
        smmlvC: Number(parameters.smmlvC),
        smmlvP: Number(parameters.smmlvP || 0),
        uvtC: Number(parameters.uvtC),
        uvtP: Number(parameters.uvtP || 0),
        commercial_value_u: Number(parameters.comercialValueU),
        commercial_value_r: Number(parameters.comercialValueR),
        new_urban_properties: Number(parameters.projectedUrbanProperties),
        new_rural_properties: Number(parameters.projectedRuralProperties)
      };

      const payload = excelToDTO(data.data, parsed);
      const response = await sendData(payload)

      // @ts-ignore
      if (response && response.data_id) {
        // @ts-ignore
        globalDataId = response.data_id; // Store the data_id for later calculations
        modules = response.modules
      }

      // Navigate to the dashboard and pass the parameters
      // @ts-ignore
      navigate('/dashboard', { state: { parameters: parsed, dataId: globalDataId, modules: modules} });
    } catch (error) {
      console.error('Error sending data:', error);
      alert('Ocurrio un error al cargar la informacion, por favor valide la plantilla.')
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="excel-reader-container">
      {loading && (
        <div className="overlay-container">
          <LoadingOverlay progress={0} currentCount={0} totalCount={1} />
        </div>
      )}
      <TemplateDownloader />
      <h2 className="title">Cargar Base de Cálculo</h2>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="file-input" />
      <button onClick={handleSendData} className="button" disabled={loading}>Enviar</button>

      <strong className="disclamer">*Esta aplicacion no es un liquidador de IPU</strong>
    </div>
  );
};

export default ExcelReader;
