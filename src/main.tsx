import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createHashRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { AppShell } from './ui/AppShell';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { HomePage } from './pages/HomePage';
import { HostPage } from './pages/HostPage';
import { PlayPage } from './pages/PlayPage';
import { QuestionsPage } from './pages/QuestionsPage';
import './styles.css';

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'settings', element: <AppSettingsPage /> },
      { path: 'host/create', element: <CreateRoomPage /> },
      { path: 'host/:roomId', element: <HostPage /> },
      { path: 'host/:roomId/questions', element: <QuestionsPage /> },
      { path: 'play/:roomCode', element: <PlayPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
