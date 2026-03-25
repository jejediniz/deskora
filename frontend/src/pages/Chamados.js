import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contextos/authContext";
import { useConfirm } from "../contextos/confirmContext";
import { useToast } from "../contextos/toastContext";
import {
  listarChamados,
  atualizarChamado,
  excluirChamado,
} from "../services/chamadosApi";
import { listarTecnicos } from "../services/usuariosApi";
import { Button, EmptyState, Input, PageHeader, Select, Textarea } from "../components/ui";
import { PRIORIDADE_LABEL, STATUS_LABEL } from "../config/chamados";
import ChamadoConversationModal from "../components/chamados/ChamadoConversationModal";

export default function Chamados() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.admin === true;
  const isTi = usuario?.tipo === "ti";
  const podeDefinirPrioridade = isTi;
  const { confirm } = useConfirm();
  const toast = useToast();

  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [meta, setMeta] = useState(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [selecionados, setSelecionados] = useState([]);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    tecnicoId: "",
    setor: "",
    status: "aberto",
  });
  const [editandoId, setEditandoId] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [menuAbertoId, setMenuAbertoId] = useState(null);
  const [chamadoConversa, setChamadoConversa] = useState(null);
  const menuRef = useRef(null);
  const menuButtonRefs = useRef({});
  const menuItemRefs = useRef({});

  const carregarChamados = useCallback(async (novaPagina = 1) => {
    setCarregando(true);
    setErro(null);
    try {
      const { items, meta: metaApi } = await listarChamados({
        page: novaPagina,
        limit: limite,
      });
      setChamados(items);
      setMeta(metaApi);
      setPagina(novaPagina);
    } catch (error) {
      setErro(error.message || "Erro ao carregar chamados");
    } finally {
      setCarregando(false);
    }
  }, [limite]);

  useEffect(() => {
    carregarChamados(1);
  }, [carregarChamados]);

  useEffect(() => {
    async function buscarTecnicos() {
      try {
        const data = await listarTecnicos();
        setTecnicos(data.filter((u) => u.tipo === "ti"));
      } catch {
        //
      }
    }

    buscarTecnicos();
  }, []);

  const chamadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return chamados
      .filter((chamado) => {
      const correspondeStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "concluido"
          ? ["concluido", "fechado"].includes(chamado.status)
          : chamado.status === statusFiltro);

      const correspondeBusca =
        !termo ||
        [
          chamado.titulo,
          chamado.descricao,
          chamado.solicitante?.nome,
          chamado.tecnico?.nome,
          chamado.setor,
          chamado.id,
        ]
          .filter(Boolean)
          .some((valor) => valor.toString().toLowerCase().includes(termo));

      return (
        correspondeStatus &&
        correspondeBusca
      );
    })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [busca, chamados, statusFiltro]);

  useEffect(() => {
    setSelecionados((atual) =>
      atual.filter((id) => chamadosFiltrados.some((chamado) => chamado.id === id))
    );
  }, [chamadosFiltrados]);

  const fecharMenu = useCallback(() => {
    const idAtual = menuAbertoId;
    setMenuAbertoId(null);
    if (idAtual && menuButtonRefs.current[idAtual]) {
      menuButtonRefs.current[idAtual].focus();
    }
  }, [menuAbertoId]);

  useEffect(() => {
    if (!menuAbertoId) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        fecharMenu();
      }
    }

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        fecharMenu();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    const primeiroItem = menuItemRefs.current[menuAbertoId];
    if (primeiroItem) {
      primeiroItem.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuAbertoId, fecharMenu]);

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
        prioridade: podeDefinirPrioridade ? form.prioridade : "media",
        tecnicoId: form.tecnicoId || undefined,
        setor: form.setor || undefined,
      };

      if (!podeDefinirPrioridade) {
        delete payload.prioridade;
      }
      payload.status = form.status || "aberto";
      await atualizarChamado(editandoId, payload);
    } catch (error) {
      setErro(error.message || "Erro ao salvar chamado");
      toast.error(error.message || "Erro ao salvar chamado.");
      return;
    }

    setForm({
      titulo: "",
      descricao: "",
      prioridade: "media",
      tecnicoId: "",
      setor: "",
      status: "aberto",
    });
    setEditandoId(null);
    carregarChamados(pagina);
    toast.success("Chamado atualizado com sucesso.");
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

  const fecharEdicao = useCallback(() => {
    setEditandoId(null);
    setForm({
      titulo: "",
      descricao: "",
      prioridade: "media",
      tecnicoId: "",
      setor: "",
      status: "aberto",
    });
    setErro(null);
  }, []);

  async function remover(id) {
    const confirmado = await confirm({
      title: "Excluir chamado",
      description: "Essa ação remove o chamado da lista. Deseja continuar?",
      confirmLabel: "Excluir",
    });
    if (!confirmado) return;
    setErro(null);
      try {
        await excluirChamado(id);
        carregarChamados(pagina);
        toast.success("Chamado excluído com sucesso.");
    } catch (error) {
      setErro(error.message || "Erro ao excluir chamado");
      toast.error(error.message || "Erro ao excluir chamado.");
    }
  }

  async function assumirChamado(id) {
    setErro(null);
    try {
      await atualizarChamado(id, { tecnicoId: usuario.id });
      carregarChamados(pagina);
      toast.success("Chamado assumido com sucesso.");
    } catch (error) {
      setErro(error.message || "Erro ao assumir chamado");
      toast.error(error.message || "Erro ao assumir chamado.");
    }
  }

  async function concluirChamado(id) {
    const confirmado = await confirm({
      title: "Concluir chamado",
      description: "O chamado será marcado como concluído. Deseja continuar?",
      confirmLabel: "Concluir",
      variant: "primary",
    });
    if (!confirmado) return;
    setErro(null);
    try {
      await atualizarChamado(id, { status: "concluido" });
      carregarChamados(pagina);
      toast.success("Chamado concluído com sucesso.");
    } catch (error) {
      setErro(error.message || "Erro ao concluir chamado");
      toast.error(error.message || "Erro ao concluir chamado.");
    }
  }

  function alternarSelecao(id) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );
  }

  function alternarSelecionarTodos() {
    if (!chamadosFiltrados.length) return;

    const todosSelecionados = chamadosFiltrados.every((chamado) =>
      selecionados.includes(chamado.id)
    );

    setSelecionados((atual) => {
      if (todosSelecionados) {
        return atual.filter(
          (id) => !chamadosFiltrados.some((chamado) => chamado.id === id)
        );
      }

      const ids = new Set(atual);
      chamadosFiltrados.forEach((chamado) => ids.add(chamado.id));
      return Array.from(ids);
    });
  }

  async function concluirSelecionados() {
    const elegiveis = chamadosFiltrados.filter(
      (chamado) =>
        selecionados.includes(chamado.id) &&
        !["concluido", "fechado"].includes(chamado.status)
    );

    if (!elegiveis.length) return;
    const confirmado = await confirm({
      title: "Concluir chamados selecionados",
      description: `Os ${elegiveis.length} chamados selecionados serão concluídos.`,
      confirmLabel: "Concluir",
      variant: "primary",
    });
    if (!confirmado) {
      return;
    }

    setErro(null);
    try {
      await Promise.all(
        elegiveis.map((chamado) =>
          atualizarChamado(chamado.id, { status: "concluido" })
        )
      );
      setSelecionados([]);
      carregarChamados(pagina);
      toast.success("Chamados concluídos com sucesso.");
    } catch (error) {
      setErro(error.message || "Erro ao concluir chamados selecionados");
      toast.error(error.message || "Erro ao concluir chamados selecionados.");
    }
  }

  async function assumirSelecionados() {
    const elegiveis = chamadosFiltrados.filter((chamado) =>
      selecionados.includes(chamado.id)
    );

    if (!elegiveis.length) return;
    const confirmado = await confirm({
      title: "Assumir chamados selecionados",
      description: `Você será definido como responsável por ${elegiveis.length} chamado(s).`,
      confirmLabel: "Assumir",
      variant: "primary",
    });
    if (!confirmado) {
      return;
    }

    setErro(null);
    try {
      await Promise.all(
        elegiveis.map((chamado) =>
          atualizarChamado(chamado.id, { tecnicoId: usuario.id })
        )
      );
      setSelecionados([]);
      carregarChamados(pagina);
      toast.success("Chamados assumidos com sucesso.");
    } catch (error) {
      setErro(error.message || "Erro ao assumir chamados selecionados");
      toast.error(error.message || "Erro ao assumir chamados selecionados.");
    }
  }

  function limparFiltros() {
    setBusca("");
    setStatusFiltro("todos");
    setSelecionados([]);
  }

  function irParaPagina(novaPagina) {
    if (novaPagina < 1) return;
    if (meta?.totalPages && novaPagina > meta.totalPages) return;
    carregarChamados(novaPagina);
  }

  function abrirMenu(id) {
    setMenuAbertoId((atual) => (atual === id ? null : id));
  }

  const todosSelecionados =
    chamadosFiltrados.length > 0 &&
    chamadosFiltrados.every((chamado) => selecionados.includes(chamado.id));

  const quantidadeConcluiveis = chamadosFiltrados.filter(
    (chamado) =>
      selecionados.includes(chamado.id) &&
      !["concluido", "fechado"].includes(chamado.status)
  ).length;

  const filtrosAtivos = [
    busca.trim() !== "",
    statusFiltro !== "todos",
  ].filter(Boolean).length;

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

          <div className="table-actions">
            <div className="table-search-row">
              <Input
                label="Buscar chamados"
                hideLabel
                className="table-search"
                placeholder="Buscar por título, pessoa ou setor"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />

              <Select
                label="Status"
                hideLabel
                className="table-filter table-filter--compact"
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                <option value="todos">Todos os status</option>
                <option value="aberto">Abertos</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluídos</option>
              </Select>

              <label className="table-limit">
                <span>Itens por página</span>
                <select
                  value={limite}
                  onChange={(e) => setLimite(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>

          <div className="table-toolbar">
            <div className="table-toolbar__summary">
              <strong>{chamadosFiltrados.length}</strong>
              <span>
                de {chamados.length} chamado{chamados.length === 1 ? "" : "s"} nesta
                página
              </span>
              {filtrosAtivos > 0 && (
                <span className="table-toolbar__tag">
                  {filtrosAtivos} filtro{filtrosAtivos === 1 ? "" : "s"} ativo
                  {filtrosAtivos === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="table-toolbar__actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={limparFiltros}
              >
                Limpar filtros
              </Button>
            </div>
          </div>

          {selecionados.length > 0 && (
            <div className="selection-toolbar">
              <div className="selection-toolbar__summary">
                <strong>{selecionados.length}</strong>
                <span>chamado{selecionados.length === 1 ? "" : "s"} selecionado{selecionados.length === 1 ? "" : "s"}</span>
              </div>

              <div className="selection-toolbar__actions">
                {isTi && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={assumirSelecionados}
                  >
                    Assumir selecionados
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={concluirSelecionados}
                  disabled={!quantidadeConcluiveis}
                >
                  Concluir selecionados
                </Button>
              </div>
            </div>
          )}

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
              <div className="management-list__feedback">Carregando...</div>
            )}

            {!carregando &&
              chamadosFiltrados.map((c) => {
                const temAcoes = isTi || isAdmin;
                const podeConcluir =
                  (isTi || isAdmin) &&
                  !["concluido", "fechado"].includes(c.status);
                const primeiroItemRef = (node) => {
                  if (node) menuItemRefs.current[c.id] = node;
                };

                return (
                  <article key={c.id} className="management-row">
                    <div className="management-row__select">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar chamado ${c.titulo}`}
                        checked={selecionados.includes(c.id)}
                        onChange={() => alternarSelecao(c.id)}
                      />
                    </div>

                    <div className="management-row__status">
                      <span className={`status status-${c.status}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>

                    <div className="management-row__priority">
                      <span className={`prioridade-badge prioridade-${c.prioridade}`}>
                        {PRIORIDADE_LABEL[c.prioridade] || c.prioridade}
                      </span>
                    </div>

                    <div className="management-row__requester">
                      <strong>{c.solicitante?.nome || "—"}</strong>
                      {c.setor && (
                        <div className="secondary-text">Setor: {c.setor}</div>
                      )}
                      {c.solicitante?.tipo && (
                        <div className="secondary-text">{c.solicitante.tipo}</div>
                      )}
                    </div>

                    <div className="management-row__title">
                      <strong className="cell-title">{c.titulo}</strong>
                      <div className="secondary-text">ID #{c.id}</div>
                    </div>

                    <div className="management-row__tech">
                      <strong>{c.tecnico?.nome || "—"}</strong>
                    </div>

                    <div className="management-row__actions">
                      {temAcoes ? (
                        <div
                          className="acoes-menu"
                          ref={(node) => {
                            if (menuAbertoId === c.id) {
                              menuRef.current = node;
                            }
                          }}
                        >
                          <button
                            type="button"
                            className="acoes-trigger"
                            aria-haspopup="menu"
                            aria-expanded={menuAbertoId === c.id}
                            aria-controls={`acoes-menu-${c.id}`}
                            onClick={() => abrirMenu(c.id)}
                            ref={(node) => {
                              if (node) menuButtonRefs.current[c.id] = node;
                            }}
                          >
                            <span className="sr-only">Abrir ações</span>
                            <span aria-hidden="true">⋮</span>
                          </button>

                          {menuAbertoId === c.id && (
                            <div
                              id={`acoes-menu-${c.id}`}
                              role="menu"
                              className="acoes-dropdown"
                            >
                              {isTi && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    fecharMenu();
                                    setChamadoConversa(c);
                                  }}
                                  ref={primeiroItemRef}
                                >
                                  Conversa
                                </button>
                              )}
                              {isTi && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    fecharMenu();
                                    assumirChamado(c.id);
                                  }}
                                >
                                  Assumir
                                </button>
                              )}
                              {isAdmin && !isTi && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    fecharMenu();
                                    setChamadoConversa(c);
                                  }}
                                  ref={primeiroItemRef}
                                >
                                  Conversa
                                </button>
                              )}
                              {isTi && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    fecharMenu();
                                    editarChamado(c);
                                  }}
                                >
                                  Editar
                                </button>
                              )}
                              {podeConcluir && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    fecharMenu();
                                    concluirChamado(c.id);
                                  }}
                                  ref={!isTi ? primeiroItemRef : null}
                                >
                                  Concluir
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    fecharMenu();
                                    remover(c.id);
                                  }}
                                  ref={!isTi && !podeConcluir ? primeiroItemRef : null}
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="secondary-text">—</span>
                      )}
                    </div>
                  </article>
                );
              })}

            {!carregando && chamadosFiltrados.length === 0 && (
              <div className="management-list__feedback">
                <EmptyState
                  title="Nenhum chamado encontrado"
                  description="Refine sua busca ou altere o status selecionado para encontrar registros."
                />
              </div>
            )}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => irParaPagina(pagina - 1)}
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
                onClick={() => irParaPagina(pagina + 1)}
                disabled={pagina >= meta.totalPages || carregando}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      </div>

      {editandoId && (
        <div className="edit-modal-overlay" role="presentation" onClick={fecharEdicao}>
          <div
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-chamado-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="edit-modal__header">
              <div>
                <h3 id="edit-chamado-title">Editar chamado</h3>
                <p>Atualize os dados operacionais sem sair da fila.</p>
              </div>
              <Button variant="ghost" onClick={fecharEdicao}>
                Fechar
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="edit-modal__form">
              {erro && <div className="alert alert-error">{erro}</div>}

              <Input
                label="Título"
                name="titulo"
                placeholder="Título do chamado"
                value={form.titulo}
                onChange={handleChange}
                required
              />

              <Textarea
                label="Descrição"
                name="descricao"
                placeholder="Conte o que precisa ser resolvido"
                value={form.descricao}
                onChange={handleChange}
                required
              />

              <Input
                label="Setor"
                name="setor"
                placeholder="Ex.: Financeiro, RH, Comercial"
                value={form.setor}
                onChange={handleChange}
              />

              {podeDefinirPrioridade ? (
                <Select
                  label="Prioridade"
                  name="prioridade"
                  value={form.prioridade}
                  onChange={handleChange}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </Select>
              ) : (
                <Input
                  label="Prioridade"
                  value="Definida pelo técnico"
                  disabled
                  readOnly
                />
              )}

              <Select
                label="Técnico responsável"
                name="tecnicoId"
                value={form.tecnicoId}
                onChange={handleChange}
              >
                <option value="">Sem atribuição</option>
                {tecnicos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>

              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
              </Select>

              <div className="edit-modal__actions">
                <Button variant="secondary" onClick={fecharEdicao}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary">
                  Atualizar chamado
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChamadoConversationModal
        chamado={chamadoConversa}
        open={Boolean(chamadoConversa)}
        onClose={() => setChamadoConversa(null)}
        allowInternal={isTi || isAdmin}
        onUpdated={() => carregarChamados(pagina)}
      />
    </div>
  );
}
