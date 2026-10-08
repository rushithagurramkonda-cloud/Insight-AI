import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useApp } from '../context/AppContext.jsx';

// GET a path and keep loading / error / data state. Errors also show a toast.
export function useFetch(path, { skip = false, silent = false } = {}) {
  const { toast, demo } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (skip || !path) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.get(path);
      if (alive.current) setData(d);
    } catch (e) {
      if (alive.current) {
        setError(e);
        if (!silent) toast(e.message, 'error');
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path, skip, silent, toast]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
    // demo is included so data reloads when switching modes
  }, [load, demo]);

  return { data, setData, loading, error, reload: load };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
