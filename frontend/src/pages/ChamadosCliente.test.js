import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ChamadosCliente from "./ChamadosCliente";
import { ThemeProvider } from "../contextos/themeContext";
import { ToastProvider } from "../contextos/toastContext";

jest.mock("../contextos/authContext", () => ({
  useAuth: () => ({
    usuario: { id: 7, admin: false, tipo: "comum" },
  }),
}));

jest.mock("../contextos/chamadosContext", () => ({
  useChamados: () => ({
    carregando: false,
    erro: null,
    chamados: [
      {
        id: 1,
        titulo: "Impressora sem conexão",
        descricao: "Parou no financeiro",
        status: "aberto",
        prioridade: "alta",
        usuario_id: 7,
        solicitante: { id: 7, nome: "Jessica", tipo: "comum" },
        tecnico: null,
        created_at: "2026-03-20",
        updated_at: "2026-03-21",
      },
      {
        id: 2,
        titulo: "VPN configurada",
        descricao: "Acesso remoto liberado",
        status: "concluido",
        prioridade: "baixa",
        usuario_id: 7,
        solicitante: { id: 7, nome: "Jessica", tipo: "comum" },
        tecnico: { nome: "Carlos" },
        created_at: "2026-03-10",
        updated_at: "2026-03-11",
      },
    ],
  }),
}));

describe("ChamadosCliente", () => {
  it("filtra chamados por texto e status", () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <ChamadosCliente />
        </ToastProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Impressora sem conexão")).toBeInTheDocument();
    expect(screen.getByText("VPN configurada")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /concluídos/i }));

    expect(screen.queryByText("Impressora sem conexão")).not.toBeInTheDocument();
    expect(screen.getByText("VPN configurada")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/buscar chamados/i), {
      target: { value: "vpn" },
    });

    expect(screen.getByText("VPN configurada")).toBeInTheDocument();
  });
});
