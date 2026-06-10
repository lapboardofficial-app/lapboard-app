import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  : null;

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function isFetchFailure(error) {
  return /failed to fetch|load failed|networkerror|network request failed/i.test(error?.message || "");
}

function normalizeSupabaseError(error, action) {
  if (!error) return null;
  if (isFetchFailure(error)) {
    return new Error(`Could not reach Supabase while ${action}. Check VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and that your Supabase project is active. If this fails in every browser, it is probably Vercel/Supabase config rather than a browser setting.`);
  }

  return error;
}

async function runSupabaseRequest(action, request) {
  try {
    return await request();
  } catch (error) {
    throw normalizeSupabaseError(error, action);
  }
}

export async function testSupabaseConnection() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      detail: "Supabase URL or anon key is missing from this deployment."
    };
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    const text = await response.text().catch(() => "");
    return {
      ok: response.ok,
      detail: `Supabase health returned HTTP ${response.status}${text ? `: ${text.slice(0, 140)}` : ""}`
    };
  } catch (error) {
    return {
      ok: false,
      detail: normalizeSupabaseError(error, "testing the Supabase connection")?.message || "Could not test Supabase."
    };
  }
}

export function profileToAccount(profile, fallbackEmail = "") {
  const username = profile?.username || fallbackEmail?.split("@")[0] || "Driver";
  return {
    username,
    city: profile?.city || "",
    bio: profile?.bio || "Karting profile",
    friends: [],
    avatar: profile?.avatar_url || "",
    passwordHash: "supabase",
    passwordSalt: "supabase",
    homeTrackId: profile?.home_track_id || "",
    kartExperience: profile?.kart_experience || "casual",
    onboardingComplete: Boolean(profile?.onboarding_complete)
  };
}

function lapToRow(lap, userId) {
  return {
    id: String(lap.id),
    user_id: userId,
    player: lap.player,
    track_id: lap.trackId,
    layout: lap.layout || "Main layout",
    kart: lap.kart || "",
    ms: Math.round(Number(lap.ms)),
    lap_date: lap.date || new Date().toISOString().slice(0, 10),
    lap_number: Number(lap.lapNumber) || null,
    visibility: lap.visibility === "private" ? "private" : "public"
  };
}

function rowToLap(row) {
  return {
    id: row.id,
    player: row.player,
    trackId: row.track_id,
    layout: row.layout || "Main layout",
    kart: row.kart || "",
    ms: row.ms,
    date: row.lap_date,
    lapNumber: row.lap_number || undefined,
    visibility: row.visibility || "public"
  };
}

function mediaToRow(entry, userId) {
  return {
    id: String(entry.id),
    user_id: userId,
    owner: entry.owner,
    title: entry.title,
    url: entry.url,
    type: "link",
    created_at: entry.createdAt || new Date().toISOString()
  };
}

function rowToMedia(row) {
  return {
    id: row.id,
    owner: row.owner,
    title: row.title,
    url: row.url,
    type: row.type || "link",
    createdAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  };
}

function membershipToRow(membership, userId) {
  return {
    id: String(membership.id),
    user_id: userId,
    player: membership.player,
    league_id: membership.leagueId,
    track_id: membership.trackId,
    joined_at: membership.joinedAt || new Date().toISOString().slice(0, 10)
  };
}

function rowToMembership(row) {
  return {
    id: row.id,
    player: row.player,
    leagueId: row.league_id,
    trackId: row.track_id,
    joinedAt: row.joined_at
  };
}

function rowToTeam(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    owner: row.owner,
    members: Array.isArray(row.team_members)
      ? row.team_members.map((member) => member.player).filter(Boolean)
      : [],
    createdAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  };
}

export async function getCurrentSupabaseSession() {
  if (!supabase) return null;
  const { data, error } = await runSupabaseRequest("checking your Supabase session", () => supabase.auth.getSession());
  if (error) throw normalizeSupabaseError(error, "checking your Supabase session");
  return data.session;
}

export async function signInOrSignUpWithSupabase({ email, password, username }) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;

  const signIn = await runSupabaseRequest("signing in", () => client.auth.signInWithPassword({
    email: normalizedEmail,
    password
  }));

  if (!signIn.error) {
    return { session: signIn.data.session, user: signIn.data.user, created: false };
  }

  const signUp = await runSupabaseRequest("creating your account", () => client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        username: username.trim()
      }
    }
  }));

  if (signUp.error) throw normalizeSupabaseError(signUp.error, "creating your account");
  return { session: signUp.data.session, user: signUp.data.user, created: true };
}

export async function signInWithSupabase({ email, password }) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await runSupabaseRequest("signing in", () => client.auth.signInWithPassword({
    email: normalizedEmail,
    password
  }));

  if (error) throw normalizeSupabaseError(error, "signing in");
  return { session: data.session, user: data.user, created: false };
}

export async function signUpWithSupabase({ email, password, username }) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { data, error } = await runSupabaseRequest("creating your account", () => client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        username: username.trim()
      }
    }
  }));

  if (error) throw normalizeSupabaseError(error, "creating your account");
  return { session: data.session, user: data.user, created: true };
}

export async function resendSupabaseConfirmation(email) {
  const client = requireSupabase();
  const normalizedEmail = email.trim().toLowerCase();
  const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await runSupabaseRequest("resending the verification email", () => client.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: {
      emailRedirectTo
    }
  }));

  if (error) throw normalizeSupabaseError(error, "resending the verification email");
}

export async function signOutSupabase() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertProfile(user, accountPatch = {}) {
  const client = requireSupabase();
  const username = accountPatch.username || user.user_metadata?.username || user.email?.split("@")[0] || "Driver";
  const row = {
    user_id: user.id,
    username,
    city: accountPatch.city || "",
    bio: accountPatch.bio || "Karting profile",
    avatar_url: accountPatch.avatar || "",
    home_track_id: accountPatch.homeTrackId || "",
    kart_experience: accountPatch.kartExperience || "casual",
    onboarding_complete: Boolean(accountPatch.onboardingComplete)
  };

  const { data, error } = await client
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function loadSupabaseBootstrap() {
  const client = requireSupabase();
  const [laps, media, teams, memberships] = await runSupabaseRequest("loading shared data", () => Promise.all([
    client.from("laps").select("*").order("lap_date", { ascending: false }),
    client.from("media_entries").select("*").order("created_at", { ascending: false }),
    client.from("teams").select("*, team_members(player)").order("name", { ascending: true }),
    client.from("league_memberships").select("*").order("joined_at", { ascending: false })
  ]));

  const firstError = [laps, media, teams, memberships].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return {
    laps: (laps.data || []).map(rowToLap),
    media: (media.data || []).map(rowToMedia),
    teams: (teams.data || []).map(rowToTeam),
    leagueMemberships: (memberships.data || []).map(rowToMembership)
  };
}

export async function publishSupabaseLaps(laps, userId) {
  const client = requireSupabase();
  const rows = laps.map((lap) => lapToRow(lap, userId));
  if (!rows.length) return [];

  const savedRows = [];
  const chunkSize = 200;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { data, error } = await client
      .from("laps")
      .upsert(chunk, { onConflict: "id" })
      .select();

    if (error) throw error;
    savedRows.push(...(data || []));
  }

  return savedRows.map(rowToLap);
}

export async function deleteSupabaseLap(lapId, userId) {
  const client = requireSupabase();
  const { error } = await client
    .from("laps")
    .delete()
    .eq("id", String(lapId))
    .eq("user_id", userId);
  if (error) throw error;
}

export async function publishSupabaseMedia(entry, userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("media_entries")
    .upsert(mediaToRow(entry, userId), { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return rowToMedia(data);
}

export async function deleteSupabaseMedia(entryId) {
  const client = requireSupabase();
  const { error } = await client.from("media_entries").delete().eq("id", entryId);
  if (error) throw error;
}

export async function createSupabaseTeam(team, userId) {
  const client = requireSupabase();
  const teamRow = {
    id: String(team.id),
    owner_user_id: userId,
    owner: team.owner,
    name: team.name,
    description: team.description || "",
    created_at: team.createdAt || new Date().toISOString()
  };

  const { data, error } = await client
    .from("teams")
    .upsert(teamRow, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;

  await joinSupabaseTeam(team.id, team.owner, userId);
  return { ...rowToTeam({ ...data, team_members: [{ player: team.owner }] }), members: [team.owner] };
}

export async function joinSupabaseTeam(teamId, username, userId) {
  const client = requireSupabase();
  const { error } = await client
    .from("team_members")
    .upsert({
      team_id: String(teamId),
      user_id: userId,
      player: username
    }, { onConflict: "team_id,user_id" });

  if (error) throw error;
}

export async function leaveSupabaseTeam(teamId, userId) {
  const client = requireSupabase();
  const { error } = await client
    .from("team_members")
    .delete()
    .eq("team_id", String(teamId))
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteSupabaseTeam(teamId) {
  const client = requireSupabase();
  const { error } = await client.from("teams").delete().eq("id", String(teamId));
  if (error) throw error;
}

export async function publishSupabaseLeagueMembership(membership, userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("league_memberships")
    .upsert(membershipToRow(membership, userId), { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return rowToMembership(data);
}

export async function deleteSupabaseLeagueMembership(membershipId) {
  const client = requireSupabase();
  const { error } = await client.from("league_memberships").delete().eq("id", String(membershipId));
  if (error) throw error;
}
