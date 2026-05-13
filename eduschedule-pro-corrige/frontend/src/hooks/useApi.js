import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Hook générique pour les appels API
 * 
 * Usage :
 *   const { data, loading, error, refetch } = useApi('/vacations.php');
 */
const useApi = (url, options = {}) => {
    const { defaultValue = [], executeOnMount = true } = options;

    const [data,    setData]    = useState(defaultValue);
    const [loading, setLoading] = useState(executeOnMount);
    const [error,   setError]   = useState(null);

    const fetch = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(url);
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        if (executeOnMount) fetch();
    }, [fetch, executeOnMount]);

    return { data, loading, error, refetch: fetch };
};

export default useApi;