import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { getDestinations, getStratum } from '../requests/sendIPU';
import { FormData, Destination, TariffSimulatorConfig, Range } from '../types';

interface ParameterCaptureProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  addScenario: (data: FormData) => void;
  dataId: string;
  config: TariffSimulatorConfig;
}

const Simulator: React.FC<ParameterCaptureProps> = ({
  formData,
  setFormData,
  addScenario,
  dataId,
  config,
}) => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [stratum, setStratum] = useState<number[]>([]);
  const [ruralChecked, setRuralChecked] = useState(false);
  const [urbanoChecked, setUrbanoChecked] = useState(false);
  const [errors, setErrors] = useState<{
    tariff?: string;
    ranges?: Record<string, string | undefined>;
  }>({});

    const fields = [
      { key: 'area', label: 'Area' },
      { key: 'valuation', label: 'Avaluo Catrastral - $' },
      { key: 'valuation_smmlv', label: 'Avaluo Catrastral - SMMLV' },
      { key: 'valuation_uvt', label: 'Avaluo Catrastral - UVT' }
    ];

  useEffect(() => {

    const fetchData = async () => {
      try {
        const [destinationsResponse, stratumResponse] = await Promise.all([
          getDestinations(dataId, config.dataSource),
          getStratum(dataId, config.dataSource),
        ]);

        setDestinations(
          (Object.entries(destinationsResponse.data) as [string, string][])
            .sort(([, a], [, b]) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' })
            )
            .map(([key, value]) => ({
              id: key,
              label: value,
            }))
        );
        setStratum(stratumResponse.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [dataId, config.dataSource]);

  useEffect(() => {
    validateField('tariff', formData.tariff); // Validate tariff on load or update
  }, [formData.tariff]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const validateField = (field: keyof FormData, value: any) => {
    if (field === 'tariff') {
      setErrors((prev) => ({
        ...prev,
        tariff: !value
          ? 'La tarifa es obligatoria.' // Checks for null, undefined, or falsy value like 0
          : value > 33
          ? 'La tarifa no puede ser mayor que 33.'
          : undefined,
      }));
    }
  };
  
  const handleRangeChange = (
      field: keyof FormData,
      key: 'min' | 'max',
      value: number | undefined
    ) => {
      // Update formData
      setFormData((prev) => ({
        ...prev,
        [field]: {
          ...(prev[field] as Range || {}),
          [key]: value,
        },
      }));

      // Validate immediately after updating the state
      const updatedRange = {
        ...(formData[field] as Range || {}),
        [key]: value,
      };
    
      setErrors((prev) => {
        // Explicitly check for undefined values before comparing
        if (updatedRange.min !== undefined && updatedRange.max !== undefined) {
          return {
            ...prev,
            ranges: {
              ...(prev.ranges || {}),
              [field]:
                updatedRange.min > updatedRange.max
                  ? 'El mínimo no puede ser mayor que el máximo.'
                  : undefined,
            },
          };
        } else {
          return {
            ...prev,
            ranges: {
              ...(prev.ranges || {}),
              [field]: undefined,
            },
          };
        }
      });
    };

  const hasErrors = () => {
    const rangeErrors = Object.values(errors.ranges || {}).some((error) => error !== undefined);
    return !!errors.tariff || rangeErrors;
  };

  const handleAddScenario = () => {
    validateField('tariff', formData.tariff); // Revalidate tariff
    if (hasErrors()) {
      return; // Prevent submission if there are errors
    }
    addScenario(formData); // Proceed if no errors
  };

  const handleCheckboxChange = (field: keyof FormData, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field]
        ? (prev[field] as number[]).includes(value)
          ? (prev[field] as number[]).filter((item) => item !== value)
          : [...(prev[field] as number[]), value]
        : [value],
    }));
  };

  const handleDestinationChange = (selectedOptions: any) => {
    setFormData((prev) => ({
      ...prev,
      destination: selectedOptions ? selectedOptions.map((opt: any) => opt.value) : [],
    }));
  };

  const handleRuralChange = () => {
    setRuralChecked((prev) => !prev);
    handleInputChange('zone', ruralChecked ? undefined : 0);
  };

  const handleUrbanoChange = () => {
    setUrbanoChecked((prev) => !prev);
    handleInputChange('zone', urbanoChecked ? undefined : 1);
  };

  return (
    <div className="capture-details">
      <h3>Parametros de Simulacion</h3>
      <strong className="disclamer">*No discrimina predios con autoavalúo o autoestimación.</strong>
      <form>
        <div className="form-group">
          <label>Tarifa</label>
          <input
            type="number"
            className={`form-control ${errors.tariff ? 'is-invalid' : ''}`}
            value={formData.tariff || ''}
            onChange={(e) => handleInputChange('tariff', parseInt(e.target.value))}
          />
          {errors.tariff && <div className="invalid-feedback">{errors.tariff}</div>}
        </div>

        <div className="form-group">
          <label>Zona</label>
          <div className="checkbox-row">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={ruralChecked}
                onChange={handleRuralChange}
              />
              <label className="form-check-label">Rural</label>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                checked={urbanoChecked}
                onChange={handleUrbanoChange}
              />
              <label className="form-check-label">Urbano</label>
            </div>
          </div>
        </div>

        {fields.map(({ key, label }) => (
          <div key={key} className="form-group">
            <label htmlFor={`${key}-min`}>{label}</label>
            <div className="range-inputs">
              <input
                id={`${key}-min`}
                type="number"
                className="form-control"
                placeholder="Min"
                value={(formData[key as keyof FormData] as Range)?.min ?? ''}
                onChange={(e) =>
                  handleRangeChange(
                    key as keyof FormData,
                    'min',
                    e.target.value === '' ? undefined : +e.target.value
                  )
                }
              />
              <input
                id={`${key}-max`}
                type="number"
                className="form-control"
                placeholder="Max"
                value={(formData[key as keyof FormData] as Range)?.max ?? ''}
                onChange={(e) =>
                  handleRangeChange(
                    key as keyof FormData,
                    'max',
                    e.target.value === '' ? undefined : +e.target.value
                  )
                }
              />
            </div>
          </div>
        ))}

        {stratum.length > 0 && (
          <div className="form-group">
            <label>Estrato</label>
            <div className="checkbox-row">
              {stratum.map((stratum) => (
                <div key={stratum} className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={formData.stratum?.includes(stratum) || false}
                    onChange={() => handleCheckboxChange('stratum', stratum)}
                  />
                  <label className="form-check-label">{stratum}</label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Destinacion Economica</label>
          <Select
            isMulti
            options={destinations.map((destination) => ({
              value: destination.id,
              label: destination.label,
            }))}
            value={destinations
              .filter((destination) => formData.destination?.includes(destination.id))
              .map((destination) => ({
                value: destination.id,
                label: destination.label,
              }))}
            onChange={handleDestinationChange}
            className="multi-select-dropdown"
          />
        </div>
        {config.dataSource === 'base' ? (
            <div>
              <p><strong className="disclamer">*Se asume que no aplican los límites de la Ley 1995 de 2019 (la totalidad de predios no cumplen las condiciones o se encuentran excluidos), por lo cual se aplican las reglas de la Ley 44, art 6.</strong></p>
              <p><strong className="disclamer">*Para el primer año de entrada en vigencia de la actualización catastral, se asume que todos los predios nuevos quedan sujetos a cobro del IPU.</strong></p>
            </div>
        ) : (
          <div>
            <p><strong className="disclamer">*Para el segundo año de entrada en vigencia de la actualización catastral no se incluyen predios nuevos ni variaciones en área construida ni de terreno.</strong></p>
            <p><strong className="disclamer">*Para el segundo año después de la actualización catastral, se toma como supuesto un reajuste del avalúo catastral equivalente a la inflación proyectada.</strong></p>
          </div>

        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAddScenario}
          disabled={hasErrors()}
        >
          Agregar Escenario
        </button>
      </form>
    </div>
  );
};

export default Simulator;
