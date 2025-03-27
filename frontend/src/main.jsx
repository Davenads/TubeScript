import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.css';
import App from './components/App';
import { ThemeProvider } from './hooks/useTheme.jsx';

// Create root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render app
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
