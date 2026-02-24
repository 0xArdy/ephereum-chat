import { useEffect, useState } from 'react';
import './App.css';
import { ChatPage } from './pages/chat/ChatPage';
import { LandingPage } from './pages/landing/LandingPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UnlockPage } from './pages/unlock/UnlockPage';
import { RouterProvider, useRouter } from './state/router-context';
import { SessionProvider, useSession } from './state/session-context';

export function App() {
  return (
    <RouterProvider>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </RouterProvider>
  );
}

function AppRoutes() {
  const { path, navigate } = useRouter();
  const { sessionReady, sessionStatus } = useSession();
  const [showUnlock, setShowUnlock] = useState(false);

  const isOnboardingRoute = path.startsWith('/onboarding');
  const isChatRoute = path.startsWith('/chat');
  const isSettingsRoute = path.startsWith('/settings');

  useEffect(() => {
    if (!isChatRoute || sessionReady || sessionStatus === 'checking') return;

    if (sessionStatus === 'locked') {
      setShowUnlock(true);
      return;
    }

    navigate('/onboarding');
  }, [isChatRoute, navigate, sessionReady, sessionStatus]);

  const handleEnterApp = () => {
    if (sessionReady) {
      navigate('/chat');
    } else if (sessionStatus === 'locked') {
      setShowUnlock(true);
    } else {
      navigate('/onboarding');
    }
  };

  const handleUnlockSuccess = () => {
    setShowUnlock(false);
    navigate('/chat');
  };

  const handleForgotPassword = () => {
    setShowUnlock(false);
    navigate('/onboarding');
  };

  if (sessionStatus === 'checking') {
    return (
      <main className='app'>
        <div className='loading-screen'>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (showUnlock) {
    return (
      <main className='app'>
        <UnlockPage onSuccess={handleUnlockSuccess} onForgot={handleForgotPassword} />
      </main>
    );
  }

  if (isOnboardingRoute) {
    return (
      <main className='app'>
        <OnboardingPage />
      </main>
    );
  }

  if (isSettingsRoute) {
    return (
      <main className='app'>
        <SettingsPage />
      </main>
    );
  }

  if (isChatRoute) {
    if (!sessionReady) {
      return null;
    }
    return (
      <main className='app'>
        <ChatPage />
      </main>
    );
  }

  return (
    <main className='app'>
      <LandingPage onEnterApp={handleEnterApp} />
    </main>
  );
}
