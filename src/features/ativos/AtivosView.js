"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FilterX,
  Package,
  Pencil,
  Plus,
  Ban,
  Search,
} from "lucide-react";
import { useConfirm } from "@/contexts/confirmContext";
import { useToast } from "@/contexts/toastContext";
import {
  STATUS_ATIVO,
  STATUS_ATIVO_LABEL,
  CATEGORIAS_ATIVO_SUGESTOES,
} from "@/constants/ativos";
import {
  exportarAtivosCsv,
  inativarAtivo,
  inativarAtivosEmMassa,
  listarAtivos,
  obterResumoAtivos,
} from "@/services/api/ativosApi";
import { EmptyState } from "@/components/ui";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import StatusAtivoBadge from "./StatusAtivoBadge";
import PatrimonioSlideOver from "./PatrimonioSlideOver";

const LIMITES_PAGINA = [25, 50, 100, 200];

const BULK_MAX_IDS = 200;

const VISIBILIDADE = {
  ATIVOS: "ativos",
  TODOS: "todos",
  INATIVADOS: "inativados",
};

function paramsVisibilidade(vis) {
  if (vis === VISIBILIDADE.TODOS) return { incluirInativos: true, somenteInativos: false };
  if (vis === VISIBILIDADE.INATIVADOS) return { incluirInativos: false, somenteInativos: true };
  return { incluirInativos: false, somenteInativos: false };
}

function formatAtualizado(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const STATUS_ORDER = [
  "todos",
  STATUS_ATIVO.DISPONIVEL,
  STATUS_ATIVO.EM_USO,
  STATUS_ATIVO.EM_MANUTENCAO,
  STATUS_ATIVO.DANIFICADO,
  STATUS_ATIVO.EXTRAVIADO,
  STATUS_ATIVO.BAIXADO,
];

function formatLocalizacao(row) {
  const partes = [row.setor, row.localizacao].filter(Boolean);
  const linha1 = partes.length ? partes.join(" · ") : null;
  const resp = row.responsavel?.trim();
  return { linha1, resp };
}

export default function AtivosView() {
  const router = useRouter();
  const headerCheckboxRef = useRef(null);
  const buscaRef = useRef(null);

  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebouncedValue(busca, 280);
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [visibilidade, setVisibilidade] = useState(VISIBILIDADE.ATIVOS);
  const [ordenar, setOrdenar] = useState("atualizadoEm");
  const [ordem, setOrdem] = useState("desc");
  const [pagina, setPagina] = useState(1);
  const [limitePagina, setLimitePagina] = useState(50);
  const [irPaginaTexto, setIrPaginaTexto] = useState("");
  const [exportando, setExportando] = useState(false);

  const [itens, setItens] = useState([]);
  const [meta, setMeta] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [selecionados, setSelecionados] = useState(() => new Set());
  const [painel, setPainel] = useState({ id: null, aba: "detalhes" });

  const { confirm } = useConfirm();
  const toast = useToast();

  const filtrosAtivos = Boolean(
    (buscaDebounced || "").trim() ||
      categoriaFiltro.trim() ||
      statusFiltro !== "todos" ||
      visibilidade !== VISIBILIDADE.ATIVOS,
  );

  const limparFiltros = useCallback(() => {
    setBusca("");
    setCategoriaFiltro("");
    setStatusFiltro("todos");
    setVisibilidade(VISIBILIDADE.ATIVOS);
    setPagina(1);
  }, []);

  useEffect(() => {
    setSelecionados(new Set());
  }, [buscaDebounced, statusFiltro, categoriaFiltro, visibilidade, ordenar, ordem, pagina, limitePagina]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const vis = paramsVisibilidade(visibilidade);
      const [lista, sum] = await Promise.all([
        listarAtivos({
          q: (buscaDebounced || "").trim() || undefined,
          status: statusFiltro !== "todos" ? statusFiltro : undefined,
          categoria: categoriaFiltro.trim() || undefined,
          ...vis,
          ordenar,
          ordem,
          limit: limitePagina,
          page: pagina,
        }),
        obterResumoAtivos(),
      ]);
      setItens(Array.isArray(lista?.items) ? lista.items : []);
      setMeta(lista?.meta ?? null);
      setResumo(sum);
    } catch (e) {
      const msg =
        e instanceof Error && typeof e.message === "string" && e.message.trim()
          ? e.message.trim()
          : typeof e === "string" && e.trim()
            ? e.trim()
            : "Erro ao carregar ativos.";
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, [buscaDebounced, statusFiltro, categoriaFiltro, visibilidade, ordenar, ordem, pagina, limitePagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    setPagina(1);
  }, [buscaDebounced, statusFiltro, categoriaFiltro, visibilidade, limitePagina, ordenar, ordem]);

  function handleSortColumn(col) {
    if (ordenar === col) {
      setOrdem((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setOrdenar(col);
      setOrdem(col === "nome" ? "asc" : "desc");
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      e.preventDefault();
      buscaRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleExportCsv() {
    if (exportando) return;
    setExportando(true);
    try {
      const vis = paramsVisibilidade(visibilidade);
      const { blob, filename, truncado } = await exportarAtivosCsv({
        q: (buscaDebounced || "").trim() || undefined,
        status: statusFiltro !== "todos" ? statusFiltro : undefined,
        categoria: categoriaFiltro.trim() || undefined,
        ...vis,
        ordenar,
        ordem,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (truncado) {
        toast.error("Exportação limitada a 8000 linhas; o arquivo pode estar incompleto.");
      } else {
        toast.success("Arquivo CSV gerado.");
      }
    } catch (e) {
      const msg =
        e instanceof Error && typeof e.message === "string" && e.message.trim()
          ? e.message.trim()
          : "Não foi possível exportar.";
      toast.error(msg);
    } finally {
      setExportando(false);
    }
  }

  async function handleInativar(row) {
    const ok = await confirm({
      title: "Inativar registro",
      description: "O bem deixa de aparecer nas buscas habituais. Deseja continuar?",
      confirmLabel: "Inativar",
    });
    if (!ok) return;
    try {
      await inativarAtivo(row.id);
      toast.success("Registro inativado.");
      carregar();
      setPainel((p) => (p.id === row.id ? { id: null, aba: "detalhes" } : p));
    } catch (e) {
      const msg =
        e instanceof Error && typeof e.message === "string" && e.message.trim()
          ? e.message.trim()
          : typeof e === "string" && e.trim()
            ? e.trim()
            : "Não foi possível inativar.";
      toast.error(msg);
    }
  }

  async function handleBulkInativar() {
    const ativosAlvo = itens.filter((x) => selecionados.has(x.id) && x.ativo);
    if (!ativosAlvo.length) {
      toast.error("Nenhum registro ativo selecionado.");
      return;
    }
    if (ativosAlvo.length > BULK_MAX_IDS) {
      toast.error(`É possível inativar no máximo ${BULK_MAX_IDS} itens por lote. Reduza a seleção.`);
      return;
    }
    const ok = await confirm({
      title: `Inativar ${ativosAlvo.length} registro${ativosAlvo.length === 1 ? "" : "s"}`,
      description: "Os itens deixam de aparecer nas buscas habituais.",
      confirmLabel: "Inativar todos",
    });
    if (!ok) return;
    try {
      const resultado = await inativarAtivosEmMassa(ativosAlvo.map((r) => r.id));
      const alt = typeof resultado?.alterados === "number" ? resultado.alterados : 0;
      if (alt === 0) {
        toast.error("Nenhum registro pôde ser inativado.");
      } else {
        toast.success(
          `${alt} registro${alt === 1 ? "" : "s"} inativado${alt === 1 ? "" : "s"} em lote.`,
        );
        if (alt < ativosAlvo.length) {
          toast.error("Parte da seleção já estava inativa.");
        }
      }
    } catch (e) {
      const msg =
        e instanceof Error && typeof e.message === "string" && e.message.trim()
          ? e.message.trim()
          : "Não foi possível inativar em lote.";
      toast.error(msg);
    }
    carregar();
    setSelecionados(new Set());
  }

  const itensLista = useMemo(() => (Array.isArray(itens) ? itens : []), [itens]);

  const categoriasLista = useMemo(() => {
    const uniq = new Set(CATEGORIAS_ATIVO_SUGESTOES);
    for (const it of itensLista) {
      if (it.categoria?.trim()) uniq.add(it.categoria.trim());
    }
    return [...uniq].sort((a, b) => a.localeCompare(b));
  }, [itensLista]);

  const abas = useMemo(() => {
    const r = resumo || {};
    const porStatus = {
      [STATUS_ATIVO.DISPONIVEL]: r.disponivel ?? 0,
      [STATUS_ATIVO.EM_USO]: r.emUso ?? 0,
      [STATUS_ATIVO.EM_MANUTENCAO]: r.emManutencao ?? 0,
      [STATUS_ATIVO.DANIFICADO]: r.danificado ?? 0,
      [STATUS_ATIVO.EXTRAVIADO]: r.extraviado ?? 0,
      [STATUS_ATIVO.BAIXADO]: r.baixado ?? 0,
    };
    return STATUS_ORDER.map((key) =>
      key === "todos"
        ? { key: "todos", label: "Todos", count: r.totalCadastrados ?? 0 }
        : { key, label: STATUS_ATIVO_LABEL[key], count: porStatus[key] ?? 0 },
    );
  }, [resumo]);

  const idsNaPagina = useMemo(() => itensLista.map((r) => r.id), [itensLista]);
  const todosMarcados =
    idsNaPagina.length > 0 && idsNaPagina.every((id) => selecionados.has(id));
  const algunsMarcados = idsNaPagina.some((id) => selecionados.has(id)) && !todosMarcados;

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = algunsMarcados;
  }, [algunsMarcados]);

  function alternarSelecionado(id) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodosNaPagina() {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (todosMarcados) idsNaPagina.forEach((id) => next.delete(id));
      else idsNaPagina.forEach((id) => next.add(id));
      return next;
    });
  }

  const ativosSelecionadosNaPagina = useMemo(
    () => itensLista.filter((x) => selecionados.has(x.id) && x.ativo).length,
    [itensLista, selecionados],
  );

  const bulkInativarBloqueado = ativosSelecionadosNaPagina === 0 || ativosSelecionadosNaPagina > BULK_MAX_IDS;

  const intervaloTexto = useMemo(() => {
    if (!meta?.total && meta?.total !== 0) return "";
    const lim = meta.limit || limitePagina;
    const p = meta.page || 1;
    const ini = meta.total === 0 ? 0 : (p - 1) * lim + 1;
    const fim = Math.min(p * lim, meta.total);
    return `${ini} a ${fim} de ${meta.total}`;
  }, [meta, limitePagina]);

  const totalPaginas = meta?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-4 text-od-text">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-od-text to-od-bg text-white shadow-lg shadow-od-text/25 dark:from-od-surface-soft dark:to-od-border/40 dark:text-od-text dark:shadow-none sm:flex"
            aria-hidden
          >
            <Package className="size-7" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-od-muted">
              Inventário corporativo
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-od-text [font-family:var(--font-display)]">
              Patrimônio
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-od-muted">
              Localize bens por nome ou número, filtre pela situação e use ações em lote quando precisar.
            </p>
          </div>
        </div>
        <Link
          href="/ativos/novo"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-od-text bg-od-text px-4 text-sm font-medium text-white shadow-md shadow-od-text/20 transition hover:bg-od-text/90 dark:border-od-border/40 dark:bg-od-surface-muted dark:text-od-text dark:shadow-none dark:hover:bg-od-border/30"
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          Registrar bem
        </Link>
      </header>

      <div className="overflow-hidden rounded-2xl border border-od-border/90 bg-od-card shadow-sm dark:border-od-border/60 dark:bg-od-card dark:shadow-none">
        <div className="border-b border-od-border/40 bg-gradient-to-b from-od-surface-soft/90 to-od-surface-soft/40 px-4 py-4 dark:border-od-border/90 dark:from-od-surface/50 dark:to-od-surface/20">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span
              id="patrimonio-situacao-label"
              className="text-xs font-semibold uppercase tracking-wide text-od-muted"
            >
              Situação
            </span>
            {filtrosAtivos ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-od-muted transition-colors hover:bg-od-surface-muted/70 dark:text-od-muted dark:hover:bg-od-surface-muted/80"
                onClick={limparFiltros}
              >
                <FilterX className="size-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                Limpar filtros
              </button>
            ) : null}
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-labelledby="patrimonio-situacao-label"
          >
            {abas.map((a) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={statusFiltro === a.key}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition-all ${
                  statusFiltro === a.key
                    ? "bg-od-text font-medium text-white shadow-md shadow-od-text/15 ring-1 ring-od-text/10 dark:bg-od-surface-muted dark:font-semibold dark:text-od-text dark:shadow-none dark:ring-od-card/25"
                    : "bg-od-card/90 font-medium text-od-muted ring-1 ring-od-border/90 hover:bg-od-card hover:text-od-text hover:ring-od-border-strong dark:bg-od-surface/60 dark:text-od-muted dark:ring-od-border-strong dark:hover:bg-od-surface-muted dark:hover:text-od-text"
                }`}
                onClick={() => setStatusFiltro(a.key)}
              >
                <span className="whitespace-nowrap">{a.label}</span>
                <span
                  className={`ml-1.5 tabular-nums text-xs ${
                    statusFiltro === a.key ? "text-white/75 dark:text-od-muted" : "text-od-muted"
                  }`}
                >
                  {a.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-od-border/40 bg-od-card p-4 dark:border-od-border/80 dark:bg-od-bg sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative min-w-[min(100%,12rem)] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-od-muted"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              ref={buscaRef}
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou patrimônio… (/ foca aqui)"
              autoComplete="off"
              aria-label="Buscar na lista de patrimônio"
              className="w-full rounded-xl border border-od-border bg-od-surface-soft/80 py-2.5 pl-10 pr-3 text-sm text-od-text placeholder:text-od-muted transition-shadow focus:border-od-border-strong focus:bg-od-card focus:outline-none focus:ring-2 focus:ring-od-text/10 dark:border-od-border-strong dark:bg-od-surface/50 dark:text-od-text dark:placeholder:text-od-muted dark:focus:border-od-muted dark:focus:bg-od-bg dark:focus:ring-od-text/10"
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <label className="block w-full min-w-[10rem] sm:w-48">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-od-muted">
                Categoria
              </span>
              <select
                className="w-full rounded-xl border border-od-border bg-od-card py-2 pl-3 pr-9 text-sm font-normal text-od-text shadow-sm transition-shadow focus:border-od-border-strong focus:outline-none focus:ring-2 focus:ring-od-text/10 dark:border-od-border-strong dark:bg-od-bg dark:text-od-text dark:focus:ring-od-text/10"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <option value="">Todas</option>
                {categoriasLista.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="w-full sm:w-auto">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-od-muted">
                Exibir registros
              </span>
              <div
                className="inline-flex rounded-xl border border-od-border bg-od-surface-muted/70 p-1 dark:border-od-border-strong dark:bg-od-surface/40"
                role="group"
                aria-label="Filtrar por registro ativo ou inativo"
              >
                {[
                  { key: VISIBILIDADE.ATIVOS, label: "Só ativos" },
                  { key: VISIBILIDADE.TODOS, label: "Todos" },
                  {
                    key: VISIBILIDADE.INATIVADOS,
                    label: `Inativados${typeof resumo?.totalInativados === "number" ? ` (${resumo.totalInativados})` : ""}`,
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      visibilidade === opt.key
                        ? "bg-od-card text-od-text shadow-sm ring-1 ring-od-border/80 dark:bg-od-surface-muted dark:text-od-text dark:ring-od-border-strong"
                        : "text-od-muted hover:text-od-text dark:text-od-muted dark:hover:text-od-text"
                    }`}
                    onClick={() => setVisibilidade(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 border-t border-dashed border-od-border pt-3 dark:border-od-border sm:ml-auto sm:w-auto sm:border-t-0 sm:pt-0">
            {busca !== buscaDebounced ? (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Aplicando busca…</span>
            ) : null}
            {meta ? (
              <span className="tabular-nums text-xs text-od-muted sm:ml-auto">{intervaloTexto}</span>
            ) : null}
          </div>
        </div>

        {erro ? (
          <div
            className="border-b border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-800 dark:border-red-900/35 dark:bg-red-950/35 dark:text-red-200"
            role="alert"
          >
            {erro}
          </div>
        ) : null}

        <div className="max-h-[min(70vh,780px)] overflow-auto">
          {carregando && !itensLista.length ? (
            <div className="divide-y divide-od-border/35 dark:divide-od-border/45" aria-busy="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex animate-pulse gap-3 px-4 py-3">
                  <div className="h-4 w-4 shrink-0 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                  <div className="h-4 flex-1 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                  <div className="h-4 w-24 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                  <div className="h-4 w-40 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                  <div className="h-4 w-20 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                  <div className="h-4 w-28 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                  <div className="h-4 w-16 rounded bg-od-surface-muted dark:bg-od-surface-muted" />
                </div>
              ))}
            </div>
          ) : itensLista.length === 0 ? (
            <div className="p-6">
              {filtrosAtivos ? (
                <EmptyState
                  title="Nada encontrado"
                  description="Ajuste a busca, a situação ou a exibição (ativos / todos / inativados)."
                  actionLabel="Limpar filtros"
                  onAction={limparFiltros}
                >
                  <div className="mt-4 flex max-w-lg flex-col gap-2 text-left text-sm text-od-muted">
                    <p className="text-xs font-medium uppercase tracking-wide text-od-muted">
                      Sugestões
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="border border-od-border bg-od-card px-2 py-1 text-xs font-medium text-od-text-soft dark:border-od-border-strong dark:bg-od-bg dark:text-od-text"
                        onClick={() => {
                          setVisibilidade(VISIBILIDADE.TODOS);
                          setPagina(1);
                        }}
                      >
                        Ver ativos e inativados
                      </button>
                      <button
                        type="button"
                        className="border border-od-border bg-od-card px-2 py-1 text-xs font-medium text-od-text-soft dark:border-od-border-strong dark:bg-od-bg dark:text-od-text"
                        onClick={() => {
                          setStatusFiltro("todos");
                          setPagina(1);
                        }}
                      >
                        Qualquer situação
                      </button>
                      {categoriasLista.slice(0, 4).map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="border border-od-border bg-od-card px-2 py-1 text-xs font-medium text-od-text-soft dark:border-od-border-strong dark:bg-od-bg dark:text-od-text"
                          onClick={() => {
                            setCategoriaFiltro(c);
                            setPagina(1);
                          }}
                        >
                          Categoria: {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </EmptyState>
              ) : (
                <EmptyState
                  title="Nenhum bem cadastrado"
                  description="Comece pelo botão Registrar bem."
                  actionLabel="Registrar bem"
                  onAction={() => router.push("/ativos/novo")}
                />
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-od-border/90 bg-od-surface-soft/95 backdrop-blur-md dark:border-od-border dark:bg-od-surface/95">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.06em] text-od-muted">
                  <th scope="col" className="w-10 border-b border-od-border/90 px-3 py-3 dark:border-od-border">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={todosMarcados}
                      onChange={alternarTodosNaPagina}
                      aria-label="Selecionar todos nesta página"
                      className="size-3.5 rounded border-od-border-strong text-od-text dark:border-od-border-strong"
                    />
                  </th>
                  <th scope="col" className="border-b border-od-border/90 px-3 py-3 dark:border-od-border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-start gap-1 text-left font-semibold uppercase tracking-[0.06em] text-od-muted hover:text-od-text-soft dark:text-od-muted dark:hover:text-od-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSortColumn("nome");
                      }}
                    >
                      Item
                      {ordenar === "nome" ? (
                        ordem === "asc" ? (
                          <ArrowUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th scope="col" className="border-b border-od-border/90 px-3 py-3 dark:border-od-border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-start gap-1 text-left font-semibold uppercase tracking-[0.06em] text-od-muted hover:text-od-text-soft dark:text-od-muted dark:hover:text-od-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSortColumn("categoria");
                      }}
                    >
                      Categoria
                      {ordenar === "categoria" ? (
                        ordem === "asc" ? (
                          <ArrowUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th scope="col" className="border-b border-od-border/90 px-3 py-3 dark:border-od-border">
                    Localização
                  </th>
                  <th scope="col" className="border-b border-od-border/90 px-3 py-3 dark:border-od-border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-start gap-1 text-left font-semibold uppercase tracking-[0.06em] text-od-muted hover:text-od-text-soft dark:text-od-muted dark:hover:text-od-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSortColumn("status");
                      }}
                    >
                      Situação
                      {ordenar === "status" ? (
                        ordem === "asc" ? (
                          <ArrowUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th scope="col" className="whitespace-nowrap border-b border-od-border/90 px-3 py-3 dark:border-od-border">
                    <button
                      type="button"
                      className="flex w-full items-center justify-start gap-1 text-left font-semibold uppercase tracking-[0.06em] text-od-muted hover:text-od-text-soft dark:text-od-muted dark:hover:text-od-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSortColumn("atualizadoEm");
                      }}
                    >
                      Atualizado
                      {ordenar === "atualizadoEm" ? (
                        ordem === "asc" ? (
                          <ArrowUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th scope="col" className="w-24 border-b border-od-border/90 px-3 py-3 text-right dark:border-od-border">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-od-border/35 bg-od-card dark:divide-od-border/45 dark:bg-od-bg">
                {itensLista.map((row) => {
                  const { linha1, resp } = formatLocalizacao(row);
                  return (
                    <tr
                      key={row.id}
                      className="group cursor-pointer transition-colors hover:bg-od-surface-soft/90 dark:hover:bg-od-surface/40"
                      onClick={() => setPainel({ id: row.id, aba: "detalhes" })}
                    >
                      <td
                        className={`px-3 py-2.5 align-middle ${!row.ativo ? "opacity-60" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selecionados.has(row.id)}
                          onChange={() => alternarSelecionado(row.id)}
                          aria-label={`Selecionar ${row.nome}`}
                          className="size-3.5 rounded border-od-border-strong text-od-text dark:border-od-border-strong"
                        />
                      </td>
                      <td className={`max-w-[220px] px-3 py-2.5 align-middle ${!row.ativo ? "opacity-60" : ""}`}>
                        <div className="truncate font-medium text-od-text">{row.nome}</div>
                        <code className="mt-0.5 inline-block font-mono text-[11px] tabular-nums text-od-muted">
                          {row.numeroPatrimonio}
                        </code>
                        {(row.marca || row.modelo) && (
                          <div className="truncate text-[11px] text-od-muted">
                            {[row.marca, row.modelo].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 align-middle text-od-text-soft ${!row.ativo ? "opacity-60" : ""}`}>
                        <span className="line-clamp-2">{row.categoria || "—"}</span>
                      </td>
                      <td className={`max-w-[200px] px-3 py-2.5 align-middle text-xs text-od-text-soft ${!row.ativo ? "opacity-60" : ""}`}>
                        {!linha1 && !resp ? (
                          "—"
                        ) : (
                          <>
                            {linha1 ? <div className="line-clamp-2">{linha1}</div> : null}
                            {resp ? <div className="text-od-muted">Resp. {resp}</div> : null}
                          </>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 align-middle ${!row.ativo ? "opacity-60" : ""}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusAtivoBadge status={row.status} />
                          {!row.ativo ? (
                            <span className="text-[10px] font-medium uppercase text-od-muted">inativo</span>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2.5 align-middle text-xs tabular-nums text-od-muted ${!row.ativo ? "opacity-60" : ""}`}
                      >
                        {formatAtualizado(row.atualizadoEm)}
                      </td>
                      <td className="px-3 py-2.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100">
                          <button
                            type="button"
                            className="rounded-lg border border-transparent p-1.5 text-od-muted transition-colors hover:border-od-border hover:bg-od-surface-muted hover:text-od-text dark:hover:border-od-border-strong dark:hover:bg-od-surface-muted dark:hover:text-od-text"
                            aria-label="Editar"
                            onClick={() => setPainel({ id: row.id, aba: "editar" })}
                          >
                            <Pencil className="size-4" strokeWidth={1.75} />
                          </button>
                          {row.ativo ? (
                            <button
                              type="button"
                              className="rounded-lg border border-transparent p-1.5 text-od-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                              aria-label="Inativar"
                              onClick={() => handleInativar(row)}
                            >
                              <Ban className="size-4" strokeWidth={1.75} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {meta && !erro ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-od-border/90 bg-od-surface-soft/80 px-4 py-3.5 text-sm dark:border-od-border dark:bg-od-surface/35">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="text-sm font-medium text-od-text">
                Página {meta.page} de {totalPaginas}
              </span>
              <span className="tabular-nums text-xs text-od-muted">{intervaloTexto}</span>
              <label className="flex items-center gap-2 text-sm text-od-text-soft">
                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-od-muted">
                  Ir para
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={irPaginaTexto}
                  onChange={(e) => setIrPaginaTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const n = parseInt(irPaginaTexto, 10);
                    if (!Number.isFinite(n)) return;
                    setPagina(Math.min(totalPaginas, Math.max(1, n)));
                    setIrPaginaTexto("");
                  }}
                  placeholder={`1–${totalPaginas}`}
                  className="w-16 rounded-lg border border-od-border bg-od-card px-2 py-1.5 text-center text-sm tabular-nums shadow-sm focus:border-od-border-strong focus:outline-none focus:ring-2 focus:ring-od-text/10 dark:border-od-border-strong dark:bg-od-bg dark:text-od-text dark:focus:ring-od-text/10"
                  aria-label="Ir para página"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-od-text-soft">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-od-muted">
                  Por página
                </span>
                <select
                  value={limitePagina}
                  onChange={(e) => setLimitePagina(Number(e.target.value))}
                  className="rounded-lg border border-od-border bg-od-card py-1.5 pl-2.5 pr-8 text-sm shadow-sm focus:border-od-border-strong focus:outline-none focus:ring-2 focus:ring-od-text/10 dark:border-od-border-strong dark:bg-od-bg dark:text-od-text dark:focus:ring-od-text/10"
                >
                  {LIMITES_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={exportando}
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-od-border bg-od-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-od-surface-soft disabled:opacity-50 dark:border-od-border-strong dark:bg-od-bg dark:text-od-text dark:hover:bg-od-surface"
              >
                <Download className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {exportando ? "Exportando…" : "Exportar CSV"}
              </button>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  className="rounded-lg border border-od-border bg-od-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-od-surface-soft disabled:opacity-40 dark:border-od-border-strong dark:bg-od-bg dark:text-od-text dark:hover:bg-od-surface"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pagina >= totalPaginas}
                  className="rounded-lg border border-od-border bg-od-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-od-surface-soft disabled:opacity-40 dark:border-od-border-strong dark:bg-od-bg dark:text-od-text dark:hover:bg-od-surface"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {selecionados.size > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-od-border/90 bg-od-card/95 px-4 py-3.5 shadow-[0_-4px_24px_-4px_rgb(0_0_0/0.08)] backdrop-blur-md dark:border-od-border dark:bg-od-bg/95">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-medium text-od-text">
              <span className="tabular-nums">{selecionados.size}</span>{" "}
              {selecionados.size === 1 ? "item selecionado" : "itens selecionados"} nesta página
              {ativosSelecionadosNaPagina > BULK_MAX_IDS ? (
                <span className="mt-1 block text-xs font-normal text-amber-700 dark:text-amber-400">
                  Limite de inativação em lote: {BULK_MAX_IDS} itens ativos. Reduza a seleção.
                </span>
              ) : null}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-od-border-strong bg-od-card px-3.5 py-2 text-sm font-medium text-od-text-soft shadow-sm transition-colors hover:bg-od-surface-soft dark:border-od-border-strong dark:bg-od-surface dark:text-od-text dark:hover:bg-od-surface-muted"
                onClick={() => setSelecionados(new Set())}
              >
                Limpar seleção
              </button>
              <button
                type="button"
                disabled={bulkInativarBloqueado}
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-800 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-red-900/80 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/70"
                onClick={handleBulkInativar}
              >
                Inativar selecionados
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PatrimonioSlideOver
        open={Boolean(painel.id)}
        ativoId={painel.id}
        initialTab={painel.aba}
        onClose={() => setPainel({ id: null, aba: "detalhes" })}
        onSaved={() => carregar()}
      />
    </div>
  );
}
