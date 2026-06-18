// src/components/LoginPage.tsx

import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import '../styles/LoginPage.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '../AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);

  const loginWith = async (user: string, pass: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Credenciales inválidas');
      Cookies.set('sessionToken', data.token, { expires: 1, path: '/' });
      setIsAuthenticated(true);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 3) Your two handlers now become:
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tosAccepted) {
      setError('Debes aceptar los Términos de Servicio');
      return;
    }
    loginWith(username, password);
  };

  const handleGuestLogin = () => {
    setError('');
    if (!tosAccepted) {
      setError('Debes aceptar los Términos de Servicio');
      return;
    }
    loginWith('admin', 'admin12345');
  };


  return (
    <>
    <div className="login-page">
      <div className="left-section">
        <div className="logo-container">
          <img src={`${process.env.PUBLIC_URL}/company_logo.png`} alt="Company Logo" />
          <img src={`${process.env.PUBLIC_URL}/logo512.png`} alt="GOV.CO Logo" />
        </div>
      </div>
      <div className="right-section">
        <div className="login-card">
          <h2 className="login-title">
            Bienvenido: Simulador Impuesto Predial Unificado
          </h2>
          <h3>Iniciar Sesión</h3>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Usuario:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group password-group">
              <label>Contraseña:</label>
              <div className="password-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button id="login" type="submit" className="login-button">
              Ingresar
            </button>
            <button id="guest" type="button" className="guest-button" onClick={handleGuestLogin}>
              Ingresar como Invitado
            </button>
            <div className="tos-container">
              <input
                type="checkbox"
                id="tos"
                checked={tosAccepted}
                onChange={() => setTosAccepted(!tosAccepted)}
              />
              <label htmlFor="tos">
                Acepto - {' '}
                <button
                  type="button"
                  className="tos-link"
                  onClick={() => setShowTosModal(true)}
                >
                  Ver los terminos de servicio
                </button>
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>

    {showTosModal && (
      <div className="tos-modal-backdrop">
        <div className="tos-modal">
          <h2>Términos de Servicio</h2>
          <div className="modal-content">
            <article className="tos-article">
              <section className="tos-section">
                <h3 className="tos-heading">Propósito del uso</h3>
                <p className="tos-text">
                  La presente herramienta web es proporcionada exclusivamente con fines informativos y operativos internos. Cualquier uso distinto al previsto es responsabilidad exclusiva del usuario.
                </p>
              </section>

              <section className="tos-section">
                <h3 className="tos-heading">Responsabilidad</h3>
                <p className="tos-text">
                  El proveedor de esta herramienta no asume responsabilidad alguna por cualquier daño o perjuicio derivado del uso o la incapacidad de uso de la información proporcionada, incluyendo, sin limitarse a, pérdidas financieras, interrupciones operativas o errores derivados del procesamiento automatizado de datos.
                </p>
              </section>

              <section className="tos-section">
                <h3 className="tos-heading">Precisión de la información</h3>
                <p className="tos-text">
                  Aunque se realizan esfuerzos razonables para asegurar la precisión y actualidad de la información generada por esta herramienta, no se garantiza su absoluta exactitud ni integridad. La interpretación y el uso de los resultados proporcionados quedan bajo la responsabilidad exclusiva del usuario.
                </p>
              </section>

              <section className="tos-section">
                <h3 className="tos-heading">Seguridad y confidencialidad</h3>
                <p className="tos-text">
                  El usuario es responsable de mantener la confidencialidad de sus datos de acceso y de cualquier información personal ingresada en la herramienta. El proveedor implementa medidas de seguridad razonables, pero no se hace responsable por accesos no autorizados derivados del uso indebido de la herramienta por parte del usuario.
                </p>
              </section>

              <section className="tos-section">
                <h3 className="tos-heading">Modificaciones y actualizaciones</h3>
                <p className="tos-text">
                  El proveedor se reserva el derecho de modificar, actualizar o descontinuar esta herramienta en cualquier momento y sin previo aviso.
                </p>
              </section>

              <footer className="tos-footer">
                <p className="tos-text">
                  Al acceder y utilizar esta herramienta web, usted confirma haber leído, comprendido y aceptado estos términos en su totalidad.
                </p>
              </footer>
            </article>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={() => setShowTosModal(false)}
          >
            Cerrar
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default LoginPage;
