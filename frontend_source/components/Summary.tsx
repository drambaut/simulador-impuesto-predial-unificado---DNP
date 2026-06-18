import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getAggregates } from '../requests/sendIPU';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/Summary.css';

// Colors for the pie chart sections
const COLORS = ['#8884d8', '#82ca9d'];

// Define Aggregate type
interface Aggregate {
  Calculo: string;
  Valor: number;
}

// Props type for Summary Component
interface SummaryProps {
  dataId: string;
}

// Utility function to format numbers with thousand separators
const formatNumber = (value: number, isCurrency: boolean = false) => {
  const options: Intl.NumberFormatOptions = {
    style: isCurrency ? 'currency' : 'decimal',
    currency: isCurrency ? 'USD' : undefined,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  return new Intl.NumberFormat('en-US', options).format(value);
};

// Category configuration array
const categories = [
  {
    category: 'Predios',
    totalLabel: 'total_predios_inicial',
    urbanoLabel: 'total_predios_inicial_urbano',
    ruralLabel: 'total_predios_inicial_rural',
    isCurrency: false,
  },
  {
    category: 'Area Construida',
    totalLabel: 'total_area_construida_inicial',
    urbanoLabel: 'total_area_construida_inicial_urbano',
    ruralLabel: 'total_area_construida_inicial_rural',
    isCurrency: false,
  },
  {
    category: 'Area Terreno',
    totalLabel: 'total_area_terreno_inicial',
    urbanoLabel: 'total_area_terreno_inicial_urbano',
    ruralLabel: 'total_area_terreno_inicial_rural',
    isCurrency: false,
  },
  {
    category: 'Avaluo Catastral',
    totalLabel: 'total_avaluo_catastral_inicial',
    urbanoLabel: 'total_avaluo_catastral_inicial_urbano',
    ruralLabel: 'total_avaluo_catastral_inicial_rural',
    isCurrency: true,
  },
];

// Summary Component
const Summary: React.FC<SummaryProps> = ({ dataId }) => {
  const [aggregates, setAggregates] = useState<Aggregate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAggregates = async () => {
      try {
        const response = await getAggregates(dataId);

        if (isMounted) {
          setAggregates(response.data);
        }
      } catch (err) {
        console.error('Error fetching aggregates:', err);
        if (isMounted) {
          setError('Fallo al cargar la data. Por favor inicie nuevamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAggregates();

    return () => {
      isMounted = false;
    };
  }, [dataId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!aggregates || aggregates.length === 0) {
    return <p>No data available.</p>;
  }

  // Custom label function for the Pie chart
  const renderCustomizedLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx,
      cy,
      midAngle,
      outerRadius,
      name,
      value,
    } = props; // Access name and value directly from props
    const radius = outerRadius + 10;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '12px' }}
      >
        {`${name}: ${formatNumber(value)}`}
      </text>
    );
  };

  const renderCategory = (
    category: string,
    totalLabel: string,
    urbanoLabel: string,
    ruralLabel: string,
    isCurrency: boolean = false
  ) => {
    const total = aggregates.find((agg) => agg.Calculo === totalLabel)?.Valor ?? 0;
    const urbano = aggregates.find((agg) => agg.Calculo === urbanoLabel)?.Valor ?? 0;
    const rural = aggregates.find((agg) => agg.Calculo === ruralLabel)?.Valor ?? 0;
    
    const pieData = [
      { name: 'Urbano', value: urbano },
      { name: 'Rural', value: rural },
    ];

    return (
      <Col xs={12} md={6} className="mb-4" key={category}>
        <div className="category-section">
          <h4 className="category-heading mb-3 text-center">{category}</h4>
          <Row className="justify-content-center align-items-center">
            <Col xs={12} md={6} className="mb-3">
              <Card className="summary-card">
                <Card.Body>
                  <Card.Title className="text-center">Total</Card.Title>
                  <Card.Text className="text-center">
                    Valor: {formatNumber(total, isCurrency)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={6} className="mb-3">
              <Card>
                <Card.Body className="p-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        labelLine={true}
                        label={renderCustomizedLabel}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatNumber(value, isCurrency)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Col>
    );
  };

  return (
    <Container fluid className="summary-container">
      <h2 className="category-heading">Resumen Información Catastral del Año Base</h2>
      <strong className="disclamer">*Para efectos de calculo de la Aplicacion:</strong>
      <div className="disclamer">i) Se eliminaron los predios correspondientes a vías, bienes de uso público e informales.</div>
      <p className="disclamer">ii) Los centros poblados se tomaron como zona “rural".</p>
      <Row className="mb-4">
        <Col xs={12} className="text-center">
          {/* Custom Legend */}
          <Card className="legend-card">
            <Card.Body>
              <div className="custom-legend">
                <span style={{ color: COLORS[0], marginRight: 10 }}>■</span> Urbano
                <span style={{ color: COLORS[1], marginLeft: 20, marginRight: 10 }}>■</span> Rural
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        {categories.map((cat) => (
          <React.Fragment key={cat.category}>
            {renderCategory(
              cat.category,
              cat.totalLabel,
              cat.urbanoLabel,
              cat.ruralLabel,
              cat.isCurrency
            )}
          </React.Fragment>
        ))}
      </Row>
    </Container>
  );
};

export default Summary;
