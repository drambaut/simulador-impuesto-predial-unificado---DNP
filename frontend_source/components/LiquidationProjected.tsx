import React, { useEffect, useState } from 'react';
import { Card, Container, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { calculateProjectedLiquidationRequest } from '../requests/sendIPU';
import { NumericFormat } from 'react-number-format';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/LiquidationProjected.css';

interface LiquidationData {
  current_liquidation: number
  projected_liquidation: number
  update_diff: number
  variation: number
}

function getVariationColor(variationPct: number, maxPct = 1000): string {
  const ratio = Math.min(Math.abs(variationPct), maxPct) / maxPct;
  const neutral = { r: 102, g: 102, b: 102 };    // #666666, passes AA
  const posEnd  = { r:   0, g: 102, b:   0 };    // #006600
  const negEnd  = { r: 128, g:   0, b:   0 };    // #800000
  const end = variationPct >= 0 ? posEnd : negEnd;

  const r = Math.round(neutral.r + (end.r - neutral.r) * ratio);
  const g = Math.round(neutral.g + (end.g - neutral.g) * ratio);
  const b = Math.round(neutral.b + (end.b - neutral.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}


// Main TotalLiquidation Component
const LiquidationProjected = ({ dataId, parameters }: { dataId: string; parameters: any }) => {
  const [data, setData] = useState<LiquidationData | null>(null);
  const [smmlvP, setSmmlvP] = useState(parameters.smmlvP || 1400000)
  const [expectedInflation, setExpectedInflation] = useState(
    parameters.expectedInflation != null
      ? parameters.expectedInflation * 100
      : 3
  );

  const fetchLiquidationData = async (id: string, inflationRate: number, smmlv: number) => {
    try {
      const res = await calculateProjectedLiquidationRequest(id, inflationRate, smmlv);
      setData({
        current_liquidation: res.current_liquidation,
        projected_liquidation: res.projected_liquidation,
        update_diff: res.update_diff,
        variation: res.variation * 100
      });
    } catch (err) {
      console.error('Error fetching liquidation data:', err);
    }
  };

  const renderTooltip = (text: string) => (
    <Tooltip>{text}</Tooltip>
  );
  const handleInflationChange = (values: { floatValue?: number }) => {
    const inflation = values.floatValue ?? 0
    if(0 <= inflation && inflation <= 20){
      setExpectedInflation(inflation);
    }
  };

  const handleSmmlvPChange = (values: { floatValue?: number }) => {
    const smmlv = values.floatValue ?? 0
    if(1300000 <= smmlv && smmlv <= 2000000){
      setSmmlvP(smmlv);
    }
  };

  useEffect(() => {
    fetchLiquidationData(dataId, expectedInflation / 100, smmlvP);
  }, [dataId, expectedInflation, smmlvP]);

  return (
    <div className="total-liquidation-container">
      <Container fluid>
        {/* Centered Card */}
        <Row>
          <div>
            <div className="parameters-grid">
              {/* Existing parameter groups, unchanged */}
              <div className="parameter-group">
                <label htmlFor="smmlvP">SMMLV Proyectado:</label>
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
                <label htmlFor="smmlvP">Inflación Esperada (%):</label>
                <NumericFormat
                  id="expectedInflation"
                  name="expectedInflation"
                  value={expectedInflation}
                  decimalSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  onValueChange={handleInflationChange}
                  placeholder="Ingrese la inflación proyectada para el año siguiente"
                  isAllowed={(values) => {
                    const { floatValue } = values;
                    return (
                      floatValue === undefined ||
                      (floatValue >= 0 && floatValue <= 20)
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </Row>
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <Card className="projected-card mb-4">
              <div className="left-accent-bar blue-bar" />
              <Card.Body className="text-center">
                <Card.Title>Liquidación Estimada del IPU Año 2</Card.Title>

                {data ? (
                  <>
                    <div className="projected-inline-wrapper">
                      <OverlayTrigger placement="bottom" overlay={renderTooltip('Total de liquidación del IPU del año en que entró en vigencia la actualización catastral') }>
                        <span className="side-label tooltip-label">Total Actual</span>
                      </OverlayTrigger>

                      <div className="projected-inline">
                        <NumericFormat
                          value={data.current_liquidation}
                          displayType="text"
                          thousandSeparator
                          prefix="$ "
                          decimalScale={0}
                          fixedDecimalScale
                        />
                        <span className="arrow">→</span>
                        <NumericFormat
                          value={data.projected_liquidation}
                          displayType="text"
                          thousandSeparator
                          prefix="$ "
                          decimalScale={0}
                          fixedDecimalScale
                        />
                      </div>

                      <OverlayTrigger placement="bottom" overlay={renderTooltip('Estimación de la liquidación del IPU para el segundo año en que entró en vigencia la actualización catastral')}>
                        <span className="side-label tooltip-label">Total Estimacion</span>
                      </OverlayTrigger>
                    </div>

                    <div className="projected-diff centered">
                      <strong>Diferencia:</strong>{' '}
                      <NumericFormat
                        value={data.update_diff}
                        displayType="text"
                        thousandSeparator
                        prefix="$ "
                        decimalScale={0}
                        fixedDecimalScale
                      />
                    </div>

                    <div className="projected-variation centered">
                      <span
                        className="variation-badge"
                        style={{ backgroundColor: getVariationColor(data.variation, 50) }}
                      >
                        {data.variation.toFixed(2)}%
                      </span>
                    </div>
                  </>
                ) : (
                  <p>Loading…</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LiquidationProjected;
