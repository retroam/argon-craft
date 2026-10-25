import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FighterStudio from './fighter/FighterStudio';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).get('game') === 'iron-circuit' ? <FighterStudio /> : <App />}
  </React.StrictMode>
);
