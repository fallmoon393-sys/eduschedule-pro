import { createContext, useContext, useState, useCallback } from 'react';

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const [notifs, setNotifs] = useState([]);

  const ajouter = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifs(n => [...n, { id, message, type }]);
    setTimeout(() => setNotifs(n => n.filter(x => x.id !== id)), 4000);
  }, []);

  return (
    <NotifContext.Provider value={{ notifs, ajouter }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifs.map(n => (
          <div key={n.id} className={`alert alert-${n.type === 'erreur' ? 'danger' : n.type} alert-dismissible mb-0`} style={{ minWidth: 280 }}>
            {n.message}
          </div>
        ))}
      </div>
    </NotifContext.Provider>
  );
}

export function useNotif() {
  return useContext(NotifContext);
}