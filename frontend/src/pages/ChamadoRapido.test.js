import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChamadoRapido from "./ChamadoRapido";

const mockCriarChamado = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("../contextos/authContext", () => ({
  useAuth: () => ({
    usuario: { tipo: "comum" },
  }),
}));

jest.mock("../contextos/chamadosContext", () => ({
  useChamados: () => ({
    criarChamado: mockCriarChamado,
  }),
}));

jest.mock("../contextos/toastContext", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: jest.fn(),
  }),
}));

describe("ChamadoRapido", () => {
  beforeEach(() => {
    mockCriarChamado.mockReset();
    mockToastSuccess.mockReset();
  });

  it("envia chamado com título livre", async () => {
    mockCriarChamado.mockResolvedValue({});

    render(<ChamadoRapido />);

    fireEvent.change(screen.getByLabelText(/problema ou assunto/i), {
      target: { value: "Erro no CRM" },
    });
    fireEvent.change(screen.getByLabelText(/descrição/i), {
      target: { value: "Tela travando ao abrir clientes." },
    });
    fireEvent.change(screen.getByLabelText(/setor/i), {
      target: { value: "Comercial" },
    });

    fireEvent.click(screen.getByRole("button", { name: /abrir chamado/i }));

    await waitFor(() =>
      expect(mockCriarChamado).toHaveBeenCalledWith({
        titulo: "Erro no CRM",
        descricao: "Tela travando ao abrir clientes.",
        prioridade: "media",
        setor: "Comercial",
      })
    );
  });
});
