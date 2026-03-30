import { guardAuthPage } from "../js/auth.js";
import {
  addIdeaComment,
  approveMissionIdea,
  commentCompletedMission,
  createMissionIdea,
  fetchCommunityUsers,
  listenApprovedMissions,
  listenCompletedMissions,
  listenMissionIdeas,
  sendChallenge,
  upvoteMissionIdea,
  validateCompletedMission
} from "../js/data.js";
import { mountAuthSlot, setLoadingVisibility } from "../js/shell.js";

const ideaForm = document.getElementById("ideaForm");
const usernameInput = document.getElementById("usernameInput");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const formStatus = document.getElementById("formStatus");
const ideasList = document.getElementById("ideasList");
const ideasEmpty = document.getElementById("ideasEmpty");
const ideasCount = document.getElementById("ideasCount");
const profilesList = document.getElementById("profilesList");
const profilesEmpty = document.getElementById("profilesEmpty");
const profilesCount = document.getElementById("profilesCount");
const completedMissionsList = document.getElementById("completedMissionsList");
const completedMissionsEmpty = document.getElementById("completedMissionsEmpty");
const completedMissionsCount = document.getElementById("completedMissionsCount");

let currentUser = null;
let currentIdeas = [];
let currentMissions = [];
let communityUsers = [];

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
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
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

function createCommentItem(comment) {
  const wrapper = document.createElement("article");
  wrapper.className = "comment-item";

  const meta = document.createElement("div");
  meta.className = "comment-meta";
  meta.textContent = `${comment.createdByUsername || comment.username} - ${formatDate(comment.createdAt)}`;

  const text = document.createElement("p");
  text.textContent = comment.text;

  wrapper.append(meta, text);
  return wrapper;
}

function createIdeaCommentForm(idea) {
  const form = document.createElement("form");
  form.className = "comment-form";

  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.maxLength = 140;
  input.placeholder = "Deja un comentario corto";
  input.required = true;

  const button = document.createElement("button");
  button.className = "btn btn-ghost btn-small";
  button.type = "submit";
  button.textContent = "Comentar";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }

    try {
      await addIdeaComment(idea.id, currentUser, text);
      input.value = "";
      showToast("+2 XP por comentar");
    } catch (error) {
      formStatus.textContent = error?.message || "No pudimos guardar el comentario.";
    }
  });

  form.append(input, button);
  return form;
}

function createIdeaCard(idea) {
  const card = document.createElement("article");
  card.className = "idea-card";

  const top = document.createElement("div");
  top.className = "idea-top";

  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = idea.title;
  const meta = document.createElement("div");
  meta.className = "idea-meta";
  meta.textContent = `por ${idea.createdByUsername} - ${formatDate(idea.createdAt)}`;
  copy.append(title, meta);

  const badges = document.createElement("div");
  badges.className = "idea-badges";
  const voteBadge = document.createElement("div");
  voteBadge.className = "vote-pill";
  voteBadge.textContent = `${idea.votes || 0} votos`;
  badges.appendChild(voteBadge);

  if (idea.approved) {
    const approvedBadge = document.createElement("div");
    approvedBadge.className = "badge badge-success";
    approvedBadge.textContent = "Aprobada";
    badges.appendChild(approvedBadge);
  }

  top.append(copy, badges);

  const description = document.createElement("p");
  description.className = "idea-description";
  description.textContent = idea.description;

  const actions = document.createElement("div");
  actions.className = "idea-actions";

  const voteButton = document.createElement("button");
  voteButton.className = "btn btn-primary btn-small";
  voteButton.type = "button";
  voteButton.textContent = (idea.votedBy || []).includes(currentUser.uid) ? "Ya votaste" : "Upvote";
  voteButton.disabled = (idea.votedBy || []).includes(currentUser.uid);
  voteButton.addEventListener("click", async () => {
    try {
      await upvoteMissionIdea(idea.id, currentUser);
    } catch (error) {
      formStatus.textContent = error?.message || "No pudimos registrar tu voto.";
    }
  });

  const approveButton = document.createElement("button");
  approveButton.className = "btn btn-ghost btn-small";
  approveButton.type = "button";
  approveButton.textContent = idea.approved ? "Ya aprobada" : "Aprobar";
  approveButton.disabled = idea.approved;
  approveButton.addEventListener("click", async () => {
    try {
      await approveMissionIdea(idea.id);
      showToast("Idea aprobada.");
    } catch (error) {
      formStatus.textContent = error?.message || "No pudimos aprobar la idea.";
    }
  });

  actions.append(voteButton, approveButton);

  const commentsBlock = document.createElement("section");
  commentsBlock.className = "comments-block";
  const commentsTitle = document.createElement("div");
  commentsTitle.className = "comment-meta";
  commentsTitle.textContent = `Comentarios (${(idea.comments || []).length})`;

  const commentsList = document.createElement("div");
  commentsList.className = "comments-list";
  if (!idea.comments?.length) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "Todavia no hay comentarios.";
    commentsList.appendChild(empty);
  } else {
    idea.comments.forEach((comment) => commentsList.appendChild(createCommentItem(comment)));
  }

  commentsBlock.append(commentsTitle, commentsList, createIdeaCommentForm(idea));
  card.append(top, description, actions, commentsBlock);
  return card;
}

function getMissionCatalog() {
  const fromIdeas = currentIdeas.slice(0, 12).map((idea) => ({
    id: `idea-${idea.id}`,
    title: idea.title
  }));
  const merged = [...currentMissions, ...fromIdeas];
  const unique = [];
  const seen = new Set();

  merged.forEach((mission) => {
    if (!mission?.id || seen.has(mission.id)) {
      return;
    }
    seen.add(mission.id);
    unique.push(mission);
  });

  return unique;
}

function createProfileCard(user) {
  const card = document.createElement("article");
  card.className = "idea-card";

  const title = document.createElement("h3");
  title.textContent = user.username;

  const meta = document.createElement("div");
  meta.className = "idea-meta";
  meta.textContent = "Perfil de la comunidad";

  const missionSelect = document.createElement("select");
  missionSelect.className = "input";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Elegi una mision";
  missionSelect.appendChild(placeholder);

  getMissionCatalog().forEach((mission) => {
    const option = document.createElement("option");
    option.value = mission.id;
    option.textContent = mission.title;
    missionSelect.appendChild(option);
  });

  const actionButton = document.createElement("button");
  actionButton.className = "btn btn-primary btn-small";
  actionButton.type = "button";
  actionButton.textContent = "Desafiar";
  actionButton.addEventListener("click", async () => {
    const mission = getMissionCatalog().find((item) => item.id === missionSelect.value);
    if (!mission) {
      formStatus.textContent = `Elige una mision antes de desafiar a ${user.username}.`;
      return;
    }

    try {
      await sendChallenge({
        fromUser: currentUser,
        toUser: { uid: user.id, username: user.username },
        mission
      });
      missionSelect.value = "";
      formStatus.textContent = `Desafio enviado a ${user.username}.`;
    } catch (error) {
      formStatus.textContent = error?.message || "No pudimos enviar el desafio.";
    }
  });

  card.append(title, meta, missionSelect, actionButton);
  return card;
}

function renderProfiles() {
  const users = communityUsers.filter((user) => user.id !== currentUser.uid);
  profilesList.innerHTML = "";
  profilesCount.textContent = `${users.length} usuarios`;

  if (users.length === 0) {
    profilesEmpty.classList.remove("is-hidden");
    return;
  }

  profilesEmpty.classList.add("is-hidden");
  users.forEach((user) => profilesList.appendChild(createProfileCard(user)));
}

function createCompletedMissionCard(mission) {
  const card = document.createElement("article");
  card.className = "idea-card";

  const top = document.createElement("div");
  top.className = "idea-top";

  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = mission.texto;
  const meta = document.createElement("div");
  meta.className = "idea-meta";
  meta.textContent = `por ${mission.completedByUsername} - ${formatDate(mission.completedAt)} - ${mission.dificultad}`;
  copy.append(title, meta);

  const badges = document.createElement("div");
  badges.className = "idea-badges";

  const validationsBadge = document.createElement("div");
  validationsBadge.className = "vote-pill";
  validationsBadge.textContent = `${(mission.validations || []).length} validaciones`;
  badges.appendChild(validationsBadge);

  const commentsBadge = document.createElement("div");
  commentsBadge.className = "vote-pill";
  commentsBadge.textContent = `${(mission.comments || []).length} comentarios`;
  badges.appendChild(commentsBadge);

  if (mission.bonusGranted) {
    const bonusBadge = document.createElement("div");
    bonusBadge.className = "badge badge-success";
    bonusBadge.textContent = "Bonus +10 XP";
    badges.appendChild(bonusBadge);
  }

  top.append(copy, badges);

  const actions = document.createElement("div");
  actions.className = "idea-actions";
  const validateButton = document.createElement("button");
  validateButton.className = "btn btn-primary btn-small";
  validateButton.type = "button";

  const alreadyValidated = (mission.validations || []).some((item) => item.userId === currentUser.uid);
  if (mission.completedByUserId === currentUser.uid) {
    validateButton.disabled = true;
    validateButton.textContent = "Tuya";
  } else if (alreadyValidated) {
    validateButton.disabled = true;
    validateButton.textContent = "Ya validaste";
  } else {
    validateButton.textContent = "Validar";
  }

  validateButton.addEventListener("click", async () => {
    try {
      await validateCompletedMission(mission.id, currentUser);
      showToast("+5 XP por validar");
    } catch (error) {
      formStatus.textContent = error?.message || "No pudimos validar la mision.";
    }
  });
  actions.appendChild(validateButton);

  const commentsBlock = document.createElement("section");
  commentsBlock.className = "comments-block";
  const commentsTitle = document.createElement("div");
  commentsTitle.className = "comment-meta";
  commentsTitle.textContent = `Comentarios (${(mission.comments || []).length})`;
  const commentsList = document.createElement("div");
  commentsList.className = "comments-list";
  if (!mission.comments?.length) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "Todavia no hay comentarios.";
    commentsList.appendChild(empty);
  } else {
    mission.comments.forEach((comment) => commentsList.appendChild(createCommentItem(comment)));
  }

  const commentForm = document.createElement("form");
  commentForm.className = "comment-form";
  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.maxLength = 140;
  input.placeholder = "Comenta esta mision completada";
  input.required = true;
  const button = document.createElement("button");
  button.className = "btn btn-ghost btn-small";
  button.type = "submit";
  button.textContent = "Comentar";
  commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }

    try {
      await commentCompletedMission(mission.id, currentUser, text);
      input.value = "";
      showToast("+2 XP por comentar");
    } catch (error) {
      formStatus.textContent = error?.message || "No pudimos guardar tu comentario.";
    }
  });
  commentForm.append(input, button);

  commentsBlock.append(commentsTitle, commentsList, commentForm);
  card.append(top, actions, commentsBlock);
  return card;
}

function renderCompletedMissions(items) {
  completedMissionsList.innerHTML = "";
  completedMissionsCount.textContent = `${items.length} completadas`;

  if (items.length === 0) {
    completedMissionsEmpty.classList.remove("is-hidden");
    return;
  }

  completedMissionsEmpty.classList.add("is-hidden");
  items.forEach((mission) => completedMissionsList.appendChild(createCompletedMissionCard(mission)));
}

function renderIdeas(items) {
  currentIdeas = items;
  ideasList.innerHTML = "";
  ideasCount.textContent = `${items.length} ideas`;

  if (items.length === 0) {
    ideasEmpty.classList.remove("is-hidden");
  } else {
    ideasEmpty.classList.add("is-hidden");
    items.forEach((idea) => ideasList.appendChild(createIdeaCard(idea)));
  }

  renderProfiles();
}

async function handleIdeaSubmit(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title || !description) {
    formStatus.textContent = "Completa titulo y descripcion antes de enviar.";
    return;
  }

  try {
    await createMissionIdea({
      user: currentUser,
      title,
      description
    });
    titleInput.value = "";
    descriptionInput.value = "";
    formStatus.textContent = "Idea enviada. Ya esta compitiendo por votos.";
  } catch (error) {
    formStatus.textContent = error?.message || "No pudimos publicar tu idea.";
  }
}

async function bootstrapCommunity() {
  setLoadingVisibility(true);
  mountAuthSlot();
  const authState = await guardAuthPage();
  currentUser = { uid: authState.user.uid, username: authState.profile.username };
  usernameInput.value = currentUser.username;
  usernameInput.disabled = true;
  ensureToast();

  communityUsers = await fetchCommunityUsers();
  renderProfiles();

  listenApprovedMissions((missions) => {
    currentMissions = missions;
    renderProfiles();
  });
  listenMissionIdeas(renderIdeas);
  listenCompletedMissions(renderCompletedMissions);
  ideaForm.addEventListener("submit", handleIdeaSubmit);
  setLoadingVisibility(false);
}

bootstrapCommunity().catch((error) => {
  setLoadingVisibility(false);
  console.error(error);
  formStatus.textContent = error?.message || "No pudimos cargar la comunidad.";
});
