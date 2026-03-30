import { guardAuthPage } from "../js/auth.js";
import { listenActivities } from "../js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "../js/shell.js";

const activitiesList = document.getElementById("activitiesList");
const activitiesEmpty = document.getElementById("activitiesEmpty");
const activitiesCount = document.getElementById("activitiesCount");

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

function buildActivityText(activity) {
  if (activity.type === "challenge_sent") {
    return `${activity.username} desafio a ${activity.targetUsername}`;
  }

  if (activity.type === "streak_reached") {
    return `${activity.username} alcanzo racha de ${activity.streakCount} dias`;
  }

  return `${activity.username} completo una mision ${activity.missionDifficulty || ""}`.trim();
}

function renderFeed(items) {
  activitiesList.innerHTML = "";
  activitiesCount.textContent = `${items.length} eventos`;

  if (items.length === 0) {
    activitiesEmpty.classList.remove("is-hidden");
    return;
  }

  activitiesEmpty.classList.add("is-hidden");
  items.forEach((activity) => {
    const card = document.createElement("article");
    card.className = "activity-card";

    const text = document.createElement("p");
    text.textContent = buildActivityText(activity);

    const meta = document.createElement("div");
    meta.className = "idea-meta";
    meta.style.marginTop = "10px";
    meta.textContent = formatDate(activity.createdAt);

    card.append(text, meta);
    activitiesList.appendChild(card);
  });
}

async function bootstrapFeed() {
  setLoadingVisibility(true);
  mountAuthSlot();
  await guardAuthPage();
  listenActivities(renderFeed);
  setLoadingVisibility(false);
}

bootstrapFeed().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
});
