import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../contextos/authContext";
import { Button } from "../components/ui";
import AlternarTema from "./AlternarTema";

export default function Cabecalho() {
  const { estaAutenticado, logout, usuario } = useAuth();

  const isAdmin = usuario?.admin === true;
  const isTi = usuario?.tipo === "ti";

  const linkClass = ({ isActive }) =>
    `nav-btn${isActive ? " active" : ""}`;

  if (!estaAutenticado) return null;

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand">
          <img
            src="/img/logo%20em%20branco.png"
            alt="Deskora"
            className="brand-logo brand-logo--header"
          />
          <span className="app-header__tagline">
            Central de chamados para operação diária.
          </span>
        </Link>

        <nav className="top-nav" aria-label="Navegação principal">
          <NavLink to="/" className={linkClass} end>
            Dashboard
          </NavLink>

          {(isTi || isAdmin) && (
            <NavLink to="/chamados" className={linkClass}>
              Gestão de Chamados
            </NavLink>
          )}

          <NavLink
            to="/abrir-chamado"
            className={({ isActive }) =>
              `nav-btn nav-btn--primary${isActive ? " active" : ""}`
            }
          >
            Abrir Chamado
          </NavLink>

          <NavLink to="/meus-chamados" className={linkClass}>
            Meus Chamados
          </NavLink>

          {isAdmin && (
            <NavLink to="/usuarios" className={linkClass}>
              Usuários
            </NavLink>
          )}
        </nav>

        <div className="app-header__actions">
          <div className="theme-switch-field">
            <span className="theme-switch-field__label" aria-hidden>
              Escuro
            </span>
            <AlternarTema className="theme-switch--header" />
          </div>
          <Button variant="ghost" className="nav-btn logout" onClick={logout}>
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
