import { getAuthState, guardAuthPage } from "./js/auth.js";
import {
  completeDailyMission as completeDailyMissionInDb,
  completeMissionAndAwardXp,
  fetchCurrentUserCompletedMissions,
  levelFromXp,
  listenUserProfile,
  processExpiredChallengesForUser
} from "./js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "./js/shell.js";

const faciles = [
  { texto: "Escuchar una cancion sin tocar el celular", xp: 5 },
  { texto: "Ordenar solo una parte de tu pieza", xp: 5 },
  { texto: "Tomar agua y no mirar pantallas por 10 minutos", xp: 5 },
  { texto: "Salir a tomar aire 5 minutos", xp: 5 },
  { texto: "Cambiar algo minimo de tu rutina hoy", xp: 5 },
  { texto: "Escribir 3 cosas que hiciste hoy", xp: 5 },
  { texto: "Mirar por la ventana sin distracciones", xp: 5 },
  { texto: "Estirarte durante 5 minutos", xp: 5 },
  { texto: "No usar el celular por 20 minutos", xp: 5 },
  { texto: "Ordenar tu mochila o escritorio", xp: 5 },
  { texto: "Escuchar un sonido ambiente sin hacer nada mas", xp: 5 },
  { texto: "Pensar una idea nueva durante 5 minutos", xp: 5 },
  { texto: "Dejar el celular lejos mientras comes", xp: 5 },
  { texto: "Hacer algo rapido que venias evitando", xp: 5 },
  { texto: "Aprender una palabra nueva", xp: 5 }
];

const medias = [
  { texto: "Ir a un lugar publico sin usar el celular", xp: 10 },
  { texto: "Caminar 15 minutos sin auriculares", xp: 10 },
  { texto: "Hablar con alguien nuevo aunque sea 1 minuto", xp: 10 },
  { texto: "Decirle algo positivo a alguien", xp: 10 },
  { texto: "Probar una comida que nunca elegirias", xp: 10 },
  { texto: "Entrar a una tienda y mirar todo con calma", xp: 10 },
  { texto: "Sentarte en un lugar distinto al habitual", xp: 10 },
  { texto: "Leer 10 paginas de un libro", xp: 10 },
  { texto: "Hacer algo productivo que venias evitando", xp: 10 },
  { texto: "Cambiar completamente tu rutina por una hora", xp: 10 },
  { texto: "Quedarte 10 minutos sin estimulos digitales", xp: 10 },
  { texto: "Hacer una pregunta simple a un desconocido", xp: 10 },
  { texto: "Mirar una pelicula sin tocar el celular", xp: 10 },
  { texto: "Cocinar algo distinto a lo habitual", xp: 10 },
  { texto: "Salir sin musica ni distracciones", xp: 10 },
  { texto: "Escribir lo que pensas durante 10 minutos", xp: 10 },
  { texto: "Observar a la gente sin juzgar por 5 minutos", xp: 10 }
];

const hardcore = [
  { texto: "Gritar 'SANDIA' una vez en un supermercado y seguir como si nada", xp: 20 },
  { texto: "Entrar a un local, decir 'esto es interesante' y salir", xp: 20 },
  { texto: "Caminar en camara lenta 20 segundos en un lugar publico", xp: 20 },
  { texto: "Aplaudir solo despues de algo totalmente normal", xp: 20 },
  { texto: "Saludar a alguien como si fuera tu amigo de toda la vida", xp: 20 },
  { texto: "Quedarte quieto mirando un punto fijo 1 minuto", xp: 20 },
  { texto: "Decir 'esto es cine' en un momento completamente normal", xp: 20 },
  { texto: "Entrar a una tienda y preguntar algo innecesario con seriedad", xp: 20 },
  { texto: "Actuar como turista perdido en tu propia ciudad", xp: 20 },
  { texto: "Hacer una mini reverencia al bajarte del transporte", xp: 20 },
  { texto: "Mirar un producto y decir 'esto cambia todo'", xp: 20 },
  { texto: "Caminar como modelo por 20 segundos en publico", xp: 20 },
  { texto: "Preguntar la hora teniendo el celular en la mano", xp: 20 },
  { texto: "Decir 'interesante...' despues de observar algo random", xp: 20 },
  { texto: "Simular que estas en una entrevista importante mientras caminas", xp: 20 },
  { texto: "Hacer contacto visual con alguien y asentir como si compartieran un secreto", xp: 20 },
  { texto: "Entrar a un lugar, mirar todo, decir 'ok' y salir", xp: 20 },
  { texto: "Hablar en voz baja como narrador por 1 minuto en publico", xp: 20 }
];

const misionesDiarias = [
  { texto: "Pasar 1 hora sin redes sociales", xp: 30 },
  { texto: "Hablar con alguien que no conoces", xp: 30 },
  { texto: "Salir a caminar sin musica ni celular", xp: 30 },
  { texto: "Escribir una pagina completa de lo que pensas", xp: 30 },
  { texto: "Hacer algo incomodo que estes evitando", xp: 30 },
  { texto: "Levantarte temprano sin posponer la alarma", xp: 30 },
  { texto: "No usar el celular durante una comida", xp: 30 }
];

const MISSION_STORAGE_KEY = "nonpc-last-mission";
const DAILY_MISSION_STORAGE_KEY = "misionDiaria";

const missionElement = document.getElementById("mission");
const difficultyElement = document.getElementById("difficulty");
const missionXpElement = document.getElementById("missionXp");
const xpElement = document.getElementById("xp");
const levelElement = document.getElementById("level");
const progressTextElement = document.getElementById("progressText");
const progressBarElement = document.getElementById("progressBar");
const xpToastElement = document.getElementById("xpToast");
const historyListElement = document.getElementById("historyList");
const historyEmptyElement = document.getElementById("historyEmpty");
const historyCountElement = document.getElementById("historyCount");
const dailyMissionTextElement = document.getElementById("dailyMissionText");
const dailyMissionXpElement = document.getElementById("dailyMissionXp");
const dailyMissionStatusElement = document.getElementById("dailyMissionStatus");
const completeDailyMissionBtn = document.getElementById("completeDailyMissionBtn");
const newMissionBtn = document.getElementById("newMissionBtn");
const chaosMissionBtn = document.getElementById("chaosMissionBtn");
const completeMissionBtn = document.getElementById("completeMissionBtn");

const todasLasMisiones = [
  ...faciles.map((mision) => ({ ...mision, dificultad: "Facil" })),
  ...medias.map((mision) => ({ ...mision, dificultad: "Media" })),
  ...hardcore.map((mision) => ({ ...mision, dificultad: "Hardcore" }))
];
const misionesHardcore = hardcore.map((mision) => ({ ...mision, dificultad: "Hardcore" }));

let profile = null;
let currentMission = loadSavedMission();
let currentDailyMission = null;
let audioContext = null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => null);
  });
}

function getTodayKey() {
  return new Date().toDateString();
}

function loadSavedMission() {
  try {
    const stored = JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY));
    return stored && typeof stored.texto === "string" ? stored : null;
  } catch (error) {
    return null;
  }
}

function saveMission() {
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(currentMission));
}

function getDifficultyClass(dificultad) {
  const normalized = dificultad.toLowerCase();
  if (normalized === "facil") {
    return "difficulty-easy";
  }
  if (normalized === "media") {
    return "difficulty-medium";
  }
  return "difficulty-hardcore";
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function obtenerMisionRandom() {
  return pickRandom(todasLasMisiones);
}

function obtenerMisionHardcore() {
  return pickRandom(misionesHardcore);
}

function obtenerMisionUnica(selector) {
  let mission = null;
  do {
    mission = selector();
  } while (mission.texto === currentMission?.texto);
  return mission;
}

function obtenerMisionDiaria() {
  const todayKey = getTodayKey();
  try {
    const stored = JSON.parse(localStorage.getItem(DAILY_MISSION_STORAGE_KEY));
    if (stored?.fecha === todayKey) {
      return stored.mision;
    }
  } catch (error) {
    null;
  }

  const mission = pickRandom(misionesDiarias);
  localStorage.setItem(DAILY_MISSION_STORAGE_KEY, JSON.stringify({
    fecha: todayKey,
    mision: mission
  }));
  return mission;
}

function setMission(mission, animationName = "fade") {
  currentMission = mission;
  missionElement.classList.remove("fade", "chaos");
  requestAnimationFrame(() => {
    missionElement.textContent = mission.texto;
    difficultyElement.textContent = mission.dificultad;
    difficultyElement.className = `difficulty-badge ${getDifficultyClass(mission.dificultad)}`;
    missionXpElement.textContent = `${mission.xp} XP`;
    missionElement.classList.add(animationName);
  });
  saveMission();
}

function renderProgress() {
  const xp = Number(profile?.xp) || 0;
  const level = levelFromXp(xp);
  const progress = xp % 100;
  xpElement.textContent = `XP: ${xp}`;
  levelElement.textContent = `Nivel: ${level}`;
  progressTextElement.textContent = `${progress} / 100 XP`;
  progressBarElement.style.width = `${progress}%`;
}

function renderDailyMission() {
  currentDailyMission = obtenerMisionDiaria();
  const alreadyCompleted = profile?.lastDailyMissionDate === getTodayKey();
  dailyMissionTextElement.textContent = currentDailyMission.texto;
  dailyMissionXpElement.textContent = `${currentDailyMission.xp} XP`;
  dailyMissionStatusElement.textContent = alreadyCompleted ? "Volve manana" : "Disponible hoy";
  completeDailyMissionBtn.disabled = alreadyCompleted;
  completeDailyMissionBtn.textContent = alreadyCompleted ? "Completada hoy" : "Completar diaria";
}

function renderHistory(items) {
  historyListElement.innerHTML = "";
  historyCountElement.textContent = `${items.length} completadas`;

  if (items.length === 0) {
    historyEmptyElement.classList.remove("is-hidden");
    return;
  }

  historyEmptyElement.classList.add("is-hidden");
  items.slice(0, 10).forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const left = document.createElement("div");
    const text = document.createElement("p");
    const meta = document.createElement("small");
    const xpTag = document.createElement("strong");

    text.textContent = item.texto;
    meta.textContent = `${item.dificultad} | ${new Date(item.completedAt).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })}`;
    xpTag.textContent = `+${item.xp} XP`;

    left.append(text, meta);
    li.append(left, xpTag);
    historyListElement.appendChild(li);
  });
}

function showXpToast(message) {
  xpToastElement.textContent = message;
  xpToastElement.classList.remove("show");
  requestAnimationFrame(() => {
    xpToastElement.classList.add("show");
  });
}

function playSuccessSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

async function refreshHistory() {
  const authState = getAuthState();
  if (!authState.user) {
    renderHistory([]);
    return;
  }

  const items = await fetchCurrentUserCompletedMissions(authState.user.uid);
  renderHistory(items);
}

async function handleCompleteMission() {
  const authState = getAuthState();
  if (!authState.user || !profile || !currentMission) {
    return;
  }

  await completeMissionAndAwardXp({
    user: { uid: authState.user.uid, username: profile.username },
    mission: currentMission
  });
  showXpToast(`+${currentMission.xp} XP`);
  playSuccessSound();
  await refreshHistory();
}

async function handleCompleteDailyMission() {
  const authState = getAuthState();
  if (!authState.user || !profile || !currentDailyMission || profile.lastDailyMissionDate === getTodayKey()) {
    return;
  }

  await completeDailyMissionInDb({
    user: { uid: authState.user.uid, username: profile.username },
    mission: currentDailyMission,
    todayKey: getTodayKey()
  });
  showXpToast(`+${currentDailyMission.xp} XP`);
  playSuccessSound();
  await refreshHistory();
}

async function bootstrapDashboard() {
  setLoadingVisibility(true);
  mountAuthSlot();
  const authState = await guardAuthPage();
  const penaltyCount = await processExpiredChallengesForUser({
    uid: authState.user.uid,
    username: authState.profile.username
  });

  listenUserProfile(authState.user.uid, (nextProfile) => {
    profile = nextProfile;
    renderProgress();
    renderDailyMission();
  });

  if (currentMission) {
    setMission(currentMission);
  } else {
    setMission(obtenerMisionUnica(obtenerMisionRandom));
  }

  if (penaltyCount > 0) {
    showXpToast(`No respondiste ${penaltyCount} desafio(s) a tiempo (-${penaltyCount * 20} XP)`);
  }

  await refreshHistory();
  setLoadingVisibility(false);

  newMissionBtn.addEventListener("click", () => setMission(obtenerMisionUnica(obtenerMisionRandom), "fade"));
  chaosMissionBtn.addEventListener("click", () => setMission(obtenerMisionUnica(obtenerMisionHardcore), "chaos"));
  completeMissionBtn.addEventListener("click", handleCompleteMission);
  completeDailyMissionBtn.addEventListener("click", handleCompleteDailyMission);
}

bootstrapDashboard().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
  showXpToast(error?.message || "No pudimos cargar tu dashboard.");
});
