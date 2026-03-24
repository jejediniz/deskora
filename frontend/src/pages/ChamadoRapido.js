import { useState } from "react";
import { useAuth } from "../contextos/authContext";
import { useChamados } from "../contextos/chamadosContext";
import { Button, Card, Input, Select, Textarea } from "../components/ui";

const DEMANDAS_PADRAO = [
  "Computador não liga",
  "Internet lenta",
  "Erro em sistema",
  "Impressora não funciona",
  "Solicitação de acesso",
  "Outro problema",
];

export default function ChamadoRapido() {
  const { usuario } = useAuth();
  const isTi = usuario?.tipo === "ti";
  const { criarChamado } = useChamados();

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    setor: "",
  });
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);
  const [carregando, setCarregando] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.titulo || !form.descricao) {
      setErro("Preencha todos os campos obrigatórios");
      return;
    }

    setErro(null);
    setSucesso(null);
    setCarregando(true);
    try {
      await criarChamado({
        titulo: form.titulo,
        descricao: form.descricao,
        prioridade: isTi ? form.prioridade : "media",
        setor: form.setor || undefined,
      });

      setForm({ titulo: "", descricao: "", prioridade: "media", setor: "" });
      setSucesso("Chamado aberto com sucesso!");
    } catch (error) {
      setErro(error.message || "Erro ao abrir chamado");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="center-page">
      <Card className="open-ticket">
        <h2>Abrir Chamado</h2>
        <p>Escolha uma demanda ou descreva o problema para o suporte.</p>

        {erro && <div className="alert alert-error">{erro}</div>}
        {sucesso && <div className="alert alert-success">{sucesso}</div>}

        <form onSubmit={handleSubmit} className="open-form">
          <Select
            label="Selecione um problema"
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            helperText="Use um dos casos prontos ou insira a dúvida manualmente"
          >
            <option value="">Selecione</option>
            {DEMANDAS_PADRAO.map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </Select>

          <Textarea
            label="Descrição"
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            placeholder="Descreva o que está acontecendo com o máximo de detalhes"
          />

          <Input
            label="Setor"
            name="setor"
            value={form.setor}
            onChange={handleChange}
            placeholder="Ex.: Financeiro, RH, Comercial"
          />

          {isTi && (
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
          )}

          <div className="form-actions center">
            <Button type="submit" variant="primary" disabled={carregando}>
              {carregando ? "Enviando..." : "Abrir Chamado"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
