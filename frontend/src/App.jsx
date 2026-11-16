import { useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api.js';
import LoginPage from './pages/LoginPage.jsx';
import UserPage from './pages/UserPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  // Restore the session after a page refresh
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = ({ token, user }) => {
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  if (checking) return <div className="center muted">Loading…</div>;

  return user ? (
    <UserPage currentUser={user} onLogout={handleLogout} />
  ) : (
    <LoginPage onLogin={handleLogin} />
  );
}
