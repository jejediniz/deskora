import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setUnauthorizedHandler } from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "@operadesk:auth";
const TOKEN_KEY = "token";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  /**
   * Recupera sessão salva
   */
  useEffect(() => {
    const dadosSalvos = sessionStorage.getItem(STORAGE_KEY);

    if (dadosSalvos) {
      try {
        const { usuario } = JSON.parse(dadosSalvos);
        setUsuario(usuario);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    setCarregando(false);
  }, []);

  /**
   * Persiste sessão
   */
  useEffect(() => {
    if (usuario) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ usuario })
      );
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [usuario]);

  /**
   * LOGIN REAL (BACKEND)
   */
  async function login(email, senha) {
    setCarregando(true);
    setErro(null);

    try {
      const response = await api.post("/auth/login", {
        email,
        senha,
      });

      const { token, usuario } = response.data.data;

      // 🔑 salva o token para as próximas requisições
      sessionStorage.setItem(TOKEN_KEY, token);

      setUsuario(usuario);
      return true;
    } catch (error) {
      setErro(error.message || "Email ou senha inválidos");
      return false;
    } finally {
      setCarregando(false);
    }
  }

  /**
   * LOGOUT
   */
  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  const estaAutenticado = Boolean(usuario);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        estaAutenticado,
        carregando,
        erro,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
