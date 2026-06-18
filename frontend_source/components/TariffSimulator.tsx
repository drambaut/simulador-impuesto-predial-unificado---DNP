import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/TariffSimulator.css';
import Simulator from './Simulator';
import Scenarios from './Scenarios';
import { getTariffScenario } from '../requests/sendIPU';
import { FormData, Scenario, TariffSimulatorProps } from '../types';

const TariffSimulator: React.FC<TariffSimulatorProps> = ({ dataId, config }) => {
  const [formData, setFormData] = useState<FormData>({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const addScenario = async (data: FormData) => {
    try {
      const response = await getTariffScenario({ ...data, dataId }, config.dataSource);

      const newScenario: Scenario = {
        scenarioNumber: scenarios.length + 1,
        ...(response.lot_count === 0
          ? { message: "Bajo los parametros actuales no se afectará ninguna propiedad" }
          : {}),
        ...response,
        parameters: data,
      };

      setScenarios([...scenarios, newScenario]);
    } catch (error: any) {
      if (error.response?.data?.error === 'Under current filter setup, no value will be affected') {
        const newScenario: Scenario = {
          scenarioNumber: scenarios.length + 1,
          message: "Bajo los parametros actuales no se afectará ninguna propiedad",
          parameters: data,
          coefficient: 0,
          average_tariff: 0,
          delta_liq: 0,
          lot_count: 0,
          total_liq_update: 0,
          total_liq_update_tariff: 0
        };
        setScenarios([...scenarios, newScenario]);
      } else {
        console.error('Error adding scenario:', error);
        alert('Failed to add scenario. Check console for details.');
      }
    }
  };
  

  return (
    <div className="tariff-simulator-container">
      <Simulator
        formData={formData}
        setFormData={setFormData}
        addScenario={addScenario}
        dataId={dataId}
        config={config}
      />
      <Scenarios scenarios={scenarios} setScenarios={setScenarios} config={config} />
    </div>
  );
};

export default TariffSimulator;
