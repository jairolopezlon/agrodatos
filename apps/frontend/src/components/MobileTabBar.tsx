import { SECTIONS } from "../constants";

interface MobileTabBarProps {
  activeSection: string;
  filtersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
  onNavigate: () => void;
}

function SectionIcon({ id }: { id: string }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "cultivos") {
    return (
      <svg {...commonProps}>
        <path d="M5 20c0-7 4-12 14-15-1 9-6 14-14 15Z" />
        <path d="M5 20c2-4 5-7 9-9" />
      </svg>
    );
  }

  if (id === "municipios") {
    return (
      <svg {...commonProps}>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (id === "evolucion") {
    return (
      <svg {...commonProps}>
        <path d="M4 4v16h16" />
        <path d="m7 15 4-5 3 3 5-7" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

export function MobileTabBar({
  activeSection,
  filtersOpen,
  hasActiveFilters,
  onToggleFilters,
  onNavigate,
}: MobileTabBarProps) {
  return (
    <nav className="mobile-tabbar" aria-label="Navegación principal">
      {SECTIONS.map((section) => {
        const active = activeSection === section.id;

        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`mobile-tab-item${active ? " is-active" : ""}`}
            aria-current={active ? "location" : undefined}
            onClick={onNavigate}
          >
            <SectionIcon id={section.id} />
            <span className="mobile-tab-label">{section.label}</span>
          </a>
        );
      })}

      <button
        type="button"
        className={`mobile-tab-item${filtersOpen ? " is-active" : ""}`}
        aria-expanded={filtersOpen}
        aria-controls="filters-panel"
        onClick={onToggleFilters}
      >
        <FilterIcon />
        <span className="mobile-tab-label">Filtros</span>
        {hasActiveFilters && (
          <span className="mobile-tab-dot" aria-hidden="true" />
        )}
      </button>
    </nav>
  );
}
