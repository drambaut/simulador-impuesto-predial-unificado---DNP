import React, { useEffect, useState, useRef } from 'react';
import { Card, Container, Row, Col } from 'react-bootstrap';
import { calculateBaseLiquidationRequest } from '../requests/sendIPU';
import { NumericFormat } from 'react-number-format';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/LiquidationBase.css';
import _ from 'lodash';

interface LiquidationDataPoint {
  diff: number
  variation: number
  total: number
}

// Define LiquidationData interface
interface LiquidationData {
  projections: {
    previous_liquidation: {
      urbano: number;
      rural: number;
      total: number;
    }
    lower_limit: {
      urbano: LiquidationDataPoint;
      rural: LiquidationDataPoint;
      total: LiquidationDataPoint;
    };
    upper_limit: {
      urbano: LiquidationDataPoint;
      rural: LiquidationDataPoint;
      total: LiquidationDataPoint;
    };
    user_input: {
      urbano: LiquidationDataPoint;
      rural: LiquidationDataPoint;
      total: LiquidationDataPoint;
    };
  };
}

function getVariationColor(
  variationPct: number,
  maxPct = 1000
): string {
  // 1. normalize 0..1
  const ratio = Math.min(Math.abs(variationPct), maxPct) / maxPct;

  // 2. endpoints in RGB
  const neutralGray = { r: 102, g: 102, b: 102 };  // #666666
  const darkGreen   = { r:   0, g: 102, b:   0 };  // #006600
  const maroonRed   = { r: 128, g:   0, b:   0 };  // #800000

  const end = variationPct >= 0 ? darkGreen : maroonRed;

  // 3. lerp each channel
  const r = Math.round(neutralGray.r + (end.r - neutralGray.r) * ratio);
  const g = Math.round(neutralGray.g + (end.g - neutralGray.g) * ratio);
  const b = Math.round(neutralGray.b + (end.b - neutralGray.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

// UserScenarioCard Component for isolated re-renders
const UserScenarioCard = React.memo(({ coefficient, data }: { coefficient: number; data: LiquidationData | null }) => {
  return (
    <Card className="mb-4 lower-limit-card">
      <div className="left-accent-bar blue-bar"></div>
      <Card.Body>
        <Card.Title>Simulación (Coeficiente: {coefficient}%)</Card.Title>
        {data ? (
          <div className="zone-grid">
            {(["urbano","rural","total"] as const).map(zoneKey => {
              const zone = data.projections.user_input[zoneKey];
              const variationPct = zone.variation * 100;
              return (
                <div key={zoneKey} className="zone">
                  <div className="zone-total">
                    {zoneKey.charAt(0).toUpperCase() + zoneKey.slice(1)}:{" "}
                    <NumericFormat
                      value={zone.total}
                      displayType="text"
                      thousandSeparator
                      prefix="$ "
                      decimalScale={0}
                      fixedDecimalScale
                    />
                  </div>
                  <div className="zone-meta">
                    <div>
                      <small>
                        Diff:{" "}
                        <NumericFormat
                          value={zone.diff}
                          displayType="text"
                          thousandSeparator
                          prefix="$ "
                          decimalScale={0}
                          fixedDecimalScale
                        />
                      </small>
                    </div>
                    <div>
                      <span
                        className="variation-badge"
                        style={{ backgroundColor: getVariationColor(variationPct) }}
                      >
                        {variationPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>Loading…</p>
        )}
      </Card.Body>
    </Card>
  );
});

// Main TotalLiquidation Component
const LiquidationBase = ({ dataId, initialCoefficient, parameters }: { dataId: string; initialCoefficient: number, parameters: any }) => {
  const [coefficient, setCoefficient] = useState(initialCoefficient * 100);
  const [data, setData] = useState<LiquidationData | null>(null);
  const [userScenarioData, setUserScenarioData] = useState<LiquidationData | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [comercialValueU] = useState(parameters.commercial_value_u || '');
  const [comercialValueR] = useState(parameters.commercial_value_r || '');
  const [projectedUrbanProperties] = useState(parameters.new_urban_properties || '');
  const [projectedRuralProperties] = useState(parameters.new_rural_properties || '');
  const [totalProjectedProperties, setTotalProjectedProperties] = useState(0);
  const [totalComercialValue, setTotalComercialValue] = useState(0);

  const calculateTotals = () => {
    setTotalProjectedProperties(projectedUrbanProperties + projectedRuralProperties);
    setTotalComercialValue(comercialValueU + comercialValueR);
  };

  useEffect(() => {
    calculateTotals();
  }, [comercialValueU, comercialValueR, projectedUrbanProperties, projectedRuralProperties]);

  // Function to call API to get data based on coefficient
  const fetchLiquidationData = async (dataId: string, coefficient: number) => {
    try {
      const result = await calculateBaseLiquidationRequest(dataId, coefficient / 100);
      setUserScenarioData(result);
    } catch (error) {
      console.error('Error fetching liquidation data:', error);
    }
  };

  // Debounce API request to avoid making too many calls during slider movement
  const debouncedFetch = useRef(
    _.debounce((newCoefficient) => {
      fetchLiquidationData(dataId, newCoefficient);
    }, 500)
  ).current;



  useEffect(() => {
    // Clean up on component unmount
    return () => {
      debouncedFetch.cancel();
    };
  }, [debouncedFetch]);

  const updateSliderFill = (newCoefficient: number) => {
    if (sliderRef.current) {
      const sliderHeight = sliderRef.current.clientHeight;
      const fillHeight = ((newCoefficient - 60) / 40) * sliderHeight;

      sliderRef.current.style.setProperty('--slider-fill-pixels', `${fillHeight}px`);

      const thumbElement = sliderRef.current.querySelector('.slider-thumb') as HTMLElement;
      if (thumbElement) {
        const thumbHeight = thumbElement.clientHeight;
        thumbElement.style.bottom = `${fillHeight - thumbHeight / 2}px`;
      }
    }
  };

  const handleCoefficientChange = (newCoefficient: number) => {
    setCoefficient(newCoefficient);
    debouncedFetch(newCoefficient);
    updateSliderFill(newCoefficient);
  };

  // Handle click on slider to set new coefficient
  const handleSliderClick = (e: React.MouseEvent) => {
    const slider = sliderRef.current;
    if (slider) {
      const sliderRect = slider.getBoundingClientRect();
      const clickPosition = Math.max(Math.min(e.clientY, sliderRect.bottom), sliderRect.top);
      const percentage = ((sliderRect.bottom - clickPosition) / sliderRect.height) * 100;
      const newCoefficient = Math.round((percentage * 0.4) + 60);
      handleCoefficientChange(newCoefficient);
    }
  };

  // Handle slider drag for smooth movement
  const handleMouseDown = (e: React.MouseEvent) => {
    const handleMouseMove = (e: MouseEvent) => {
      const slider = sliderRef.current;
      if (slider) {
        const sliderRect = slider.getBoundingClientRect();
        const newPosition = Math.max(Math.min(e.clientY, sliderRect.bottom), sliderRect.top);
        const percentage = ((sliderRect.bottom - newPosition) / sliderRect.height) * 100;
        const newCoefficient = Math.round((percentage * 0.4) + 60);
        handleCoefficientChange(newCoefficient);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Update the fill effect initially to match the coefficient
  useEffect(() => {
    updateSliderFill(coefficient);
  }, [coefficient]);

  // Initial API call when component mounts to load base data (excluding user scenario)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const result = await calculateBaseLiquidationRequest(dataId, coefficient / 100);
        setData(result);
        setUserScenarioData(result); // Ensure the user scenario card is filled on first load
        updateSliderFill(coefficient); // Fix slider position on first load
      } catch (error) {
        console.error('Error fetching initial liquidation data:', error);
      }
    };
    loadInitialData();
  }, [coefficient, dataId]);

  return (
    <div className="total-liquidation-container">
      <Container fluid>
        <Row>
          {/* Custom Vertical Slider - Coefficient */}
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            <div
              ref={sliderRef}
              className="custom-vertical-slider"
              onClick={handleSliderClick}
              onMouseDown={handleMouseDown}
            >
              <div
                className="slider-thumb"
                style={{ bottom: `${(coefficient - 60) * (100 / 40)}%` }}
              ></div>
            <label className="slider-label">Coeficiente de Avalúo Catastral: {coefficient}%</label>
            </div>
          </Col>

          {/* Cards Section */}
          <Col xs={11}>
            <Row>
              <div>
                <div className="parameters-grid">
                  {/* Existing parameter groups, unchanged */}

                  <div className="parameter-group">
                    <label htmlFor="projectedRuralProperties">Predios Rurales Proyectados:</label>
                    <NumericFormat
                      id="projectedRuralProperties"
                      name="projectedRuralProperties"
                      value={projectedRuralProperties}
                      thousandSeparator="."
                      decimalSeparator=","
                      placeholder="0"
                      disabled={true}
                    />
                  </div>

                  <div className="parameter-group">
                    <label htmlFor="comercialValueR">Valor Comercial Rural:</label>
                    <NumericFormat
                      id="comercialValueR"
                      name="comercialValueR"
                      value={comercialValueR}
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={0}
                      fixedDecimalScale
                      prefix="$ "
                      placeholder="$0"
                      className="currency-input"
                      disabled={true}
                    />
                  </div>

                  <div className="parameter-group">
                    <label htmlFor="projectedUrbanProperties">Predios Urbanos Proyectados:</label>
                    <NumericFormat
                      id="projectedUrbanProperties"
                      name="projectedUrbanProperties"
                      value={projectedUrbanProperties}
                      thousandSeparator="."
                      decimalSeparator=","
                      placeholder="0"
                      disabled={true}
                    />
                  </div>

                  <div className="parameter-group">
                    <label htmlFor="comercialValueU">Valor Comercial Urbano:</label>
                    <NumericFormat
                      id="comercialValueU"
                      name="comercialValueU"
                      value={comercialValueU}
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={0}
                      fixedDecimalScale
                      prefix="$ "
                      placeholder="$0"
                      className="currency-input"
                      disabled={true}
                    />
                  </div>

                  <div className="parameter-group">
                    <label htmlFor="projectedUrbanProperties">Predios Totales Proyectados:</label>
                    <NumericFormat
                      id="projectedUrbanProperties"
                      name="projectedUrbanProperties"
                      value={totalProjectedProperties}
                      thousandSeparator="."
                      decimalSeparator=","
                      placeholder="0"
                      disabled={true}
                    />
                  </div>

                  <div className="parameter-group">
                    <label htmlFor="comercialValueU">Valor Comercial Total:</label>
                    <NumericFormat
                      id="comercialValueU"
                      name="comercialValueU"
                      value={totalComercialValue}
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={0}
                      fixedDecimalScale
                      prefix="$ "
                      placeholder="$0"
                      className="currency-input"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </Row>
            <Row className="justify-content-center mb-5">
              <Col xs={10} md={6} lg={4}>
                <Card className="reference-card text-center">
                  <Card.Body>
                    <Card.Title>Liquidación del IPU antes de la Actualización Catastral</Card.Title>
                    <div className="reference-values">
                      <div className="ref-item">
                        <strong>Urbano:</strong>{" "}
                        <NumericFormat
                          value={data?.projections.previous_liquidation.urbano}
                          displayType="text"
                          thousandSeparator
                          prefix="$ "
                          decimalScale={0}
                          fixedDecimalScale
                        />
                      </div>
                      <div className="ref-item">
                        <strong>Rural:</strong>{" "}
                        <NumericFormat
                          value={data?.projections.previous_liquidation.rural}
                          displayType="text"
                          thousandSeparator
                          prefix="$ "
                          decimalScale={0}
                          fixedDecimalScale
                        />
                      </div>
                      <div className="ref-item">
                        <strong>Total:</strong>{" "}
                        <NumericFormat
                          value={data?.projections.previous_liquidation.total}
                          displayType="text"
                          thousandSeparator
                          prefix="$ "
                          decimalScale={0}
                          fixedDecimalScale
                        />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <h2 className="section-title">
                Escenarios Liquidación estimada del IPU
              </h2>
            </Row>

            <Row>
              {/*{/* Left Card - Lower Limit */}
              <Col xs={4}>
                <Card className="mb-4 lower-limit-card">
                  <div className="left-accent-bar red-bar"></div>
                  <Card.Body>
                    <Card.Title>Limite Inferior (Coeficiente: 60%)</Card.Title>
                    {data ? (
                      <div className="zone-grid">
                        {(["urbano","rural","total"] as const).map(zoneKey => {
                          const zone = data.projections.lower_limit[zoneKey];
                          const variationPct = zone.variation * 100;
                          return (
                            <div key={zoneKey} className="zone">
                              <div className="zone-total">
                                {zoneKey.charAt(0).toUpperCase() + zoneKey.slice(1)}:{" "}
                                <NumericFormat
                                  value={zone.total}
                                  displayType="text"
                                  thousandSeparator
                                  prefix="$ "
                                  decimalScale={0}
                                  fixedDecimalScale
                                />
                              </div>
                              <div className="zone-meta">
                                <div>
                                  <small>
                                    Diff:{" "}
                                    <NumericFormat
                                      value={zone.diff}
                                      displayType="text"
                                      thousandSeparator
                                      prefix="$ "
                                      decimalScale={0}
                                      fixedDecimalScale
                                    />
                                  </small>
                                </div>
                                <div>
                                  <span
                                    className="variation-badge"
                                    style={{ backgroundColor: getVariationColor(variationPct) }}
                                  >
                                    {variationPct.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p>Loading…</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/*{/* Middle Card - User Scenario */}
              <Col xs={4}>
                <UserScenarioCard coefficient={coefficient} data={userScenarioData} />
              </Col>

              {/*{/* Right Card - Upper Limit */}
              <Col xs={4}>
                <Card className="mb-4 lower-limit-card">
                  <div className="left-accent-bar green-bar"></div>
                  <Card.Body>
                    <Card.Title>Limite Superior (Coeficiente: 100%)</Card.Title>
                    {data ? (
                      <div className="zone-grid">
                        {(["urbano","rural","total"] as const).map(zoneKey => {
                          const zone = data.projections.upper_limit[zoneKey];
                          const variationPct = zone.variation * 100;
                          return (
                            <div key={zoneKey} className="zone">
                              <div className="zone-total">
                                {zoneKey.charAt(0).toUpperCase() + zoneKey.slice(1)}:{" "}
                                <NumericFormat
                                  value={zone.total}
                                  displayType="text"
                                  thousandSeparator
                                  prefix="$ "
                                  decimalScale={0}
                                  fixedDecimalScale
                                />
                              </div>
                              <div className="zone-meta">
                                <div>
                                  <small>
                                    Diff:{" "}
                                    <NumericFormat
                                      value={zone.diff}
                                      displayType="text"
                                      thousandSeparator
                                      prefix="$ "
                                      decimalScale={0}
                                      fixedDecimalScale
                                    />
                                  </small>
                                </div>
                                <div>
                                  <span
                                    className="variation-badge"
                                    style={{ backgroundColor: getVariationColor(variationPct) }}
                                  >
                                    {variationPct.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p>Loading…</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LiquidationBase;