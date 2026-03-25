import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./router/routes";

import { AuthProvider } from "./contextos/authContext";
import { ChamadosProvider } from "./contextos/chamadosContext";
import { ToastProvider } from "./contextos/toastContext";
import { ConfirmProvider } from "./contextos/confirmContext";

function App() {
  return (
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
  );
}

export default App;
