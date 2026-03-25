import { Routes, Route } from "react-router-dom";

import Inicio from "../pages/Inicio";
import Chamados from "../pages/Chamados";
import ChamadoRapido from "../pages/ChamadoRapido";
import ChamadosCliente from "../pages/ChamadosCliente";
import Login from "../pages/Login";
import PaginaBase from "../pages/PaginaBase";
import Usuarios from "../pages/Usuarios";
import NaoEncontrada from "../pages/NaoEncontrada";

import RotaPrivada from "./RotaPrivada";
import RotaAdmin from "./RotaAdmin";
import RotaTiOuAdmin from "./RotaTiOuAdmin";

export default function AppRoutes() {
  return (
    <Routes>
      {/* LOGIN */}
      <Route path="/login" element={<Login />} />

      {/* ÁREA AUTENTICADA */}
      <Route element={<RotaPrivada />}>
        <Route element={<PaginaBase />}>
          <Route index element={<Inicio />} />
          <Route element={<RotaTiOuAdmin />}>
            <Route path="chamados" element={<Chamados />} />
          </Route>
          <Route path="abrir-chamado" element={<ChamadoRapido />} />
          <Route path="meus-chamados" element={<ChamadosCliente />} />
          <Route element={<RotaAdmin />}>
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Route>

      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  );
}
