import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { SECTIONS } from "./constants";
import { UnsupportedSchemaVersionError, useAgroData } from "./hooks/useAgroData";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function App() {
  const { activeVersion, payload, versionQuery, payloadQuery } = useAgroData();
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    if (!payload) {
      return;
    }

    let frame = 0;

    const updateActiveSection = () => {
      const header = document.querySelector<HTMLElement>(".site-header");
      const tabbar = document.querySelector<HTMLElement>(".mobile-tabbar");
      const offset = (header?.offsetHeight ?? 0) + 16;
      const tabbarVisible =
        tabbar !== null && window.getComputedStyle(tabbar).display !== "none";
      const bottomLimit = tabbarVisible
        ? window.innerHeight - tabbar.offsetHeight
        : window.innerHeight;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      const visibleArea = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const top = Math.max(rect.top, offset);
        const bottom = Math.min(rect.bottom, bottomLimit);

        return Math.max(0, bottom - top);
      };
      let current: string = SECTIONS[0].id;
      let bestArea = 0;

      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);

        if (!element) {
          continue;
        }

        const area = visibleArea(element);

        if (area > bestArea) {
          bestArea = area;
          current = section.id;
        }
      }

      if (atBottom) {
        current = SECTIONS[SECTIONS.length - 1].id;
      }

      setActiveSection((previous) =>
        previous === current ? previous : current,
      );
    };
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [payload]);

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".section-nav");
    const activeLink = nav?.querySelector<HTMLElement>("a.is-active");

    if (!nav || !activeLink) {
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    if (linkRect.left < navRect.left) {
      nav.scrollLeft -= navRect.left - linkRect.left + 12;
    } else if (linkRect.right > navRect.right) {
      nav.scrollLeft += linkRect.right - navRect.right + 12;
    }
  }, [activeSection]);

  if (versionQuery.isLoading || payloadQuery.isLoading) {
    return (
      <main>
        <div className="loading-state">Cargando datos...</div>
      </main>
    );
  }

  if (versionQuery.isError || payloadQuery.isError) {
    const error = versionQuery.error ?? payloadQuery.error;
    const message =
      error instanceof UnsupportedSchemaVersionError
        ? error.message
        : "No se pudieron cargar los datos. Revisa tu conexión.";

    return (
      <main>
        <div className="alert alert-error" role="alert">
          {message}
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            void versionQuery.refetch();
            void payloadQuery.refetch();
          }}
        >
          Reintentar
        </button>
      </main>
    );
  }

  if (!activeVersion) {
    return (
      <main>
        <div className="empty-state">
          <p>Todavía no hay datos publicados.</p>
          <p>Vuelve más tarde.</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main>
        <div className="loading-state">Preparando datos...</div>
      </main>
    );
  }

  return (
    <main>
      <header className="site-header">
        <div className="site-header-brand">
          <h1>AgroDatos</h1>
          <p>
            Datos del Valle del Cauca · Actualizados el{" "}
            {formatDate(activeVersion.created_at)}
          </p>
        </div>

        <nav className="section-nav" aria-label="Secciones del tablero">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={
                activeSection === section.id ? "is-active" : undefined
              }
              aria-current={
                activeSection === section.id ? "location" : undefined
              }
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <Dashboard
        key={activeVersion.version_id}
        payload={payload}
        activeSection={activeSection}
      />
    </main>
  );
}
