import { getAuthState, logout, toAppPath, useAuth } from "./auth.js";

let loadingNode = null;

function ensureLoadingOverlay() {
  if (loadingNode) {
    return loadingNode;
  }

  loadingNode = document.createElement("div");
  loadingNode.className = "app-loading-overlay";
  loadingNode.innerHTML = `
    <div class="app-loading-card">
      <p class="eyebrow">NoNPC</p>
      <strong>Verificando sesion...</strong>
    </div>
  `;
  document.body.appendChild(loadingNode);
  return loadingNode;
}

export function setLoadingVisibility(visible) {
  const node = ensureLoadingOverlay();
  node.classList.toggle("is-visible", visible);
}

export function mountAuthSlot() {
  const nav = document.querySelector(".top-nav");
  if (!nav || nav.querySelector(".auth-slot")) {
    return;
  }

  const slot = document.createElement("div");
  slot.className = "auth-slot";
  nav.appendChild(slot);

  useAuth((authState) => {
    slot.innerHTML = "";

    if (authState.loading) {
      const badge = document.createElement("span");
      badge.className = "badge badge-primary";
      badge.textContent = "Cargando";
      slot.appendChild(badge);
      return;
    }

    if (!authState.user || !authState.profile?.username) {
      const link = document.createElement("a");
      link.className = "btn btn-ghost btn-small";
      link.href = toAppPath("login/");
      link.textContent = "Entrar";
      slot.appendChild(link);
      return;
    }

    const badge = document.createElement("a");
    badge.className = "badge badge-primary";
    badge.href = toAppPath("profile/");
    badge.textContent = authState.profile.username;

    const button = document.createElement("button");
    button.className = "btn btn-ghost btn-small";
    button.type = "button";
    button.textContent = "Salir";
    button.addEventListener("click", async () => {
      await logout();
      window.location.replace(toAppPath("login/"));
    });

    slot.append(badge, button);
  });
}

export function syncLoadingWithAuth() {
  setLoadingVisibility(true);
  useAuth((authState) => {
    setLoadingVisibility(authState.loading);
  });
}

export function getCurrentProfile() {
  return getAuthState().profile;
}
