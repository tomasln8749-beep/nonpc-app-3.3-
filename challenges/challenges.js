import { guardAuthPage } from "../js/auth.js";
import {
  acceptChallenge,
  listenActiveMissions,
  listenIncomingChallenges,
  processExpiredChallengesForUser,
  rejectChallenge
} from "../js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "../js/shell.js";

const CHALLENGE_PENALTY_XP = 20;
const WARNING_THRESHOLD_MS = 6 * 60 * 60 * 1000;

const challengeUsernameInput = document.getElementById("challengeUsernameInput");
const challengeStatus = document.getElementById("challengeStatus");
const incomingChallenges = document.getElementById("incomingChallenges");
const incomingEmpty = document.getElementById("incomingEmpty");
const incomingCount = document.getElementById("incomingCount");
const activeMissionsList = document.getElementById("activeMissionsList");
const activeMissionsEmpty = document.getElementById("activeMissionsEmpty");
const activeMissionsCount = document.getElementById("activeMissionsCount");

let currentUser = null;

function ensureToast() {
  let toast = document.getElementById("socialToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "socialToast";
    toast.className = "social-toast";
    document.body.appendChild(toast);
  }
  return toast;
}

function showToast(message) {
  const toast = ensureToast();
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (error) {
    return "";
  }
}

function formatTimeLeft(expiresAt) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return "Expiro";
  }

  const totalHours = Math.ceil(remainingMs / 3600000);
  if (totalHours <= 1) {
    return "Queda menos de 1 hora";
  }

  return `Quedan ${totalHours} horas`;
}

function getBadge(challenge) {
  if (challenge.status === "accepted") {
    return { className: "badge badge-success", label: "Aceptado" };
  }

  if (challenge.status === "failed" && challenge.penaltyApplied) {
    return { className: "badge badge-danger", label: "Expirado" };
  }

  if (challenge.status === "failed") {
    return { className: "badge badge-warning", label: "Rechazado" };
  }

  return { className: "badge badge-primary", label: "Pendiente" };
}

function createChallengeCard(challenge) {
  const card = document.createElement("article");
  card.className = "idea-card";

  const title = document.createElement("h3");
  title.textContent = challenge.missionTitle || "Mision";

  const meta = document.createElement("div");
  meta.className = "idea-meta";
  meta.textContent = `de ${challenge.fromUsername} - ${formatDate(challenge.createdAt)}`;

  const badgeData = getBadge(challenge);
  const badge = document.createElement("div");
  badge.className = badgeData.className;
  badge.textContent = badgeData.label;

  const top = document.createElement("div");
  top.className = "idea-top";
  top.append(title, badge);

  const hint = document.createElement("div");
  hint.className = "helper-text";
  if (challenge.status === "pending") {
    hint.textContent = `Expira ${formatDate(challenge.expiresAt)}. ${formatTimeLeft(challenge.expiresAt)}.`;
    if (new Date(challenge.expiresAt).getTime() - Date.now() <= WARNING_THRESHOLD_MS) {
      hint.textContent += " Te quedan pocas horas para aceptarlo.";
    }
  } else if (challenge.status === "failed" && challenge.penaltyApplied) {
    hint.textContent = `No respondiste el desafio a tiempo (-${CHALLENGE_PENALTY_XP} XP).`;
  } else if (challenge.status === "accepted") {
    hint.textContent = "Ya paso a tus misiones activas.";
  } else {
    hint.textContent = "Desafio rechazado.";
  }

  card.append(top, meta, hint);

  if (challenge.status !== "pending") {
    return card;
  }

  const actions = document.createElement("div");
  actions.className = "idea-actions";

  const acceptButton = document.createElement("button");
  acceptButton.className = "btn btn-primary btn-small";
  acceptButton.type = "button";
  acceptButton.textContent = "Aceptar";
  acceptButton.addEventListener("click", async () => {
    await acceptChallenge(challenge, currentUser);
    showToast("Desafio aceptado.");
  });

  const rejectButton = document.createElement("button");
  rejectButton.className = "btn btn-ghost btn-small";
  rejectButton.type = "button";
  rejectButton.textContent = "Rechazar";
  rejectButton.addEventListener("click", async () => {
    await rejectChallenge(challenge.id);
    showToast("Desafio rechazado.");
  });

  actions.append(acceptButton, rejectButton);
  card.appendChild(actions);
  return card;
}

function createActiveMissionCard(mission) {
  const card = document.createElement("article");
  card.className = "idea-card";

  const title = document.createElement("h3");
  title.textContent = mission.missionTitle;

  const meta = document.createElement("div");
  meta.className = "idea-meta";
  meta.textContent = `desafio de ${mission.fromUsername} - ${formatDate(mission.addedAt)}`;

  const badge = document.createElement("div");
  badge.className = "badge badge-success";
  badge.textContent = "Activa";

  const top = document.createElement("div");
  top.className = "idea-top";
  top.append(title, badge);

  card.append(top, meta);
  return card;
}

function renderChallenges(items) {
  const pending = items.filter((challenge) => challenge.status === "pending");
  const urgent = pending.slice().sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];

  challengeStatus.textContent = urgent
    ? `Mostrando desafios para ${currentUser.username}. ${formatTimeLeft(urgent.expiresAt)} para responder el mas urgente.`
    : `Mostrando desafios para ${currentUser.username}.`;

  challengeUsernameInput.value = currentUser.username;
  incomingChallenges.innerHTML = "";
  incomingCount.textContent = `${pending.length} pendientes`;

  if (items.length === 0) {
    incomingEmpty.classList.remove("is-hidden");
    return;
  }

  incomingEmpty.classList.add("is-hidden");
  items.forEach((challenge) => {
    incomingChallenges.appendChild(createChallengeCard(challenge));
  });
}

function renderActiveMissions(items) {
  activeMissionsList.innerHTML = "";
  activeMissionsCount.textContent = `${items.length} activas`;

  if (items.length === 0) {
    activeMissionsEmpty.classList.remove("is-hidden");
    return;
  }

  activeMissionsEmpty.classList.add("is-hidden");
  items.forEach((mission) => {
    activeMissionsList.appendChild(createActiveMissionCard(mission));
  });
}

async function bootstrapChallenges() {
  setLoadingVisibility(true);
  mountAuthSlot();
  const authState = await guardAuthPage();
  currentUser = { uid: authState.user.uid, username: authState.profile.username };
  challengeUsernameInput.value = currentUser.username;
  challengeUsernameInput.disabled = true;

  const penaltyCount = await processExpiredChallengesForUser(currentUser);
  if (penaltyCount > 0) {
    showToast(`No respondiste ${penaltyCount} desafio(s) a tiempo (-${penaltyCount * CHALLENGE_PENALTY_XP} XP)`);
  }

  listenIncomingChallenges(currentUser.uid, renderChallenges);
  listenActiveMissions(currentUser.uid, renderActiveMissions);
  setLoadingVisibility(false);
}

bootstrapChallenges().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
  showToast(error?.message || "No pudimos cargar tus desafios.");
});
