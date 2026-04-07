import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StorageProvider } from '../store/index';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider>
      <App />
    </StorageProvider>
  </React.StrictMode>,
);
