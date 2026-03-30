import {
  arrayUnion,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "./firebase-client.js";

const USERS = "users";
const MISSION_IDEAS = "mission_ideas";
const MISSIONS = "missions";
const CHALLENGES = "challenges";
const ACTIVITIES = "activities";
const COMPLETED_MISSIONS = "completed_missions";
const ACTIVE_MISSIONS = "active_missions";
const DAILY_PENALTY_XP = 20;
const RECEIVE_VALIDATION_XP = 10;

export function levelFromXp(xp) {
  return Math.floor((Number(xp) || 0) / 100) + 1;
}

async function mutateUser(uid, mutator) {
  const userRef = doc(db, USERS, uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) {
      throw new Error("El perfil del usuario no existe.");
    }

    const current = snapshot.data();
    const next = mutator({ id: uid, ...current }) || { ...current };
    const xp = Math.max(0, Number(next.xp) || 0);

    transaction.set(userRef, {
      ...next,
      xp,
      level: levelFromXp(xp)
    }, { merge: true });

    return { ...next, xp, level: levelFromXp(xp) };
  });
}

export async function addXpToUser(uid, amount) {
  return mutateUser(uid, (profile) => ({
    ...profile,
    xp: Math.max(0, (Number(profile.xp) || 0) + amount)
  }));
}

export async function setDailyStreak(uid, todayKey) {
  return mutateUser(uid, (profile) => {
    const previous = profile.lastDailyMissionDate ? new Date(profile.lastDailyMissionDate) : null;
    let streak = profile.streak || 0;

    if (profile.lastDailyMissionDate === todayKey) {
      return profile;
    }

    if (!previous) {
      streak = 1;
    } else {
      const currentDate = new Date(todayKey);
      const diffDays = (currentDate.setHours(0, 0, 0, 0) - previous.setHours(0, 0, 0, 0)) / 86400000;
      streak = diffDays === 1 ? streak + 1 : 1;
    }

    return {
      ...profile,
      streak,
      lastDailyMissionDate: todayKey
    };
  });
}

export async function saveMissionCompletion({ user, mission, sourceType = "standard", completedAt = new Date().toISOString() }) {
  const completionRef = doc(collection(db, COMPLETED_MISSIONS));
  const payload = {
    id: completionRef.id,
    texto: mission.texto,
    dificultad: mission.dificultad || "Media",
    xp: Number(mission.xp) || 0,
    sourceType,
    completedByUserId: user.uid,
    completedByUsername: user.username,
    completedAt,
    validations: [],
    comments: [],
    bonusGranted: false
  };

  await setDoc(completionRef, payload);
  return payload;
}

export async function logActivity(activity) {
  const activityRef = doc(collection(db, ACTIVITIES));
  await setDoc(activityRef, {
    id: activityRef.id,
    createdAt: new Date().toISOString(),
    ...activity
  });
}

export async function completeMissionAndAwardXp({ user, mission, sourceType = "standard" }) {
  const completion = await saveMissionCompletion({ user, mission, sourceType });
  const profile = await addXpToUser(user.uid, Number(mission.xp) || 0);
  await logActivity({
    type: "mission_completed",
    userId: user.uid,
    username: user.username,
    targetUserId: null,
    targetUsername: null,
    missionId: completion.id,
    missionDifficulty: completion.dificultad
  });

  return { completion, profile };
}

export async function completeDailyMission({ user, mission, todayKey }) {
  const result = await completeMissionAndAwardXp({ user, mission: { ...mission, dificultad: "Diaria" }, sourceType: "daily" });
  const profile = await setDailyStreak(user.uid, todayKey);
  await logActivity({
    type: "streak_reached",
    userId: user.uid,
    username: user.username,
    targetUserId: null,
    targetUsername: null,
    missionId: null,
    streakCount: profile.streak
  });

  return { ...result, profile };
}

export function listenUserProfile(uid, callback) {
  return onSnapshot(doc(db, USERS, uid), (snapshot) => {
    callback(snapshot.exists() ? { id: uid, ...snapshot.data() } : null);
  });
}

export function listenLeaderboard(callback) {
  return onSnapshot(query(collection(db, USERS), orderBy("xp", "desc"), limit(50)), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export function listenActivities(callback) {
  return onSnapshot(query(collection(db, ACTIVITIES), orderBy("createdAt", "desc"), limit(50)), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export function listenMissionIdeas(callback) {
  return onSnapshot(query(collection(db, MISSION_IDEAS), orderBy("votes", "desc"), limit(50)), (snapshot) => {
    const ideas = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    ideas.sort((a, b) => {
      if ((b.votes || 0) !== (a.votes || 0)) {
        return (b.votes || 0) - (a.votes || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    callback(ideas);
  });
}

export async function createMissionIdea({ user, title, description }) {
  const ideaRef = doc(collection(db, MISSION_IDEAS));
  await setDoc(ideaRef, {
    id: ideaRef.id,
    title,
    description,
    createdByUserId: user.uid,
    createdByUsername: user.username,
    votes: 0,
    votedBy: [],
    comments: [],
    approved: false,
    createdAt: new Date().toISOString()
  });
}

export async function upvoteMissionIdea(ideaId, user) {
  const ideaRef = doc(db, MISSION_IDEAS, ideaId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ideaRef);
    if (!snapshot.exists()) {
      throw new Error("La idea no existe.");
    }

    const idea = snapshot.data();
    const votedBy = Array.isArray(idea.votedBy) ? idea.votedBy : [];
    if (votedBy.includes(user.uid)) {
      throw new Error("Ya votaste esta idea.");
    }

    transaction.update(ideaRef, {
      votes: (Number(idea.votes) || 0) + 1,
      votedBy: [...votedBy, user.uid]
    });
  });
}

export async function addIdeaComment(ideaId, user, text) {
  const ideaRef = doc(db, MISSION_IDEAS, ideaId);
  await updateDoc(ideaRef, {
    comments: arrayUnion({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdByUserId: user.uid,
      createdByUsername: user.username,
      text,
      createdAt: new Date().toISOString()
    })
  });
}

export async function approveMissionIdea(ideaId) {
  const ideaRef = doc(db, MISSION_IDEAS, ideaId);
  const missionsRef = collection(db, MISSIONS);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ideaRef);
    if (!snapshot.exists()) {
      throw new Error("La idea no existe.");
    }

    const idea = snapshot.data();
    if (idea.approved) {
      throw new Error("La idea ya fue aprobada.");
    }

    const missionRef = doc(missionsRef, ideaId);
    transaction.set(missionRef, {
      id: missionRef.id,
      title: idea.title,
      description: idea.description,
      difficulty: "medium",
      xpReward: 50,
      createdByUserId: idea.createdByUserId,
      createdByUsername: idea.createdByUsername,
      createdAt: new Date().toISOString(),
      sourceIdeaId: idea.id
    });
    transaction.update(ideaRef, { approved: true });
  });
}

export function listenApprovedMissions(callback) {
  return onSnapshot(query(collection(db, MISSIONS), orderBy("createdAt", "desc"), limit(100)), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export async function sendChallenge({ fromUser, toUser, mission }) {
  const challengeRef = doc(collection(db, CHALLENGES));
  await setDoc(challengeRef, {
    id: challengeRef.id,
    fromUserId: fromUser.uid,
    fromUsername: fromUser.username,
    toUserId: toUser.uid,
    toUsername: toUser.username,
    missionId: mission.id,
    missionTitle: mission.title,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    penaltyApplied: false
  });

  await logActivity({
    type: "challenge_sent",
    userId: fromUser.uid,
    username: fromUser.username,
    targetUserId: toUser.uid,
    targetUsername: toUser.username,
    missionId: mission.id
  });
}

export async function processExpiredChallengesForUser(user) {
  const snapshot = await getDocs(query(collection(db, CHALLENGES), where("toUserId", "==", user.uid)));
  const expired = snapshot.docs
    .map((item) => ({ ref: item.ref, ...item.data() }))
    .filter((challenge) => challenge.status === "pending" && !challenge.penaltyApplied && new Date(challenge.expiresAt).getTime() < Date.now());

  if (expired.length === 0) {
    return 0;
  }

  await mutateUser(user.uid, (profile) => ({
    ...profile,
    xp: Math.max(0, (Number(profile.xp) || 0) - expired.length * DAILY_PENALTY_XP)
  }));

  const batch = writeBatch(db);
  expired.forEach((challenge) => {
    batch.update(challenge.ref, {
      status: "failed",
      penaltyApplied: true,
      expiredAt: new Date().toISOString()
    });
  });
  await batch.commit();
  return expired.length;
}

export function listenIncomingChallenges(userId, callback) {
  return onSnapshot(query(collection(db, CHALLENGES), where("toUserId", "==", userId)), (snapshot) => {
    const items = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(items);
  });
}

export function listenActiveMissions(userId, callback) {
  return onSnapshot(query(collection(db, ACTIVE_MISSIONS), where("userId", "==", userId)), (snapshot) => {
    const items = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    callback(items);
  });
}

export async function acceptChallenge(challenge, user) {
  const batch = writeBatch(db);
  batch.update(doc(db, CHALLENGES, challenge.id), {
    status: "accepted",
    updatedAt: new Date().toISOString()
  });
  batch.set(doc(collection(db, ACTIVE_MISSIONS)), {
    challengeId: challenge.id,
    missionId: challenge.missionId,
    missionTitle: challenge.missionTitle,
    fromUserId: challenge.fromUserId,
    fromUsername: challenge.fromUsername,
    userId: user.uid,
    username: user.username,
    addedAt: new Date().toISOString(),
    status: "active"
  });
  await batch.commit();
}

export async function rejectChallenge(challengeId) {
  await updateDoc(doc(db, CHALLENGES, challengeId), {
    status: "failed",
    updatedAt: new Date().toISOString()
  });
}

export function listenCompletedMissions(callback) {
  return onSnapshot(query(collection(db, COMPLETED_MISSIONS), orderBy("completedAt", "desc"), limit(100)), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export async function validateCompletedMission(missionId, user) {
  const missionRef = doc(db, COMPLETED_MISSIONS, missionId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(missionRef);
    if (!snapshot.exists()) {
      throw new Error("La mision no existe.");
    }

    const mission = snapshot.data();
    const validations = Array.isArray(mission.validations) ? mission.validations : [];
    if (mission.completedByUserId === user.uid) {
      throw new Error("No puedes validar tu propia mision.");
    }
    if (validations.some((item) => item.userId === user.uid)) {
      throw new Error("Ya validaste esta mision.");
    }

    const nextValidations = [...validations, { userId: user.uid, username: user.username }];
    transaction.update(missionRef, { validations: nextValidations });

    const ownerRef = doc(db, USERS, mission.completedByUserId);
    const validatorRef = doc(db, USERS, user.uid);
    const validatorSnapshot = await transaction.get(validatorRef);
    const ownerSnapshot = await transaction.get(ownerRef);

    if (!validatorSnapshot.exists() || !ownerSnapshot.exists()) {
      throw new Error("Perfil faltante.");
    }

    const validator = validatorSnapshot.data();
    transaction.set(validatorRef, {
      xp: (Number(validator.xp) || 0) + 5,
      level: levelFromXp((Number(validator.xp) || 0) + 5)
    }, { merge: true });

    if (nextValidations.length >= 2 && !mission.bonusGranted) {
      const owner = ownerSnapshot.data();
      transaction.set(ownerRef, {
        xp: (Number(owner.xp) || 0) + RECEIVE_VALIDATION_XP,
        level: levelFromXp((Number(owner.xp) || 0) + RECEIVE_VALIDATION_XP)
      }, { merge: true });
      transaction.update(missionRef, { bonusGranted: true });
    }
  });
}

export async function commentCompletedMission(missionId, user, text) {
  await updateDoc(doc(db, COMPLETED_MISSIONS, missionId), {
    comments: arrayUnion({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: user.uid,
      username: user.username,
      text,
      createdAt: new Date().toISOString()
    })
  });

  await addXpToUser(user.uid, 2);
}

export async function fetchCommunityUsers() {
  const snapshot = await getDocs(query(collection(db, USERS), orderBy("username", "asc"), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((user) => user.username);
}

export async function fetchCurrentUserCompletedMissions(userId) {
  const snapshot = await getDocs(query(collection(db, COMPLETED_MISSIONS), where("completedByUserId", "==", userId)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}
