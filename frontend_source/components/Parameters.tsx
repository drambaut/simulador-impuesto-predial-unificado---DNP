import React, { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import '../styles/Parameters.css';

//@ts-ignore
const Parameters = ({ parameters, onParametersChange }) => {
  const [valuationCoefficient] = useState(parameters.valuationCoefficient || 80);
  const [smmlvC, setSmmlvC] = useState(parameters.smmlvC || '');
  const [smmlvP, setSmmlvP] = useState(parameters.smmlvP || '');
  const [expectedInflation, setExpectedInflation] = useState(parameters.expectedInflation || '');
  const [uvtC, setUvtC] = useState(parameters.uvtC || '');
  const [uvtP, setUvtP] = useState(parameters.uvtP || '');
  const [projectedRuralProperties, setProjectedRuralProperties] = useState(parameters.projectedRuralProperties || '');
  const [projectedUrbanProperties, setProjectedUrbanProperties] = useState(parameters.projectedUrbanProperties || '');
  const [comercialValueU, setcomercialValueU] = useState(parameters.comercialValueU || '');
  const [comercialValueR, setcomercialValueR] = useState(parameters.comercialValueR || '');

  //@ts-ignore
  const handleComercialRChange = (values) => {
    const { value } = values; // Unformatted value
    setcomercialValueR(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation,
      uvtC,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueR: value,
      comercialValueU
    });
  };

  //@ts-ignore
  const handleComercialUChange = (values) => {
    const { value } = values; // Unformatted value
    setcomercialValueU(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation,
      uvtC,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueR,
      comercialValueU: value
    });
  };

  //@ts-ignore
  const handleSmmlvCChange = (values) => {
    const { value } = values; // Unformatted value
    setSmmlvC(value < 1000000 ? 1000000 : value);
    onParametersChange({
      valuationCoefficient,
      smmlvC: value,
      smmlvP,
      expectedInflation,
      uvtC,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueR,
      comercialValueU
    });
  };

  //@ts-ignore
  const handleSmmlvPChange = (values) => {
    const { value } = values; // Unformatted value
    setSmmlvP(value < 1000000 ? 1000000 : value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP: value,
      expectedInflation,
      uvtC,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueR,
      comercialValueU
    });
  };

  //@ts-ignore
  const handleExpectedInflationChange = (e) => {
    let value = e.target.value;
    if (value === '') {
      setExpectedInflation('');
      return;
    }
    if (Number(value) > 20) {
      value = '20';
    } else if (Number(value) < 1) {
      value = '1';
    }
    setExpectedInflation(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation: value,
      uvtC,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueU,
      comercialValueR
    });
  };

  //@ts-ignore
  const handleUvtCChange = (values) => {
    const { value } = values; // Unformatted value
    setUvtC(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation,
      uvtC: value,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueR,
      comercialValueU
    });
  };

  //@ts-ignore
  const handleUvtPChange = (values) => {
    const { value } = values; // Unformatted value
    setUvtP(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation,
      uvtC,
      uvtP: value,
      projectedRuralProperties,
      projectedUrbanProperties,
      comercialValueR,
      comercialValueU
    });
  };

  //@ts-ignore
  const handleProjectedRuralPropertiesChange = (e) => {
    const value = e.target.value;
    setProjectedRuralProperties(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation,
      uvtC,
      uvtP,
      projectedRuralProperties: value,
      projectedUrbanProperties,
      comercialValueR,
      comercialValueU
    });
  };

  //@ts-ignore
  const handleProjectedUrbanPropertiesChange = (e) => {
    const value = e.target.value;
    setProjectedUrbanProperties(value);
    onParametersChange({
      valuationCoefficient,
      smmlvC,
      smmlvP,
      expectedInflation,
      uvtC,
      uvtP,
      projectedRuralProperties,
      projectedUrbanProperties: value,
      comercialValueR,
      comercialValueU
    });
  };

return (
    <div>
      <h2 className="title">Parámetros de Proyección</h2>

      <div className="parameters-grid">
        {/* Existing parameter groups, unchanged */}
        <div className="parameter-group">
          <label htmlFor="smmlvC">SMMLV Año 1:</label>
          <NumericFormat
            id="smmlvC"
            name="smmlvC"
            value={smmlvC}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="$ "
            onValueChange={handleSmmlvCChange}
            placeholder="Ingrese el SMMLV proyectado para el año 1"
            className="currency-input"
            isAllowed={(values) => {
              const { floatValue } = values;
              return (
                floatValue === undefined ||
                (floatValue >= 0 && floatValue <= 2000000)
              );
            }}
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="smmlvP">SMMLV Año 2:</label>
          <NumericFormat
            id="smmlvP"
            name="smmlvP"
            value={smmlvP}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="$ "
            onValueChange={handleSmmlvPChange}
            placeholder="Ingrese el SMMLV proyectado para el año siguiente"
            className="currency-input"
            isAllowed={(values) => {
              const { floatValue } = values;
              return (
                floatValue === undefined ||
                (floatValue >= 0 && floatValue <= 2000000)
              );
            }}
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="uvtP">UVT Año 1:</label>
          <NumericFormat
            id="uvtC"
            name="uvtC"
            value={uvtC}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="$ "
            onValueChange={handleUvtCChange}
            placeholder="Ingrese la UVT proyectada para el año 1"
            className="currency-input"
            isAllowed={(values) => {
              const { floatValue } = values;
              return (
                floatValue === undefined ||
                (floatValue >= 0 && floatValue <= 100000)
              );
            }}
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="uvtP">UVT Año 2:</label>
          <NumericFormat
            id="uvtP"
            name="uvtP"
            value={uvtP}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="$ "
            onValueChange={handleUvtPChange}
            placeholder="Ingrese la UVT proyectada para el año 2"
            className="currency-input"
            isAllowed={(values) => {
              const { floatValue } = values;
              return (
                floatValue === undefined ||
                (floatValue >= 0 && floatValue <= 100000)
              );
            }}
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="projectedRuralProperties">Predios Rurales Proyectados:</label>
          <input
            type="number"
            id="projectedRuralProperties"
            name="projectedRuralProperties"
            value={projectedRuralProperties}
            onChange={handleProjectedRuralPropertiesChange}
            placeholder="Ingrese el número proyectado de predios rurales"
            min="0"
            step="1"
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="projectedUrbanProperties">Predios Urbanos Proyectados:</label>
          <input
            type="number"
            id="projectedUrbanProperties"
            name="projectedUrbanProperties"
            value={projectedUrbanProperties}
            onChange={handleProjectedUrbanPropertiesChange}
            placeholder="Ingrese el número proyectado de predios urbanos"
            min="0"
            step="1"
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="smmlvP">Valor Comercial Rural:</label>
          <NumericFormat
            id="comercialValueR"
            name="comercialValueR"
            value={comercialValueR}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="$ "
            onValueChange={handleComercialRChange}
            placeholder="Ingrese el Valor Comercial Rural"
            className="currency-input"
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="smmlvP">Valor Comercial Urbano:</label>
          <NumericFormat
            id="comercialValueU"
            name="comercialValueU"
            value={comercialValueU}
            thousandSeparator="."
            decimalSeparator=","
            decimalScale={2}
            fixedDecimalScale
            prefix="$ "
            onValueChange={handleComercialUChange}
            placeholder="Ingrese el Valor Comercial Urbano"
            className="currency-input"
          />
        </div>

        <div className="parameter-group">
          <label htmlFor="expectedInflation">Inflación Esperada (%):</label>
          <input
            type="number"
            id="expectedInflation"
            name="expectedInflation"
            value={expectedInflation}
            onChange={handleExpectedInflationChange}
            placeholder="Ingrese la estimación de la meta de inflación"
            min="1"
            max="20"
            step="0.01"
          />
        </div>

      </div>
    </div>
  );
};

export default Parameters;
