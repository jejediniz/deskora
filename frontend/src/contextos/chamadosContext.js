import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./authContext";
import {
  listarChamados,
  criarChamado,
  atualizarChamado,
  excluirChamado,
} from "../services/chamadosApi";

const ChamadosContext = createContext(null);

export function ChamadosProvider({ children }) {
  const { usuario } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [chamadoEmEdicao, setChamadoEmEdicao] = useState(null);
  const [erro, setErro] = useState(null);

  const carregarChamados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { items } = await listarChamados({ page: 1, limit: 200 });
      setChamados(items);
    } catch (error) {
      setErro(error.message || "Erro ao carregar chamados");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (usuario) {
      carregarChamados();
    } else {
      setChamados([]);
      setErro(null);
    }
  }, [carregarChamados, usuario]);

  const criarChamadoContext = useCallback(async (dados) => {
    setErro(null);
    await criarChamado(dados);
    await carregarChamados();
  }, [carregarChamados]);

  const atualizarChamadoContext = useCallback(async (id, dados) => {
    setErro(null);
    await atualizarChamado(id, dados);
    await carregarChamados();
  }, [carregarChamados]);

  const excluirChamadoContext = useCallback(async (id) => {
    setErro(null);
    await excluirChamado(id);
    await carregarChamados();
  }, [carregarChamados]);

  const value = useMemo(
    () => ({
      chamados,
      carregando,
      erro,
      chamadoEmEdicao,
      setChamadoEmEdicao,
      criarChamado: criarChamadoContext,
      atualizarChamado: atualizarChamadoContext,
      excluirChamado: excluirChamadoContext,
      recarregar: carregarChamados,
    }),
    [
      atualizarChamadoContext,
      chamadoEmEdicao,
      chamados,
      carregando,
      criarChamadoContext,
      erro,
      excluirChamadoContext,
      carregarChamados,
    ]
  );

  return (
    <ChamadosContext.Provider value={value}>{children}</ChamadosContext.Provider>
  );
}

export function useChamados() {
  const ctx = useContext(ChamadosContext);
  if (!ctx) {
    throw new Error("useChamados deve ser usado dentro de ChamadosProvider");
  }
  return ctx;
}
