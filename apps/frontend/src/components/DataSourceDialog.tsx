import { useRef } from "react";

export function DataSourceDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openDialog = () => {
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <button type="button" className="footer-link" onClick={openDialog}>
        Fuente de datos
      </button>

      <dialog
        ref={dialogRef}
        className="data-source-dialog"
        aria-labelledby="data-source-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeDialog();
          }
        }}
      >
        <div className="dialog-header">
          <h2 id="data-source-title">Fuente de datos</h2>
          <button
            type="button"
            className="dialog-close"
            onClick={closeDialog}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="dialog-body">
          <p>
            AgroDatos usa los datos abiertos de las Evaluaciones Agropecuarias
            Municipales (EVA) publicados en{" "}
            <a
              href="https://www.datos.gov.co/"
              target="_blank"
              rel="noreferrer"
            >
              datos.gov.co
            </a>
            , filtrados únicamente para el Valle del Cauca (código 76).
          </p>

          <ul>
            <li>
              <strong>Histórica EVA</strong> — dataset{" "}
              <a
                href="https://www.datos.gov.co/d/2pnw-mmge"
                target="_blank"
                rel="noreferrer"
              >
                <code>2pnw-mmge</code>
              </a>
              . Años 2006–2018. 15.774 registros de Valle.
            </li>
            <li>
              <strong>Vigente EVA 2019–2025</strong> — dataset{" "}
              <a
                href="https://www.datos.gov.co/d/uejq-wxrr"
                target="_blank"
                rel="noreferrer"
              >
                <code>uejq-wxrr</code>
              </a>
              . Años 2019–2025. 10.589 registros de Valle.
            </li>
          </ul>

          <p>
            Total extraído: <strong>26.363</strong> registros. Después de las
            reglas de calidad quedan <strong>25.909</strong> registros
            aceptados.
          </p>

          <p>
            2006 fue un reporte parcial piloto: 374 registros, 42 municipios, 24
            cultivos y solo el periodo <code>2006B</code>. El historial
            comparable va de 2007 a 2025.
          </p>

          <p>
            Los nombres de cultivos se normalizan a una clave en mayúsculas sin
            tildes (preservando la Ñ); la etiqueta visible conserva las tildes
            cuando la fuente las provee.
          </p>

          <p>
            Datos abiertos bajo la Ley 1712 de 2014. Proyecto distribuido bajo
            licencia MIT.
          </p>
        </div>
      </dialog>
    </>
  );
}
