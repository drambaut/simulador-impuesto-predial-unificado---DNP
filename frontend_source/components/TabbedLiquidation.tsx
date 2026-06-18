import { Tabs, Tab, Row } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/LiquidationBase.css';
import LiquidationBase from './LiquidationBase';
import LiquidationProjected from './LiquidationProjected';

const TabbedLiquidation = ({ dataId, parameters, modules }: { dataId: string; parameters: any, modules: number }) => {

    return (
        <div className="tabbed-dashboard-container">
          <Row>
            <label className="component-title">Proyección del IPU</label>
          </Row>
          <Tabs
            defaultActiveKey={
              modules === 1 || modules === 3
              ? "year_0"
              : modules === 2
              ? "year_1"
              : "year_0"
            }
            id="liquidation-tabs"
            className="mb-3">
            {(modules === 1 || modules === 3) && (
              <Tab eventKey="year_0" title="Año 1">
                <div className="tab-content">
                  <LiquidationBase dataId={dataId} initialCoefficient={parameters?.valuationCoefficient || 0.6} parameters={parameters} />
                </div>
              </Tab>
            )}
            {
              modules > 1 && (
                <Tab eventKey="year_1" title="Año 2">
                  <div className="tab-content">
                    <LiquidationProjected dataId={dataId} parameters={parameters} />
                  </div>

                </Tab>
              )}
      </Tabs>
      <div>
        <strong className="disclamer">*Resultados aproximados al calcularse sobre valores agregados.</strong>
      </div>
      <div>
        <strong className="disclamer">*Las estimaciones de liquidacion del IPU les aplica de manera conjunta: - Ley 44 de 1990. - Ley 1995 de 2019.</strong>
      </div>
    </div>
  );
};

export default TabbedLiquidation;
