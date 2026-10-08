import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, DEMO_KEY, isDemo } from '../lib/api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(isDemo());
  const [toasts, setToasts] = useState([]);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('insight_sidebar') === '1');
  const [tourOpen, setTourOpen] = useState(false);
  const idRef = useRef(0);

  const toast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get('/api/me');
      setUser(me);
      if (me && me.tourCompleted === false && !localStorage.getItem('insight_tour_done')) setTourOpen(true);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser, demo]);

  // Any 401 from the API sends the user back to the login page.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('insight:unauthorized', onUnauthorized);
    return () => window.removeEventListener('insight:unauthorized', onUnauthorized);
  }, []);

  const enterDemo = useCallback(() => {
    localStorage.setItem(DEMO_KEY, '1');
    setDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    localStorage.removeItem(DEMO_KEY);
    setDemo(false);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    if (!isDemo()) {
      try {
        await api.post('/auth/logout');
      } catch {
        /* ignore, we clear local state either way */
      }
    }
    localStorage.removeItem(DEMO_KEY);
    setDemo(false);
    setUser(null);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem('insight_sidebar', c ? '0' : '1');
      return !c;
    });
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem('insight_tour_done', '1');
    setTourOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      user, setUser, loading, demo, enterDemo, exitDemo, logout, toast, toasts, dismissToast,
      collapsed, toggleCollapsed, tourOpen, setTourOpen, finishTour, reloadUser: loadUser,
    }),
    [user, loading, demo, enterDemo, exitDemo, logout, toast, toasts, dismissToast, collapsed, toggleCollapsed, tourOpen, finishTour, loadUser]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
