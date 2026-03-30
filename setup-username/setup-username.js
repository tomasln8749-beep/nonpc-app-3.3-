import { guardAuthPage, reserveUsername, validateUsername } from "../js/auth.js";
import { setLoadingVisibility } from "../js/shell.js";

const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameSetupInput");
const usernameHint = document.getElementById("usernameHint");

function updateHint() {
  const { valid, sanitized, message } = validateUsername(usernameInput.value);
  usernameInput.value = sanitized;
  usernameHint.textContent = valid ? "Se ve bien. Si esta libre, ya podes continuar." : message;
}

async function handleSubmit(event) {
  event.preventDefault();
  try {
    usernameHint.textContent = "Reservando username...";
    await reserveUsername(usernameInput.value);
    window.location.replace("../index.html");
  } catch (error) {
    usernameHint.textContent = error?.message || "No pudimos guardar tu username.";
  }
}

async function bootstrapSetup() {
  setLoadingVisibility(true);
  await guardAuthPage({ allowMissingUsername: true });
  setLoadingVisibility(false);
  updateHint();

  usernameInput.addEventListener("input", updateHint);
  usernameForm.addEventListener("submit", handleSubmit);
}

bootstrapSetup().catch((error) => {
  setLoadingVisibility(false);
  usernameHint.textContent = error?.message || "No pudimos cargar esta pantalla.";
});
