import { guardAuthPage } from "../js/auth.js";
import { fetchCurrentUserCompletedMissions, listenActivities, listenUserProfile } from "../js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "../js/shell.js";

const profileName = document.getElementById("profileName");
const profileXp = document.getElementById("profileXp");
const profileCompleted = document.getElementById("profileCompleted");
const profileStreak = document.getElementById("profileStreak");
const profileActivityCount = document.getElementById("profileActivityCount");
const profileActivityList = document.getElementById("profileActivityList");
const profileActivityEmpty = document.getElementById("profileActivityEmpty");

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

function renderActivities(activities, userId) {
  const filtered = activities.filter((activity) => activity.userId === userId).slice(0, 8);
  profileActivityCount.textContent = `${filtered.length} eventos`;
  profileActivityList.innerHTML = "";

  if (filtered.length === 0) {
    profileActivityEmpty.classList.remove("is-hidden");
    return;
  }

  profileActivityEmpty.classList.add("is-hidden");
  filtered.forEach((activity) => {
    const card = document.createElement("article");
    card.className = "activity-card";

    const text = document.createElement("p");
    if (activity.type === "challenge_sent") {
      text.textContent = `${activity.username} desafio a ${activity.targetUsername}`;
    } else if (activity.type === "streak_reached") {
      text.textContent = `${activity.username} alcanzo racha de ${activity.streakCount} dias`;
    } else {
      text.textContent = `${activity.username} completo una mision ${activity.missionDifficulty || ""}`.trim();
    }

    const meta = document.createElement("div");
    meta.className = "idea-meta";
    meta.style.marginTop = "10px";
    meta.textContent = formatDate(activity.createdAt);

    card.append(text, meta);
    profileActivityList.appendChild(card);
  });
}

async function bootstrapProfile() {
  setLoadingVisibility(true);
  mountAuthSlot();
  const authState = await guardAuthPage();

  listenUserProfile(authState.user.uid, (profile) => {
    profileName.textContent = profile?.username || "anon";
    profileXp.textContent = `${Number(profile?.xp) || 0} XP`;
    profileStreak.textContent = `${Number(profile?.streak) || 0} dias`;
  });

  const completed = await fetchCurrentUserCompletedMissions(authState.user.uid);
  profileCompleted.textContent = String(completed.length);
  listenActivities((items) => renderActivities(items, authState.user.uid));
  setLoadingVisibility(false);
}

bootstrapProfile().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
});
