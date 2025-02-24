import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Inventory from './pages/Inventory';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/inventory',
    element: <Inventory />
  }
]); 