import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contextos/authContext";
import {
  listarChamados,
  criarChamado,
  atualizarChamado,
  excluirChamado,
} from "../services/chamadosApi";
import { listarTecnicos } from "../services/usuariosApi";
import { Button, Input, Select, Textarea } from "../components/ui";

const STATUS_LABEL = {
  aberto: "Aberto",
  em_andamento: "Em atendimento",
  concluido: "Concluído",
  fechado: "Concluído",
};

export default function Chamados() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.admin === true;
  const isTi = usuario?.tipo === "ti";
  const podeDefinirPrioridade = isTi;

  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [meta, setMeta] = useState(null);
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

    if (!form.titulo || !form.descricao) return;

    setErro(null);
    try {
    const payload = {
      titulo: form.titulo,
      descricao: form.descricao,
      prioridade: podeDefinirPrioridade ? form.prioridade : "media",
      tecnicoId: form.tecnicoId || undefined,
      setor: form.setor || undefined,
    };

    if (editandoId) {
      if (!podeDefinirPrioridade) {
        delete payload.prioridade;
      }
      payload.status = form.status || "aberto";
      await atualizarChamado(editandoId, payload);
    } else {
      await criarChamado(payload);
    }
    } catch (error) {
      setErro(error.message || "Erro ao salvar chamado");
      return;
    }

    setForm({
      titulo: "",
      descricao: "",
      prioridade: "media",
      tecnicoId: "",
      setor: "",
    });
    setEditandoId(null);
    carregarChamados(pagina);
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

  async function remover(id) {
    if (!window.confirm("Deseja excluir este chamado?")) return;
    setErro(null);
      try {
        await excluirChamado(id);
        carregarChamados(pagina);
    } catch (error) {
      setErro(error.message || "Erro ao excluir chamado");
    }
  }

  async function assumirChamado(id) {
    setErro(null);
    try {
      await atualizarChamado(id, { tecnicoId: usuario.id });
      carregarChamados(pagina);
    } catch (error) {
      setErro(error.message || "Erro ao assumir chamado");
    }
  }

  async function concluirChamado(id) {
    if (!window.confirm("Deseja concluir este chamado?")) return;
    setErro(null);
    try {
      await atualizarChamado(id, { status: "concluido" });
      carregarChamados(pagina);
    } catch (error) {
      setErro(error.message || "Erro ao concluir chamado");
    }
  }

  function irParaPagina(novaPagina) {
    if (novaPagina < 1) return;
    if (meta?.totalPages && novaPagina > meta.totalPages) return;
    carregarChamados(novaPagina);
  }

  function abrirMenu(id) {
    setMenuAbertoId((atual) => (atual === id ? null : id));
  }

  return (
    <div>
      <div className="page-header">
        <h2>Gestão de Chamados</h2>
        <p className="page-subtitle">
          Visualize e gerencie chamados conforme sua permissão
        </p>
      </div>

      <div className="chamados-layout">
        <form onSubmit={handleSubmit} className="form-card">
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

          {editandoId && (
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
          )}

          <div className="form-actions">
            <Button type="submit" variant="primary">
              {editandoId ? "Atualizar chamado" : "Criar chamado"}
            </Button>
          </div>
        </form>

        <div className="table-card">
          <div className="table-header">
            <strong>Chamados cadastrados</strong>
          </div>

          <div className="table-actions">
            <label>
              Itens por página
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

          <table className="chamados-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Título</th>
                <th>Solicitante</th>
                <th>Técnico</th>
                <th>Prioridade</th>
                <th className="acoes-col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan="6">Carregando...</td>
                </tr>
              )}

              {chamados.map((c) => {
                const temAcoes = isTi || isAdmin;
                const podeConcluir =
                  (isTi || isAdmin) &&
                  !["concluido", "fechado"].includes(c.status);
                const primeiroItemRef = (node) => {
                  if (node) menuItemRefs.current[c.id] = node;
                };

                return (
                <tr key={c.id}>
                  <td data-label="Status" className="cell-status">
                    <span className={`status status-${c.status}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td data-label="Título">{c.titulo}</td>
                  <td data-label="Solicitante">
                    {c.solicitante?.nome || "—"}
                    {c.setor && (
                      <div className="secondary-text">Setor: {c.setor}</div>
                    )}
                    {c.solicitante?.tipo && (
                      <div className="secondary-text">{c.solicitante.tipo}</div>
                    )}
                  </td>
                  <td data-label="Técnico">
                    {c.tecnico?.nome || "—"}
                  </td>
                  <td data-label="Prioridade">{c.prioridade}</td>
                  <td data-label="Ações" className="cell-actions">
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
                                  assumirChamado(c.id);
                                }}
                                ref={primeiroItemRef}
                              >
                                Assumir
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
                  </td>
                </tr>
              )})}

              {!carregando && chamados.length === 0 && (
                <tr>
                  <td colSpan="6">Nenhum chamado encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>

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
    </div>
  );
}
