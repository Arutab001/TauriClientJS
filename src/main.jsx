import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { FilesProvider } from './FilesContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <FilesProvider>
    <App />
  </FilesProvider>
);
