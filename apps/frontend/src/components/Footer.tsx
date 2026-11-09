import { DataSourceDialog } from "./DataSourceDialog";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a href="/" className="footer-brand">AgroDatos · Valle del Cauca</a>

        <nav aria-label="Información del proyecto">
          <DataSourceDialog />
          <a
            href="https://github.com/jairolopezlon/agrodatos"
            target="_blank"
            rel="noreferrer"
          >
            Repositorio
          </a>
        </nav>

        <p className="footer-muted">
          Datos abiertos de datos.gov.co · MIT
        </p>
      </div>
    </footer>
  );
}
