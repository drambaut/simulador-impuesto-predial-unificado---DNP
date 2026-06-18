// Scenarios.tsx
import React, { useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Scenario, TariffSimulatorConfig } from '../types';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import '../styles/Scenarios.css';

function getVariationColor(variationPct: number, maxPct = 50): string {
  const ratio = Math.min(Math.abs(variationPct), maxPct) / maxPct;
  const neutral = { r: 102, g: 102, b: 102 };
  const posEnd = { r: 0, g: 128, b: 0 };
  const negEnd = { r: 128, g: 0, b: 0 };
  const end = variationPct >= 0 ? posEnd : negEnd;
  const r = Math.round(neutral.r + (end.r - neutral.r) * ratio);
  const g = Math.round(neutral.g + (end.g - neutral.g) * ratio);
  const b = Math.round(neutral.b + (end.b - neutral.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

interface ScenarioListProps {
  scenarios: Scenario[];
  setScenarios: React.Dispatch<React.SetStateAction<Scenario[]>>;
  config: TariffSimulatorConfig;
}

const Scenarios: React.FC<ScenarioListProps> = ({ scenarios, setScenarios, config }) => {
  const lastRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scenarios]);

  const deleteScenario = (num: number) => {
    setScenarios(prev => prev.filter(s => s.scenarioNumber !== num));
  };

  const fmt = (value: number, opts: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat('es-CO', opts).format(value);

  const pct = (oldVal: number, newVal: number) => ((newVal - oldVal) / oldVal) * 100;

  return (
    <div className="scenarios-container">
      {scenarios.map((sc, i) => {
        const variationPct = pct(sc.total_liq_update, sc.total_liq_update_tariff);
        return (
          <div
            key={sc.scenarioNumber}
            className="scenario-card"
            ref={i === scenarios.length - 1 ? lastRef : null}
          >
            <div className="left-accent-bar blue-bar" />
            <div className="card-header">
              <h5>Escenario {sc.scenarioNumber}</h5>
              <div className="actions">
                <FontAwesomeIcon
                  icon={faTrash}
                  className="trash-icon"
                  onClick={() => deleteScenario(sc.scenarioNumber)}
                />
                <FontAwesomeIcon
                  icon={faList}
                  className="info-icon"
                  data-tooltip-id={`tip-${i}`}
                />
              </div>
              <ReactTooltip id={`tip-${i}`} place="bottom" className="tooltip">
                <div className="tooltip-content">
                  <p><strong>Tarifa:</strong> {sc.parameters.tariff ?? 'N/A'}</p>
                  <p><strong>Zona:</strong> {sc.parameters.zone === 0 ? 'Rural' : sc.parameters.zone === 1 ? 'Urbano' : 'Ambas'}</p>
                  {['area','valuation','valuation_smmlv','valuation_uvt'].map(field => {
                    const val = (sc.parameters as any)[field];
                    const display = val && typeof val === 'object' && val.min != null ? `${val.min} - ${val.max}` : 'N/A';
                    return <p key={field}><strong>{field.replace('_',' ')}:</strong> {display}</p>;
                  })}
                  <p><strong>Destinación Económica:</strong> {sc.parameters.destination?.join(', ') || 'N/A'}</p>
                </div>
              </ReactTooltip>
            </div>
            <div className="card-content">
              <div className="row-item affected">
                <span className="label">Predios con Modificacion de Tarifas:</span>
                <span className="affected-count">{fmt(sc.lot_count)}</span>
              </div>

              <div className="row-item inline-change nowrap">
                <span className="label-left">Tarifa Promedio</span>
                <span className="value">{fmt(sc.average_tariff, { maximumFractionDigits: 2 })}</span>
                <span className="arrow">→</span>
                <span className="value">{fmt(sc.parameters.tariff ?? 0, { maximumFractionDigits: 2 })}</span>
                <span className="label-right">Tarifa Nueva</span>
              </div>

              <div className="row-item inline-change nowrap">
                <span className="label-left">Estimación liquidación IPU sin cambios</span>
                <span className="value">{fmt(sc.total_liq_update, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>
                <span className="arrow">→</span>
                <span className="value">{fmt(sc.total_liq_update_tariff, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>
                <span className="label-right">Estimación liquidación IPU con cambio tarifa</span>
              </div>

              <div className="row-item centered">
                <span className="label">Cambio en la Liquidación:</span>
                <span className="value">{fmt(sc.delta_liq, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>
              </div>

              <div className="row-item centered">
                <span className="label">Variación Porcentual:</span>
                <span
                  className="badge variation-badge"
                  style={{ backgroundColor: getVariationColor(variationPct, 1) }}
                >
                  {variationPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Scenarios;
