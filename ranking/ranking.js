import { guardAuthPage } from "../js/auth.js";
import { listenLeaderboard } from "../js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "../js/shell.js";

const rankingList = document.getElementById("rankingList");
const rankingEmpty = document.getElementById("rankingEmpty");
const rankingCount = document.getElementById("rankingCount");

function renderRanking(entries) {
  rankingList.innerHTML = "";
  rankingCount.textContent = `${entries.length} jugadores`;

  if (entries.length === 0) {
    rankingEmpty.classList.remove("is-hidden");
    return;
  }

  rankingEmpty.classList.add("is-hidden");
  entries.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "idea-card";

    const top = document.createElement("div");
    top.className = "idea-top";

    const title = document.createElement("h3");
    title.textContent = `#${index + 1} - ${entry.username || "anon"}`;

    const badge = document.createElement("div");
    badge.className = "badge badge-success";
    badge.textContent = `${Number(entry.xp) || 0} XP`;

    top.append(title, badge);
    card.appendChild(top);
    rankingList.appendChild(card);
  });
}

async function bootstrapRanking() {
  setLoadingVisibility(true);
  mountAuthSlot();
  await guardAuthPage();
  listenLeaderboard(renderRanking);
  setLoadingVisibility(false);
}

bootstrapRanking().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
});
