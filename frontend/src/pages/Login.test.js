import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import Login from "./Login";
import { ThemeProvider } from "../contextos/themeContext";

const mockNavigate = jest.fn();
const mockLogin = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

jest.mock("../contextos/authContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    estaAutenticado: false,
    carregando: false,
    erro: null,
  }),
}));

jest.mock("../contextos/toastContext", () => ({
  useToast: () => ({
    success: mockToastSuccess,
  }),
}));

function renderLogin() {
  return render(
    <ThemeProvider>
      <Login />
    </ThemeProvider>
  );
}

describe("Login", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockToastSuccess.mockReset();
    mockNavigate.mockReset();
  });

  it("exibe validação ao enviar formulário vazio", async () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(
      screen.getByText("Informe email e senha")
    ).toBeInTheDocument();
  });

  it("dispara login e toast de sucesso", async () => {
    mockLogin.mockResolvedValue(true);

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "admin@operadesk.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(mockLogin).toHaveBeenCalledWith("admin@operadesk.com", "123456");
  });
});
