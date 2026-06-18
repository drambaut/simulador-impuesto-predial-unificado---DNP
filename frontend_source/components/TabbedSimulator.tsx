import React from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import TariffSimulator from "./TariffSimulator"; // Assuming TariffSimulator is in the same directory

const TabbedSimulator: React.FC<{ dataId: string, modules: number }> = ({ dataId, modules }) => {
  return (
    <div className="tariff-simulator-tabs-container">
      <strong className="disclamer">*La decision final es responsabilidad exclusiva del municipio, dentro de su ámbito de autonomía territorial y competencias legales.</strong>
      <Tabs
        defaultActiveKey={
          modules === 1 || modules === 3
          ? "year1"
          : modules === 2
          ? "year2"
          : "year1"
        }
        id="tariff-simulator-tabs"
        className="mb-3"
      >
        {(modules === 1 || modules === 3) && (
          <Tab eventKey="year1" title="Año 1">
            <div>
              <h2>Proyección del IPU con modificación de tarifas año 1</h2>
            </div>
            <strong className="disclamer">*Resultados aproximados al calcularse sobre valores agregados.</strong>
            <TariffSimulator
              dataId={dataId}
              config={{ dataSource: 'base' }}
            />
          </Tab>
        )}
        {modules > 1 && (
          <Tab eventKey="year2" title="Año 2">
            <div>
              <h2>Proyección del IPU con modificación de tarifas año 2</h2>
            </div>
            <strong className="disclamer">*Resultados aproximados al calcularse sobre valores agregados.</strong>
            <TariffSimulator
              dataId={dataId}
              config={{
                dataSource: 'projected'
              }}
            />
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

export default TabbedSimulator;
