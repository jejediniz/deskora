import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChamados } from "../contextos/chamadosContext";
import { Button, Card } from "../components/ui";

/* ======================
   HOOK DE ANIMAÇÃO
====================== */
function useAnimatedNumber(valor, duracao = 500) {
  const [animado, setAnimado] = useState(0);

  useEffect(() => {
    let inicio = 0;
    const incremento = Math.max(1, Math.ceil(valor / (duracao / 16)));

    function animar() {
      inicio += incremento;
      if (inicio >= valor) {
        setAnimado(valor);
        return;
      }
      setAnimado(inicio);
      requestAnimationFrame(animar);
    }

    animar();
  }, [valor, duracao]);

  return animado;
}

export default function Inicio() {
  const { chamados } = useChamados();
  const navigate = useNavigate();
  const [modalKey, setModalKey] = useState(null);

  /* ======================
     MÉTRICAS REAIS
  ====================== */
  const total = chamados.length;

  const abertos = chamados.filter((c) => c.status === "aberto").length;
  const andamento = chamados.filter((c) => c.status === "em_andamento").length;
  const concluidos = chamados.filter((c) =>
    ["concluido", "fechado"].includes(c.status)
  ).length;

  /* ======================
     NÚMEROS ANIMADOS
  ====================== */
  const totalAnimado = useAnimatedNumber(total);
  const abertosAnimado = useAnimatedNumber(abertos);
  const andamentoAnimado = useAnimatedNumber(andamento);
  const concluidosAnimado = useAnimatedNumber(concluidos);

  const metricCards = useMemo(
    () => [
      {
        key: "total",
        label: "Total de chamados",
        value: totalAnimado,
        sublabel: "Chamados registrados no sistema",
        variant: "primary",
        icon: "📊",
      },
      {
        key: "abertos",
        label: "Abertos",
        value: abertosAnimado,
        sublabel: "Demandas aguardando atendimento",
        variant: "warning",
        icon: "📂",
      },
      {
        key: "andamento",
        label: "Em andamento",
        value: andamentoAnimado,
        sublabel: "Técnicos trabalhando ativo",
        variant: "primary",
        icon: "🛠️",
      },
      {
        key: "concluidos",
        label: "Concluídos",
        value: concluidosAnimado,
        sublabel: "Atendimentos concluídos",
        variant: "success",
        icon: "✅",
      },
    ],
    [totalAnimado, abertosAnimado, andamentoAnimado, concluidosAnimado]
  );

  const STATUS_LABEL = {
    aberto: "Aberto",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    fechado: "Concluído",
  };

  const filtrarPorCard = useCallback(
    (key) => {
      if (key === "abertos") return chamados.filter((c) => c.status === "aberto");
      if (key === "andamento") {
        return chamados.filter((c) => c.status === "em_andamento");
      }
      if (key === "concluidos") {
        return chamados.filter((c) =>
          ["concluido", "fechado"].includes(c.status)
        );
      }
      return chamados;
    },
    [chamados]
  );

  const detalhesChamados = useMemo(() => {
    if (!modalKey) return [];
    return filtrarPorCard(modalKey);
  }, [modalKey, filtrarPorCard]);

  const resumoPrioridade = useMemo(() => {
    return detalhesChamados.reduce(
      (acc, chamado) => {
        const prioridade = chamado.prioridade || "media";
        acc[prioridade] = (acc[prioridade] || 0) + 1;
        return acc;
      },
      { baixa: 0, media: 0, alta: 0 }
    );
  }, [detalhesChamados]);

  const fecharModal = useCallback(() => {
    setModalKey(null);
  }, []);

  useEffect(() => {
    if (!modalKey) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        fecharModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalKey, fecharModal]);

  const modalTitle =
    metricCards.find((card) => card.key === modalKey)?.label || "";

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("pt-BR") : "—";

  return (
    <div>
      <div className="page-header page-header--centered">
        <h2>Dashboard</h2>
        <p className="page-subtitle">
          Visão geral dos chamados com indicadores importantes e próximos passos.
        </p>
        <div className="page-header-actions">
          <Button variant="ghost" onClick={() => navigate("/abrir-chamado")}>
            Abrir chamado
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/chamados")}
            className="btn-md"
          >
            Gestão completa
          </Button>
        </div>
      </div>

      <section className="dashboard-grid">
        {metricCards.map((card) => (
          <Card
            key={card.key}
            className="metric-card metric-card--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setModalKey(card.key)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setModalKey(card.key);
              }
            }}
          >
            <div className="metric-card__header">
              <span className="metric-card__icon">{card.icon}</span>
              <span className="metric-card__label">{card.label}</span>
            </div>
            <strong className="metric-card__value">{card.value}</strong>
            <p className="metric-card__body">{card.sublabel}</p>
          </Card>
        ))}
      </section>

      {modalKey && (
        <div
          className="dashboard-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle}
          onClick={fecharModal}
        >
          <div
            className="dashboard-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dashboard-modal__header">
              <div>
                <h3>{modalTitle}</h3>
                <p className="dashboard-modal__subtitle">
                  {detalhesChamados.length} chamado
                  {detalhesChamados.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button variant="ghost" onClick={fecharModal}>
                Fechar
              </Button>
            </header>

            <div className="dashboard-modal__summary">
              <div>
                <span>Baixa</span>
                <strong>{resumoPrioridade.baixa}</strong>
              </div>
              <div>
                <span>Média</span>
                <strong>{resumoPrioridade.media}</strong>
              </div>
              <div>
                <span>Alta</span>
                <strong>{resumoPrioridade.alta}</strong>
              </div>
            </div>

            {detalhesChamados.length === 0 ? (
              <p className="dashboard-modal__empty">
                Nenhum chamado encontrado para este filtro.
              </p>
            ) : (
              <ul className="dashboard-modal__list">
                {detalhesChamados.slice(0, 8).map((chamado) => (
                  <li key={chamado.id}>
                    <div className="dashboard-modal__item">
                      <div>
                        <strong>{chamado.titulo}</strong>
                        <div className="dashboard-modal__meta">
                          <span>
                            {STATUS_LABEL[chamado.status] || chamado.status}
                          </span>
                          <span>{formatDate(chamado.created_at)}</span>
                        </div>
                      </div>
                      <div className="dashboard-modal__side">
                        <span>
                          {chamado.solicitante?.nome || "Solicitante —"}
                        </span>
                        <span className="dashboard-modal__priority">
                          {chamado.prioridade || "media"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {detalhesChamados.length > 8 && (
              <div className="dashboard-modal__footer">
                <Button
                  variant="secondary"
                  onClick={() => {
                    fecharModal();
                    navigate("/chamados");
                  }}
                >
                  Ver todos na gestão
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
