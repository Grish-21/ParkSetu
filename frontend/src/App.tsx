import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { NotificationToast } from './components/NotificationToast';
import { RerouteBanner } from './components/RerouteBanner';
import { AppRoutes } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
              {/* Sticky Top Header */}
              <Navbar />

              {/* Live WebSocket Toast Notifications */}
              <NotificationToast />

              {/* Persistent Reroute Alert Banner */}
              <RerouteBanner />

              {/* Main Content Area */}
              <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4">
                <AppRoutes />
              </main>

              {/* Mobile First Bottom Navigation Bar */}
              <BottomNav />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
