import { getAuthState, guardAuthPage } from "../js/auth.js";
import { fetchCurrentUserCompletedMissions, listenActiveMissions } from "../js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "../js/shell.js";

const MISSION_STORAGE_KEY = "nonpc-last-mission";
const DAILY_MISSION_STORAGE_KEY = "misionDiaria";

const lastMissionTitle = document.getElementById("lastMissionTitle");
const lastMissionMeta = document.getElementById("lastMissionMeta");
const dailyMissionPreview = document.getElementById("dailyMissionPreview");
const dailyMissionPreviewMeta = document.getElementById("dailyMissionPreviewMeta");
const activeMissionCount = document.getElementById("activeMissionCount");
const recentMissionCount = document.getElementById("recentMissionCount");
const recentMissionsList = document.getElementById("recentMissionsList");
const recentMissionsEmpty = document.getElementById("recentMissionsEmpty");

function loadJson(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return stored ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function renderLocalMissionCards() {
  const lastMission = loadJson(MISSION_STORAGE_KEY, null);
  if (lastMission?.texto) {
    lastMissionTitle.textContent = lastMission.texto;
    lastMissionMeta.textContent = `${lastMission.dificultad || "Media"} - ${lastMission.xp || 0} XP`;
  }

  const dailyMission = loadJson(DAILY_MISSION_STORAGE_KEY, null);
  if (dailyMission?.mision?.texto) {
    dailyMissionPreview.textContent = dailyMission.mision.texto;
    dailyMissionPreviewMeta.textContent = `${dailyMission.mision.xp || 30} XP - ${dailyMission.fecha}`;
  }
}

function renderRecentMissions(items) {
  recentMissionsList.innerHTML = "";
  recentMissionCount.textContent = `${items.length} items`;

  if (items.length === 0) {
    recentMissionsEmpty.classList.remove("is-hidden");
    return;
  }

  recentMissionsEmpty.classList.add("is-hidden");
  items.slice(0, 8).forEach((mission) => {
    const card = document.createElement("article");
    card.className = "idea-card";

    const top = document.createElement("div");
    top.className = "idea-top";

    const title = document.createElement("h3");
    title.textContent = mission.texto;

    const badge = document.createElement("div");
    badge.className = "badge badge-primary";
    badge.textContent = `+${mission.xp || 0} XP`;

    const meta = document.createElement("div");
    meta.className = "idea-meta";
    meta.textContent = `${mission.dificultad || "Media"} - ${new Date(mission.completedAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })}`;

    top.append(title, badge);
    card.append(top, meta);
    recentMissionsList.appendChild(card);
  });
}

async function bootstrapMissionsPage() {
  setLoadingVisibility(true);
  mountAuthSlot();
  const authState = await guardAuthPage();
  renderLocalMissionCards();

  listenActiveMissions(authState.user.uid, (missions) => {
    activeMissionCount.textContent = String(missions.length);
  });

  const recent = await fetchCurrentUserCompletedMissions(authState.user.uid);
  renderRecentMissions(recent);
  setLoadingVisibility(false);
}

bootstrapMissionsPage().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
});
