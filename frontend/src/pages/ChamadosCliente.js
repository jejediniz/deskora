import { useAuth } from "../contextos/authContext";
import { useChamados } from "../contextos/chamadosContext";
import { useMemo, useState } from "react";
import { Button, Input } from "../components/ui";

const STATUS_LABEL = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  fechado: "Concluído",
};

const PRIORIDADE_LABEL = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

const STATUS_FILTERS = [
  { label: "Todos", value: "todos" },
  { label: "Abertos", value: "aberto" },
  { label: "Em andamento", value: "em_andamento" },
  { label: "Concluídos", value: "concluido" },
];

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

export default function ChamadosCliente() {
  const { usuario } = useAuth();
  const { chamados, carregando, erro } = useChamados();
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [filtroTexto, setFiltroTexto] = useState("");

  const isAdmin = usuario?.admin === true;
  const isTi = usuario?.tipo === "ti";
  const usuarioId = usuario?.id;

  const chamadosPorPerfil = useMemo(() => {
    if (!usuarioId) return [];

    if (isAdmin) {
      return chamados;
    }

    if (isTi) {
      return chamados.filter(
        (c) => (c.tecnico?.id ?? c.tecnico_id) === usuarioId
      );
    }

    return chamados.filter(
      (c) => (c.usuario_id ?? c.solicitante?.id) === usuarioId
    );
  }, [chamados, usuarioId, isAdmin, isTi]);

  const filteredChamados = useMemo(() => {
    const termos = filtroTexto.trim().toLowerCase();
    return chamadosPorPerfil.filter((c) => {
      const matchesStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "concluido"
          ? ["concluido", "fechado"].includes(c.status)
          : c.status === statusFiltro);

      const matchesTexto =
        !termos ||
        [c.titulo, c.descricao, c.solicitante?.nome, c.id]
          .filter(Boolean)
          .some((valor) => valor.toString().toLowerCase().includes(termos));

      return matchesStatus && matchesTexto;
    });
  }, [chamadosPorPerfil, filtroTexto, statusFiltro]);

  if (carregando) {
    return <p>Carregando chamados...</p>;
  }

  if (erro) {
    return <p className="alert alert-error">{erro}</p>;
  }

  return (
    <>
      <div className="page-header page-header--centered">
        <h2>Meus chamados</h2>
        <p className="page-subtitle">
          Acompanhe o andamento dos seus atendimentos
        </p>
      </div>

      <section className="meus-chamados">
        <div className="meus-chamados-header">

          <div className="filtro-status">
            {STATUS_FILTERS.map((filtro) => (
              <button
                key={filtro.value}
                type="button"
                className={`filtro-btn ${
                  statusFiltro === filtro.value ? "ativo" : ""
                }`}
                onClick={() => setStatusFiltro(filtro.value)}
              >
                {filtro.label}
              </button>
            ))}
          </div>
          <div className="filtro-busca">
            <Input
              label="Buscar chamados"
              hideLabel
              placeholder="Título, descrição ou solicitante"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              className="filtro-btn limpar"
              onClick={() => setFiltroTexto("")}
              disabled={!filtroTexto}
            >
              Limpar
            </Button>
          </div>
        </div>

        {filteredChamados.length === 0 && (
          <p className="empty">Nenhum chamado encontrado neste filtro.</p>
        )}

        <div className="cliente-list">
          {filteredChamados.map((c) => (
            <article key={c.id} className="cliente-card">
              <div className="cliente-topo">
                <span className={`status status-${c.status}`}>
                  {STATUS_LABEL[c.status] || c.status}
                </span>
                <span className="data">{formatDate(c.created_at)}</span>
              </div>
              <h4 className="demanda">{c.titulo}</h4>
              <div className="cliente-meta">
                <span>
                  <strong>Solicitante:</strong> {c.solicitante?.nome || "—"}
                </span>
                {c.solicitante?.tipo && (
                  <span>
                    <strong>Origem:</strong> {c.solicitante.tipo}
                  </span>
                )}
                <span>
                  <strong>Técnico:</strong> {c.tecnico?.nome || "Sem responsável"}
                </span>
              </div>

              <div className="card-info-row">
                <div>
                  <small>Prioridade</small>
                  <div className={`prioridade-badge prioridade-${c.prioridade}`}>
                    {PRIORIDADE_LABEL[c.prioridade] || "—"}
                  </div>
                </div>

                <div>
                  <small>Status atual</small>
                  <strong>{STATUS_LABEL[c.status] || c.status}</strong>
                </div>
              </div>

              {c.descricao && (
                <p className="obs">
                  <strong>Descrição:</strong> {c.descricao}
                </p>
              )}

              <div className="card-footer">
                <span>
                  <small>Criado em</small>
                  <strong>{formatDate(c.created_at)}</strong>
                </span>
                <span>
                  <small>Atualizado</small>
                  <strong>{formatDate(c.updated_at)}</strong>
                </span>
                <span>
                  <small>ID</small>
                  <strong>{c.id}</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
