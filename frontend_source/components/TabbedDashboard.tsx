import { Tabs, Tab } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/LiquidationBase.css';
import Summary from './Summary';
import Dashboard from "./Dashboard";
import TabbedSimulator from "./TabbedSimulator";
import ArcGISMap from "./ArcGISMap";
import '@arcgis/core/assets/esri/themes/light/main.css';
import TabbedLiquidation from "./TabbedLiquidation";

// Main TabbedDashboard Component
const TabbedDashboard = () => {
  const location = useLocation();
  const { parameters, dataId, modules } = location.state || {}; // Retrieve parameters from navigation state

    return (
        <div className="tabbed-dashboard-container">
          <Tabs
            defaultActiveKey={
              modules === 1 || modules === 3
                ? "summary"
                : modules === 2
                ? "tabLiquidation"
                : "summary"
            }
            id="dashboard-tabs"
            className="mb-3"
          >
            {(modules === 1 || modules === 3) && (
              <Tab eventKey="summary" title="Resumen">
                <div className="tab-content">
                  <Summary dataId={dataId} />
                </div>
              </Tab>
            )}
            <Tab eventKey="tabLiquidation" title="Avalúo Catastral">
              <div className="tab-content">
                <TabbedLiquidation dataId={dataId} parameters={parameters} modules={modules} />
          </div>
        </Tab>
        <Tab eventKey="simulator" title="Modificación Tarifas">
          <div className="tab-content">
            <TabbedSimulator dataId={dataId} modules={modules} />
          </div>
        </Tab>
        {/*{ full ? (*/}
        {/*    <Tab eventKey="dymmy" title="Hallazgos">*/}
        {/*      <div className="tab-content">*/}
        {/*        <Dashboard dataId={dataId} />*/}
        {/*      </div>*/}

        {/*    </Tab>*/}
        {/*  ) : (<div></div>)*/}
        {/*}*/}
        {/*<Tab eventKey="visor" title="GeoVisor">*/}
        {/*  <div style={{ width: '100vw', height: '100vh' }}>*/}
        {/*    <ArcGISMap webMapId='e691172598f04ea8881cd2a4adaa45ba' />*/}
        {/*  </div>*/}
        {/*</Tab>*/}
      </Tabs>
    </div>
  );
};

export default TabbedDashboard;
