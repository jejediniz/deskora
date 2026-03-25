import { Outlet } from "react-router-dom";
import Cabecalho from "../componentes/Cabecalho";
import Container from "../componentes/Container";
import Rodape from "../componentes/Rodape";

export default function PaginaBase() {
  return (
    <div className="app-shell">
      <Cabecalho />
      <Container className="app-main">
        <Outlet />
      </Container>
      <Rodape />
    </div>
  );
}
