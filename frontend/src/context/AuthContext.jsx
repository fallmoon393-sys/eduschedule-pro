import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('edu_token');
    const u = localStorage.getItem('edu_user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setLoading(false);
  }, []);

  function login(tokenRecu, userRecu) {
    localStorage.setItem('edu_token', tokenRecu);
    localStorage.setItem('edu_user',  JSON.stringify(userRecu));
    setToken(tokenRecu);
    setUser(userRecu);
  }

  function logout() {
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}