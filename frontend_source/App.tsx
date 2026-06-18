// src/App.tsx

import React, { useState, useContext } from 'react';
import './styles/App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from 'react-router-dom';
import ExcelReader from './components/ExcelReader';
import Parameters from './components/Parameters';
import TabbedDashboard from './components/TabbedDashboard';
import LoginPage from './components/LoginPage';
import { AuthContext } from './AuthContext';
import Cookies from 'js-cookie';

function App() {
  const [parameters, setParameters] = useState({
    valuationCoefficient: 80,
    smmlvC: '1400000',
    smmlvP: '1500000',
    //expectedInflation: '3',
    uvtC: '49000',
    uvtP: '50000'
  });

  const handleParametersChange = (newParameters: any) => {
    setParameters(newParameters);
  };

  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Router>
      <div className="App">
        <main>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <PrivateLayout
                    component={
                      <div className="horizontal-container">
                        <div className="parameters-card">
                          <Parameters
                            onParametersChange={handleParametersChange}
                            parameters={parameters}
                          />
                        </div>
                        <div className="excel-reader-card">
                          <ExcelReader parameters={parameters} />
                        </div>
                      </div>
                    }
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <PrivateLayout component={<TabbedDashboard />} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const PrivateLayout = ({ component }: { component: React.ReactNode }) => {
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  const handleLogout = () => {
    Cookies.remove('sessionToken', { path: '/' });
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <>
      <div className="App-header-container">
        {/* Render the blue header */}
        <div className="App-header">
          {/* Link wrapping the logo to redirect to external DNP page */}
          <a
            href="https://www.dnp.gov.co"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`${process.env.PUBLIC_URL}/company_logo.png`}
              alt="Company Logo"
              className="header-logo left-logo"
            />
          </a>
          {/* Link wrapping the title to redirect to home page */}
          <Link to="/" className="header-title-link">
            <h2>Simulador Impuesto Predial Unificado</h2>
          </Link>
          <img
            src={`${process.env.PUBLIC_URL}/logo512.png`}
            alt="Logo 512"
            className="header-logo right-logo"
          />
        </div>
        {/* Spacer below the header with logout button */}
        <div className="header-spacer">
          <button className="logout-button" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </div>
      {/* Render the actual component passed in */}
      {component}
    </>
  );
};

export default App;
