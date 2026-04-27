import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contextos/authContext";
import {
  useAtualizarChamadoMutation,
  useChamadosQuery,
  useExcluirChamadoMutation,
  useTecnicosQuery,
} from "../hooks/useChamadosQueries";
import { Button, EmptyState, PageHeader, SkeletonRow } from "../components/ui";
import { STATUS_FECHADOS } from "../config/chamados";
import ChamadoConversationModal from "../components/chamados/ChamadoConversationModal";
import ChamadosToolbar from "./chamados/ChamadosToolbar";
import ChamadosSelectionBar from "./chamados/ChamadosSelectionBar";
import ChamadoRow from "./chamados/ChamadoRow";
import ChamadoEditModal from "./chamados/ChamadoEditModal";
import { useChamadosMenuControl } from "./chamados/useChamadosMenuControl";
import { useChamadoFiltros } from "./chamados/useChamadoFiltros";
import { useChamadoAcoes } from "./chamados/useChamadoAcoes";

const FORM_INICIAL = {
  titulo: "",
  descricao: "",
  prioridade: "media",
  tecnicoId: "",
  setor: "",
  status: "aberto",
};

export default function Chamados() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.admin === true;
  const isTi = usuario?.tipo === "ti";
  const podeDefinirPrioridade = isTi;

  const [selecionados, setSelecionados] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [chamadoConversa, setChamadoConversa] = useState(null);
  const [erro, setErro] = useState(null);

  const {
    aplicarFiltros,
    busca,
    buscaDebounced,
    filtrosAtivos,
    irParaPagina,
    limite,
    limparFiltros,
    pagina,
    setBusca,
    setLimite,
    setStatusFiltro,
    statusFiltro,
  } = useChamadoFiltros();

  const atualizarMutation = useAtualizarChamadoMutation();
  const excluirMutation = useExcluirChamadoMutation();
  const tecnicosQuery = useTecnicosQuery();
  const chamadosQuery = useChamadosQuery({
    page: pagina,
    limit: limite,
    q: buscaDebounced || undefined,
  });

  const chamados = useMemo(
    () => chamadosQuery.data?.items ?? [],
    [chamadosQuery.data]
  );
  const meta = chamadosQuery.data?.meta ?? null;
  const carregando = chamadosQuery.isLoading || chamadosQuery.isFetching;
  const tecnicos = useMemo(
    () => (tecnicosQuery.data ?? []).filter((u) => u.tipo === "ti"),
    [tecnicosQuery.data]
  );

  const chamadosFiltrados = useMemo(
    () => aplicarFiltros(chamados),
    [aplicarFiltros, chamados]
  );

  useEffect(() => {
    if (chamadosQuery.error) {
      setErro(chamadosQuery.error.message || "Erro ao carregar chamados");
    }
  }, [chamadosQuery.error]);

  const {
    menuAbertoId,
    menuRef,
    menuButtonRefs,
    menuItemRefs,
    fecharMenu,
    alternarMenu,
  } = useChamadosMenuControl();

  const acoes = useChamadoAcoes({
    usuario,
    atualizarMutation,
    excluirMutation,
    setErro,
  });

  useEffect(() => {
    setSelecionados((atual) =>
      atual.filter((id) =>
        chamadosFiltrados.some((chamado) => chamado.id === id)
      )
    );
  }, [chamadosFiltrados]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editandoId || !form.titulo || !form.descricao) return;

    setErro(null);
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        tecnicoId: form.tecnicoId || undefined,
        setor: form.setor || undefined,
        status: form.status || "aberto",
      };
      if (podeDefinirPrioridade) {
        payload.prioridade = form.prioridade;
      }

      await atualizarMutation.mutateAsync({ id: editandoId, dados: payload });
      setForm(FORM_INICIAL);
      setEditandoId(null);
    } catch (error) {
      setErro(error.message || "Erro ao salvar chamado");
    }
  }

  function editarChamado(chamado) {
    setEditandoId(chamado.id);
    setForm({
      titulo: chamado.titulo,
      descricao: chamado.descricao,
      prioridade: chamado.prioridade,
      status: chamado.status,
      tecnicoId: chamado.tecnico?.id || "",
      setor: chamado.setor || "",
    });
  }

  function fecharEdicao() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setErro(null);
  }

  function alternarSelecao(id) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  }

  function alternarSelecionarTodos() {
    if (!chamadosFiltrados.length) return;

    const todos = chamadosFiltrados.every((c) => selecionados.includes(c.id));

    setSelecionados((atual) => {
      if (todos) {
        return atual.filter(
          (id) => !chamadosFiltrados.some((c) => c.id === id)
        );
      }
      const ids = new Set(atual);
      chamadosFiltrados.forEach((c) => ids.add(c.id));
      return Array.from(ids);
    });
  }

  function limparFiltrosESelecao() {
    limparFiltros();
    setSelecionados([]);
  }

  const todosSelecionados =
    chamadosFiltrados.length > 0 &&
    chamadosFiltrados.every((c) => selecionados.includes(c.id));

  const quantidadeConcluiveis = chamadosFiltrados.filter(
    (c) => selecionados.includes(c.id) && !STATUS_FECHADOS.includes(c.status)
  ).length;

  return (
    <div>
      <PageHeader
        title="Gestão de Chamados"
        subtitle="Visualize e opere a fila de chamados com foco total na gestão."
      />

      <div>
        <div className="table-card">
          <div className="table-header">
            <div>
              <strong>Fila de chamados</strong>
              <p className="table-header__subtitle">
                Busque, filtre e execute ações com mais clareza operacional.
              </p>
            </div>
          </div>

          <ChamadosToolbar
            busca={busca}
            onBuscaChange={setBusca}
            statusFiltro={statusFiltro}
            onStatusFiltroChange={setStatusFiltro}
            limite={limite}
            onLimiteChange={setLimite}
            totalFiltrado={chamadosFiltrados.length}
            totalPagina={chamados.length}
            filtrosAtivos={filtrosAtivos}
            onLimparFiltros={limparFiltrosESelecao}
          />

          <ChamadosSelectionBar
            selecionadosCount={selecionados.length}
            quantidadeConcluiveis={quantidadeConcluiveis}
            isTi={isTi}
            onAssumirSelecionados={() =>
              acoes.assumirSelecionados(chamadosFiltrados, selecionados, () =>
                setSelecionados([])
              )
            }
            onConcluirSelecionados={() =>
              acoes.concluirSelecionados(chamadosFiltrados, selecionados, () =>
                setSelecionados([])
              )
            }
          />

          <div className="management-list">
            <div className="management-list__header">
              <div className="management-list__select">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os chamados filtrados"
                  checked={todosSelecionados}
                  onChange={alternarSelecionarTodos}
                />
              </div>
              <div>Status</div>
              <div>Prioridade</div>
              <div>Solicitante</div>
              <div>Título</div>
              <div>Técnico</div>
              <div className="management-list__actions-label">Ações</div>
            </div>

            {carregando && (
              <div className="skeleton-stack" aria-busy="true" aria-live="polite">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonRow key={idx} />
                ))}
              </div>
            )}

            {!carregando &&
              chamadosFiltrados.map((c) => (
                <ChamadoRow
                  key={c.id}
                  chamado={c}
                  selecionado={selecionados.includes(c.id)}
                  isTi={isTi}
                  isAdmin={isAdmin}
                  menuAberto={menuAbertoId === c.id}
                  onAlternarSelecao={alternarSelecao}
                  onToggleMenu={alternarMenu}
                  onFecharMenu={fecharMenu}
                  onAbrirConversa={setChamadoConversa}
                  onAssumir={acoes.assumirChamado}
                  onEditar={editarChamado}
                  onConcluir={acoes.concluirChamado}
                  onRemover={acoes.remover}
                  menuRef={menuRef}
                  buttonRef={(node) => {
                    if (node) menuButtonRefs.current[c.id] = node;
                  }}
                  primeiroItemRef={(node) => {
                    if (node) menuItemRefs.current[c.id] = node;
                  }}
                />
              ))}

            {!carregando && chamadosFiltrados.length === 0 && (
              <div className="management-list__feedback">
                {filtrosAtivos > 0 ? (
                  <EmptyState
                    title="Nenhum chamado encontrado"
                    description="Sua busca ou filtro de status não retornou resultados."
                    actionLabel="Limpar filtros"
                    onAction={limparFiltrosESelecao}
                  />
                ) : (
                  <EmptyState
                    title="Nenhum chamado na fila"
                    description="A fila está limpa no momento. Aproveite para revisar pendências antigas."
                  />
                )}
              </div>
            )}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => irParaPagina(pagina - 1, meta.totalPages)}
                disabled={pagina <= 1 || carregando}
              >
                Anterior
              </Button>

              <span>
                Página {pagina} de {meta.totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => irParaPagina(pagina + 1, meta.totalPages)}
                disabled={pagina >= meta.totalPages || carregando}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      </div>

      <ChamadoEditModal
        open={Boolean(editandoId)}
        form={form}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={fecharEdicao}
        podeDefinirPrioridade={podeDefinirPrioridade}
        tecnicos={tecnicos}
        erro={erro}
      />

      <ChamadoConversationModal
        chamado={chamadoConversa}
        open={Boolean(chamadoConversa)}
        onClose={() => setChamadoConversa(null)}
        allowInternal={isTi || isAdmin}
        onUpdated={() => chamadosQuery.refetch()}
      />
    </div>
  );
}
