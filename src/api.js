import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

const supabase = isConfigured ? createClient(url, anonKey) : null;

/*
  Two ways to get a session: `continueAsGuest` (anonymous — stable across
  reloads on this device via localStorage, but not across devices) or
  `signInWithGoogle` (a real identity, portable across devices). Either
  way, everything below just needs *a* session to already exist — it
  doesn't care which kind.
*/
async function currentUser() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Not signed in.");
  return data.session.user;
}

// Null means this browser has no session at all yet — caller should show
// the guest-or-sign-in choice rather than assuming anonymous.
export async function getExistingUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? data.session.user : null;
}

export async function continueAsGuest() {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

// Full-page redirect to Google and back — nothing to await here.
export function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  return supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

/*
  Turns the current anonymous session into a real one, keeping the same
  auth.uid() — so the profile, streak, and history already tied to that id
  carry over untouched. Requires "Allow manual linking" enabled in the
  Supabase dashboard (Authentication > Settings).
*/
export function linkGoogleAccount() {
  const redirectTo = window.location.origin + window.location.pathname;
  return supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } });
}

export async function getAccountInfo() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { isGuest: !!data.user.is_anonymous, email: data.user.email || null };
}

export async function signOut() {
  await supabase.auth.signOut();
}

function historyFromSubmissions(rows) {
  const history = {};
  for (const row of rows) {
    history[row.brief_date] = {
      briefId: row.brief_id,
      values: row.answers,
      seconds: row.seconds,
      backfilled: row.backfilled,
    };
  }
  return history;
}

function shapeProfile(row, history) {
  return {
    id: row.id,
    name: row.name,
    streak: row.streak,
    bestStreak: row.best_streak,
    lastDate: row.last_date,
    theme: row.theme,
    history,
  };
}

// Returns null when this visitor has never picked a name yet.
export async function loadProfile() {
  const user = await currentUser();

  const [{ data: profileRow, error: profileError }, { data: submissionRows, error: submissionError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("submissions")
        .select("brief_date, brief_id, answers, seconds, backfilled")
        .eq("user_id", user.id),
    ]);

  if (profileError) throw profileError;
  if (submissionError) throw submissionError;
  if (!profileRow) return null;

  return shapeProfile(profileRow, historyFromSubmissions(submissionRows || []));
}

export async function createProfile(name) {
  const user = await currentUser();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, name, streak: 0, best_streak: 0, theme: "light" })
    .select()
    .single();

  if (error) throw error;
  return shapeProfile(data, {});
}

export async function updateProfile(patch) {
  const user = await currentUser();
  const row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.streak !== undefined) row.streak = patch.streak;
  if (patch.bestStreak !== undefined) row.best_streak = patch.bestStreak;
  if (patch.lastDate !== undefined) row.last_date = patch.lastDate;
  if (patch.theme !== undefined) row.theme = patch.theme;

  const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
  if (error) throw error;
}

/*
  Reaction counts are aggregated here rather than in the database so the
  room stays a single round trip per day. `mine` drives the toggled-on
  state of each reaction button.
*/
export async function loadFeed(dateStr) {
  const user = await currentUser();

  const { data: submissionRows, error: submissionError } = await supabase
    .from("submissions")
    .select("id, user_id, name, answers, seconds, created_at")
    .eq("brief_date", dateStr)
    .order("created_at", { ascending: true });

  if (submissionError) throw submissionError;
  if (!submissionRows || submissionRows.length === 0) return [];

  const { data: reactionRows, error: reactionError } = await supabase
    .from("reactions")
    .select("submission_id, user_id, tag")
    .in(
      "submission_id",
      submissionRows.map((r) => r.id)
    );

  if (reactionError) throw reactionError;

  const counts = {};
  const mine = {};
  for (const r of reactionRows || []) {
    counts[r.submission_id] = counts[r.submission_id] || {};
    counts[r.submission_id][r.tag] = (counts[r.submission_id][r.tag] || 0) + 1;
    if (r.user_id === user.id) {
      mine[r.submission_id] = mine[r.submission_id] || {};
      mine[r.submission_id][r.tag] = true;
    }
  }

  return submissionRows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    values: row.answers,
    seconds: row.seconds,
    reactions: counts[row.id] || {},
    mine: mine[row.id] || {},
  }));
}

export async function submitEntry({ name, dateStr, briefId, values, seconds, backfilled }) {
  const user = await currentUser();
  const { error } = await supabase.from("submissions").upsert(
    {
      user_id: user.id,
      name,
      brief_date: dateStr,
      brief_id: briefId,
      answers: values,
      seconds,
      backfilled,
    },
    { onConflict: "user_id,brief_date" }
  );

  if (error) throw error;
}

// Returns the new on/off state so the caller can update its own count.
export async function toggleReaction(submissionId, tag, isOn) {
  const user = await currentUser();

  if (isOn) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .match({ submission_id: submissionId, user_id: user.id, tag });
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("reactions")
    .insert({ submission_id: submissionId, user_id: user.id, tag });
  if (error) throw error;
  return true;
}

export async function sendFeedback({ type, text }) {
  const user = await currentUser();
  const { error } = await supabase.from("feedback").insert({ user_id: user.id, type, text });
  if (error) throw error;
}
