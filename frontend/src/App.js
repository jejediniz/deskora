import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./router/routes";

import { ThemeProvider } from "./contextos/themeContext";
import { AuthProvider } from "./contextos/authContext";
import { ChamadosProvider } from "./contextos/chamadosContext";
import { ToastProvider } from "./contextos/toastContext";
import { ConfirmProvider } from "./contextos/confirmContext";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <ChamadosProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </ChamadosProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
