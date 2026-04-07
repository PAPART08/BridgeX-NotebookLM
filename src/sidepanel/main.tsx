import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../popup/App';
import { StorageProvider } from '../store/index';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider>
      <div className="sidepanel-container">
        <App />
      </div>
    </StorageProvider>
  </React.StrictMode>,
);
