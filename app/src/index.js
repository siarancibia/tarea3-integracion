import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import initSqlJs from 'sql.js';
import './index.css'; // Asegúrate de tener un archivo CSS para estilos

const root = document.getElementById('root');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root
);
