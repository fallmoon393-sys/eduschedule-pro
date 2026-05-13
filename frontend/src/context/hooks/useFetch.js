import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useFetch(url, deps = []) {
  const { token } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur,  setErreur]  = useState(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setErreur(e.message))
      .finally(() => setLoading(false));
  }, [url, token, ...deps]);

  return { data, loading, erreur };
}