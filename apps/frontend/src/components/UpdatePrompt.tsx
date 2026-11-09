import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="update-prompt" role="status">
      <span>Hay una nueva versión disponible.</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        Actualizar
      </button>
      <button type="button" onClick={() => setNeedRefresh(false)}>
        Cerrar
      </button>
    </div>
  );
}
