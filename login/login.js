import { guardAuthPage, isFirebaseConfigured, loginWithEmail, registerWithEmail, signInWithGoogle, useAuth } from "../js/auth.js";
import { setLoadingVisibility } from "../js/shell.js";

const googleLoginBtn = document.getElementById("googleLoginBtn");
const emailAuthForm = document.getElementById("emailAuthForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const registerBtn = document.getElementById("registerBtn");
const authStatus = document.getElementById("authStatus");
const firebaseConfigWarning = document.getElementById("firebaseConfigWarning");

function showError(error) {
  authStatus.textContent = error?.message || "No pudimos iniciar sesion.";
}

function showConfigWarning() {
  if (isFirebaseConfigured()) {
    firebaseConfigWarning.classList.add("is-hidden");
    return;
  }

  firebaseConfigWarning.classList.remove("is-hidden");
  firebaseConfigWarning.textContent = "Completa js/firebase-config.js con tu proyecto de Firebase antes de usar login.";
}

async function handleGoogleLogin() {
  try {
    authStatus.textContent = "Abriendo Google...";
    await signInWithGoogle();
  } catch (error) {
    showError(error);
  }
}

async function handleEmailLogin(event) {
  event.preventDefault();
  try {
    authStatus.textContent = "Iniciando sesion...";
    await loginWithEmail(emailInput.value.trim(), passwordInput.value);
  } catch (error) {
    showError(error);
  }
}

async function handleRegister() {
  try {
    authStatus.textContent = "Creando cuenta...";
    await registerWithEmail(emailInput.value.trim(), passwordInput.value);
  } catch (error) {
    showError(error);
  }
}

async function bootstrapLogin() {
  setLoadingVisibility(true);
  showConfigWarning();
  await guardAuthPage({ allowAnonymous: true });
  setLoadingVisibility(false);

  useAuth((authState) => {
    if (authState.loading || !authState.user) {
      return;
    }

    window.location.replace(authState.profile?.username ? "../index.html" : "../setup-username/");
  });

  googleLoginBtn.addEventListener("click", handleGoogleLogin);
  emailAuthForm.addEventListener("submit", handleEmailLogin);
  registerBtn.addEventListener("click", handleRegister);
}

bootstrapLogin().catch((error) => {
  setLoadingVisibility(false);
  showError(error);
  showConfigWarning();
});
