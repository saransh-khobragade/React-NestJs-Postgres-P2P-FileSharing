import './App.css';
import type { ReactElement } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { HomePage } from '@/pages/HomePage';
import { BlogDetailPage } from '@/pages/BlogDetailPage';
import { WritePage } from '@/pages/WritePage';
import { AuthPage } from '@/pages/AuthPage';
import { ChatPage } from '@/pages/ChatPage';
import { P2PHomePage } from '@/pages/P2PHomePage';
import { P2PRoomPage } from '@/pages/P2PRoomPage';

function Router(): ReactElement {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/auth') return <AuthPage />;
  if (path === '/chat') return <ChatPage />;
  if (path === '/p2p') return <P2PHomePage />;
  if (path.startsWith('/p2p/room')) return <P2PRoomPage />;
  if (path === '/write') return <WritePage />;
  if (path.startsWith('/blogs/')) return <BlogDetailPage />;
  return <HomePage />;
}

function App(): ReactElement {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider>
        <div className='min-h-screen bg-background'>
          <Router />
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
