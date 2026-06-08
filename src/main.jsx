import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Camera,
  Clock3,
  Film,
  Flag,
  KeyRound,
  Link as LinkIcon,
  ListChecks,
  MapPin,
  Medal,
  Play,
  Plus,
  Search,
  Table2,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  UserRound,
  UsersRound
} from "lucide-react";
import { kartOptions } from "./data/kartOptions";
import { K1_GP_NIGHT_BONUS_XP, events, leagues } from "./data/leagues";
import { tracks } from "./data/tracks";
import { ENABLE_SAMPLE_DATA, sampleAccounts, sampleLapTimes } from "./data/sampleData";
import {
  createSupabaseTeam,
  deleteSupabaseLeagueMembership,
  deleteSupabaseMedia,
  deleteSupabaseTeam,
  getCurrentSupabaseSession,
  getProfile,
  joinSupabaseTeam,
  leaveSupabaseTeam,
  loadSupabaseBootstrap,
  profileToAccount,
  publishSupabaseLaps,
  publishSupabaseLeagueMembership,
  publishSupabaseMedia,
  resendSupabaseConfirmation,
  signInWithSupabase,
  signOutSupabase,
  signUpWithSupabase,
  supabase,
  supabaseAnonKey,
  supabaseEnabled,
  supabaseUrl,
  testSupabaseConnection,
  upsertProfile
} from "./lib/supabase";
import "./styles.css";

const emptyAccount = {
  username: "You",
  city: "",
  bio: "Karting profile",
  friends: [],
  avatar: "",
  passwordHash: "",
  passwordSalt: "",
  homeTrackId: "",
  kartExperience: "casual",
  onboardingComplete: false
};
const SPLIT_SEED_VERSION = "split-records-v2-private";
const XP_PER_LAP = 25;
const XP_PER_LEVEL = 500;
const TRACK_MASTERY_LAPS_PER_LEVEL = 25;
const ELO_START = 1000;
const ELO_K = 24;
const RACE_RESULT_ELO_K = 28;
const ALL_LAYOUTS = "__all-layouts";
const LEADERBOARD_MODE_REAL = "real";
const LEADERBOARD_MODE_AI = "ai";
const AI_LAP_COUNT = 72;
const AI_SKILL_DEFAULT = 60;
const AI_CONDITION_DEFAULT = 50;
const AI_RECORD_FLOOR_MS = 500;
const API_BASE_URL = (
  import.meta.env.VITE_LAPBOARD_API_URL
  || (import.meta.env.PROD ? "" : "http://127.0.0.1:3010")
).replace(/\/$/, "");
const isProductionBuild = Boolean(import.meta.env.PROD);
function getSafeHost(value) {
  try {
    return value ? new URL(value).host : "missing";
  } catch {
    return "invalid URL";
  }
}

function looksLikeSupabaseAnonKey(value) {
  const parts = String(value || "").split(".");
  return parts.length === 3 && value.startsWith("eyJ");
}
const defaultTheme = {
  mode: "light",
  accent: "#df0d22",
  background: "#f3f5f8",
  surface: "#ffffff",
  text: "#171a21"
};
const themePresets = [
  {
    name: "Clean Light",
    theme: {
      mode: "light",
      accent: "#df0d22",
      background: "#f3f5f8",
      surface: "#ffffff",
      text: "#171a21"
    }
  },
  {
    name: "Paper White",
    theme: {
      mode: "light",
      accent: "#1746ff",
      background: "#ffffff",
      surface: "#ffffff",
      text: "#161922"
    }
  },
  {
    name: "Graphite",
    theme: {
      mode: "dark",
      accent: "#4d7cff",
      background: "#11141a",
      surface: "#191d25",
      text: "#f5f7fb"
    }
  },
  {
    name: "Night Race",
    theme: {
      mode: "dark",
      accent: "#34e071",
      background: "#090c10",
      surface: "#121821",
      text: "#f5f8fb"
    }
  },
  {
    name: "Track Day",
    theme: {
      mode: "light",
      accent: "#0f7b5f",
      background: "#eef5f2",
      surface: "#ffffff",
      text: "#14201d"
    }
  }
];
const ONBOARDING_TOTAL_STEPS = 10;

async function requestSharedApi(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch {
    const target = API_BASE_URL || "the deployed /api backend";
    throw new Error(`Shared backend is not reachable at ${target}. Start the local API with npm run api, or add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Shared API request failed: ${response.status}`);
  }

  return response.json();
}

function mergeById(current, incoming) {
  const items = new Map(current.map((item) => [String(item.id), item]));
  incoming.forEach((item) => {
    if (!item?.id) return;
    items.set(String(item.id), { ...items.get(String(item.id)), ...item });
  });
  return Array.from(items.values());
}

function getPublicLaps(laps) {
  return laps.filter((lap) => lap.visibility !== "private" && !lap.ai);
}

function loadStored(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function loadAccounts(fallback) {
  try {
    const saved = localStorage.getItem("lapboard-accounts");
    if (!saved) return fallback.map(normalizeAccount);

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return fallback.map(normalizeAccount);

    const accounts = parsed
      .map((account) => normalizeAccount(account?.username || account?.player || ""))
      .filter((account) => account.username);

    parsed.forEach((savedAccount) => {
      const account = accounts.find((item) => item.username === savedAccount?.username);
      if (!account) return;
      account.city = savedAccount.city || "";
      account.bio = savedAccount.bio || "Karting profile";
      account.friends = Array.isArray(savedAccount.friends)
        ? savedAccount.friends.filter(Boolean)
        : [];
      account.avatar = savedAccount.avatar || "";
      account.passwordHash = savedAccount.passwordHash || "";
      account.passwordSalt = savedAccount.passwordSalt || "";
      account.homeTrackId = savedAccount.homeTrackId || "";
      account.kartExperience = savedAccount.kartExperience || "casual";
      account.onboardingComplete = Boolean(savedAccount.onboardingComplete);
    });

    const seedWasLoaded = localStorage.getItem("lapboard-seed-version") === SPLIT_SEED_VERSION;
    const mergedAccounts = seedWasLoaded ? accounts : [...accounts];

    if (!seedWasLoaded) {
      fallback.map(normalizeAccount).forEach((seedAccount) => {
        const exists = mergedAccounts.some((account) => account.username.toLowerCase() === seedAccount.username.toLowerCase());
        if (!exists) mergedAccounts.push(seedAccount);
      });
    }

    return mergedAccounts.length ? mergedAccounts : fallback.map(normalizeAccount);
  } catch {
    return fallback.map(normalizeAccount);
  }
}

function loadLapTimes(fallback) {
  try {
    const saved = localStorage.getItem("lapboard-times");
    if (!saved) return fallback;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return fallback;

    const privateSeedIds = new Set(fallback.filter((lap) => lap.visibility === "private").map((lap) => String(lap.id)));
    let migratedLapDates = false;
    const validLapTimes = parsed
      .map((lap) => {
        const trackId = lap.trackId || findTrackByName(lap.track || "")?.id;
        if (!trackId || !getTrack(trackId) || !lap.player || !lap.ms) return null;

        const kartName = lap.kart || lap.car || kartOptions[0];
        const normalizedKart = {
          "Rental Kart - Adult": "K1 Speed Rental Adult",
          "Rental Kart - Junior": "K1 Speed Rental Junior"
        }[kartName] || kartName;

        const savedDate = lap.date || new Date().toISOString().slice(0, 10);
        const normalizedDate = savedDate === "2026-12-14" ? "2025-12-14" : savedDate;
        if (normalizedDate !== savedDate) migratedLapDates = true;

        return {
          id: lap.id || Date.now(),
          player: lap.player,
          trackId,
          kart: normalizedKart,
          ms: lap.ms,
          date: normalizedDate,
          lapNumber: Number(lap.lapNumber) || Number(lap.globalLapNumber) || undefined,
          layout: lap.layout || lap.trackLayout || "Main layout",
          visibility: lap.visibility || (privateSeedIds.has(String(lap.id)) ? "private" : "public")
        };
      })
      .filter(Boolean);

    if (migratedLapDates) {
      localStorage.setItem("lapboard-times", JSON.stringify(validLapTimes));
    }

    const seedVersion = localStorage.getItem("lapboard-seed-version");
    if (seedVersion === `cleared-${SPLIT_SEED_VERSION}`) return validLapTimes;
    if (seedVersion === SPLIT_SEED_VERSION) return validLapTimes;

    const existingIds = new Set(validLapTimes.map((lap) => String(lap.id)));
    const mergedLapTimes = [
      ...fallback.filter((lap) => !existingIds.has(String(lap.id))),
      ...validLapTimes
    ];
    localStorage.setItem("lapboard-seed-version", SPLIT_SEED_VERSION);
    localStorage.setItem("lapboard-times", JSON.stringify(mergedLapTimes));
    return mergedLapTimes;
  } catch {
    return fallback;
  }
}

function loadLeagueMemberships() {
  const saved = loadStored("lapboard-league-memberships", []);
  if (!Array.isArray(saved)) return [];
  return saved.filter((membership) => membership?.player && membership?.leagueId && membership?.trackId);
}

function loadLeagueResults() {
  const saved = loadStored("lapboard-league-results", []);
  if (!Array.isArray(saved)) return [];
  return saved.filter((result) => result?.player && result?.leagueId && result?.trackId && result?.date);
}

function loadMediaEntries() {
  const saved = loadStored("lapboard-media", []);
  if (!Array.isArray(saved)) return [];
  return saved.filter((entry) => entry?.title && entry?.url && entry?.type === "link");
}

function loadTeams() {
  const saved = loadStored("lapboard-teams", []);
  if (!Array.isArray(saved)) return [];
  return saved.filter((team) => team?.name && Array.isArray(team.members));
}

function saveStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatTime(totalMs) {
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  if (minutes === 0) return `${seconds}.${String(milliseconds).padStart(3, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function parseLapTime(minutes, seconds, milliseconds) {
  return Number(minutes) * 60000 + Number(seconds) * 1000 + Number(milliseconds);
}

function createPasswordSalt() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function hashPassword(password, salt) {
  const input = `${salt}:${password}`;
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function buildPasswordFields(password) {
  const passwordSalt = createPasswordSalt();
  return {
    passwordHash: hashPassword(password, passwordSalt),
    passwordSalt
  };
}

function hasPassword(account) {
  return Boolean(account?.passwordHash && account?.passwordSalt);
}

function verifyPassword(account, password) {
  if (!hasPassword(account)) return true;
  return hashPassword(password, account.passwordSalt) === account.passwordHash;
}

function findTrackByName(trackName) {
  const normalized = trackName.trim().toLowerCase();
  return tracks.find((track) => {
    const names = [track.name, ...(track.aliases || [])].map((name) => name.toLowerCase());
    return names.includes(normalized);
  });
}

function getTrack(trackId) {
  return tracks.find((track) => track.id === trackId);
}

function getTrackName(trackId) {
  return getTrack(trackId)?.name || "Unknown track";
}

function getLayoutOptions(trackId) {
  const track = getTrack(trackId);
  const layouts = track?.layouts?.length ? track.layouts : [track?.layout || "Main layout"];
  return layouts.map((layout) => (
    typeof layout === "string" ? { name: layout, image: "" } : { name: layout.name, image: layout.image || "" }
  ));
}

function getTrackLayouts(trackId) {
  return getLayoutOptions(trackId).map((layout) => layout.name);
}

function getLayoutOption(trackId, layoutName) {
  return getLayoutOptions(trackId).find((layout) => layout.name === layoutName) || getLayoutOptions(trackId)[0];
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getTrackImageCandidates(track, layoutName) {
  const layoutOption = getLayoutOption(track.id, layoutName);
  const folderNames = uniqueValues([track.id, slugify(track.name)]);
  const extensions = ["jpg", "png", "webp", "jpeg"];
  const layoutSlug = slugify(layoutOption?.name || layoutName);
  const candidates = [];

  if (layoutOption?.image) candidates.push(layoutOption.image);

  folderNames.forEach((folderName) => {
    if (layoutSlug) {
      extensions.forEach((extension) => {
        candidates.push(`/tracks/${folderName}/${layoutSlug}.${extension}`);
      });
    }
  });

  if (track.image) candidates.push(track.image);

  folderNames.forEach((folderName) => {
    ["cover", "track", "main"].forEach((fileName) => {
      extensions.forEach((extension) => {
        candidates.push(`/tracks/${folderName}/${fileName}.${extension}`);
      });
    });
  });

  return uniqueValues(candidates);
}

function trackMatchesQuery(track, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return `${track.name} ${track.city} ${track.layout} ${(track.aliases || []).join(" ")}`.toLowerCase().includes(normalized);
}

function isIndoorTrack(track) {
  return String(track.type || track.layout || "").toLowerCase().includes("indoor");
}

function getVisibleLapTimes(lapTimes, username) {
  return lapTimes.filter((lap) => lap.visibility !== "private" || lap.player.toLowerCase() === username.toLowerCase());
}

function layoutMatches(lap, layoutFilter) {
  return !layoutFilter || layoutFilter === ALL_LAYOUTS || (lap.layout || "Main layout") === layoutFilter;
}

function getBestLapForTrack(lapTimes, trackId, layoutFilter = ALL_LAYOUTS) {
  return lapTimes
    .filter((lap) => lap.trackId === trackId && layoutMatches(lap, layoutFilter))
    .sort((a, b) => a.ms - b.ms)[0];
}

function getPersonalBestForTrack(lapTimes, username, trackId, layoutFilter = ALL_LAYOUTS) {
  return getBestLapForTrack(
    lapTimes.filter((lap) => lap.player.toLowerCase() === username.toLowerCase()),
    trackId,
    layoutFilter
  );
}

function getPublicTrackRecord(lapTimes, trackId, layoutFilter = ALL_LAYOUTS) {
  return getConfiguredTrackRecord(trackId, layoutFilter);
}

function getConfiguredTrackRecord(trackId, layoutFilter = ALL_LAYOUTS) {
  const track = getTrack(trackId);
  if (!track?.trackRecords) return null;

  const records = Object.entries(track.trackRecords)
    .filter(([layoutName]) => layoutFilter === ALL_LAYOUTS || layoutName === layoutFilter)
    .map(([layoutName, record]) => {
      const ms = Number(record?.ms) || parseTimeValue(record?.time);
      if (!ms) return null;
      return {
        id: `${trackId}-${layoutName}-official-record`,
        player: record.holder || "Official record",
        trackId,
        layout: layoutName,
        kart: record.kart || "Official record",
        date: record.date || "",
        ms,
        visibility: "public",
        official: true
      };
    })
    .filter(Boolean);

  return records.sort((a, b) => a.ms - b.ms)[0] || null;
}

function getConfiguredJuniorTrackRecord(trackId, layoutFilter = ALL_LAYOUTS) {
  const track = getTrack(trackId);
  if (!track?.trackRecords) return null;

  const records = Object.entries(track.trackRecords)
    .filter(([layoutName]) => layoutFilter === ALL_LAYOUTS || layoutName === layoutFilter)
    .map(([layoutName, record]) => {
      const ms = Number(record?.juniorMs) || parseTimeValue(record?.juniorTime);
      if (!ms) return null;
      return {
        id: `${trackId}-${layoutName}-official-junior-record`,
        player: record.juniorHolder || "Official junior record",
        trackId,
        layout: layoutName,
        kart: record.juniorKart || "Junior kart",
        date: record.juniorDate || "",
        ms,
        visibility: "public",
        official: true
      };
    })
    .filter(Boolean);

  return records.sort((a, b) => a.ms - b.ms)[0] || null;
}

function getPersonalBests(lapTimes, username) {
  return tracks.map((track) => {
    const best = lapTimes
      .filter((lap) => lap.player.toLowerCase() === username.toLowerCase() && lap.trackId === track.id)
      .sort((a, b) => a.ms - b.ms)[0];

    return { track, best };
  });
}

function getLeaderboard(lapTimes, trackQuery, layoutFilter = ALL_LAYOUTS) {
  const matchingTrackIds = new Set(
    tracks.filter((track) => trackMatchesQuery(track, trackQuery)).map((track) => track.id)
  );
  const playerBestByTrack = new Map();

  lapTimes
    .filter((lap) => matchingTrackIds.has(lap.trackId) && layoutMatches(lap, layoutFilter))
    .forEach((lap) => {
      const key = `${lap.player}-${lap.trackId}-${lap.layout || "Main layout"}`;
      const currentBest = playerBestByTrack.get(key);
      if (!currentBest || lap.ms < currentBest.ms) {
        playerBestByTrack.set(key, lap);
      }
    });

  return Array.from(playerBestByTrack.values()).sort((a, b) => a.ms - b.ms);
}

function getCommunityBestLaps(lapTimes) {
  const bestByPlayerTrackLayout = new Map();

  lapTimes
    .filter((lap) => lap.visibility !== "private" && !lap.ai)
    .forEach((lap) => {
      const layoutName = lap.layout || "Main layout";
      const key = `${lap.trackId}:${layoutName}:${lap.player.toLowerCase()}`;
      const currentBest = bestByPlayerTrackLayout.get(key);
      if (!currentBest || lap.ms < currentBest.ms) {
        bestByPlayerTrackLayout.set(key, { ...lap, layout: layoutName });
      }
    });

  const groupedByTrackLayout = new Map();
  bestByPlayerTrackLayout.forEach((lap) => {
    const key = `${lap.trackId}:${lap.layout || "Main layout"}`;
    groupedByTrackLayout.set(key, [...(groupedByTrackLayout.get(key) || []), lap]);
  });

  const trackOrder = new Map(tracks.map((track, index) => [track.id, index]));

  return Array.from(groupedByTrackLayout.entries())
    .sort(([groupA], [groupB]) => {
      const [trackA, layoutA] = groupA.split(":");
      const [trackB, layoutB] = groupB.split(":");
      return (trackOrder.get(trackA) ?? 9999) - (trackOrder.get(trackB) ?? 9999)
        || layoutA.localeCompare(layoutB);
    })
    .flatMap(([, laps]) => (
      laps
        .sort((a, b) => a.ms - b.ms || a.player.localeCompare(b.player))
        .map((lap, index) => ({ ...lap, communityRank: index + 1 }))
    ));
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value) {
  return String(value).split("").reduce((hash, character) => (
    Math.imul(hash ^ character.charCodeAt(0), 16777619)
  ), 2166136261) >>> 0;
}

function seededNoise(seed, index, salt = 0) {
  const value = Math.sin((seed + 1) * 12.9898 + (index + 1) * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function getAiPercentCondition(percent, kind) {
  const normalized = clamp(Number(percent) || 0, 0, 100);
  const ratio = normalized / 100;
  const isKart = kind === "kart";
  const slowMultiplier = isKart ? 1.045 : 1.06;
  const fastMultiplier = isKart ? 0.992 : 0.995;
  const looseSpread = isKart ? 1.1 : 1.15;
  const tightSpread = isKart ? 0.75 : 0.72;

  return {
    label: `${Math.round(normalized)}%`,
    ratio,
    multiplier: slowMultiplier + (fastMultiplier - slowMultiplier) * ratio,
    spread: looseSpread + (tightSpread - looseSpread) * ratio
  };
}

function getUserPaceRatio(lapTimes, username) {
  const ratios = [];

  tracks.forEach((track) => {
    getTrackLayouts(track.id).forEach((layoutName) => {
      const layoutFilter = layoutName || "Main layout";
      const personalBest = getPersonalBestForTrack(lapTimes, username, track.id, layoutFilter);
      const record = getPublicTrackRecord(lapTimes, track.id, layoutFilter);

      if (!personalBest || !record || record.ms <= 0) return;
      ratios.push(clamp(personalBest.ms / record.ms, 0.82, 1.6));
    });
  });

  return median(ratios) || 1.08;
}

function getRecentAverageMs(lapTimes, username, trackId, layoutFilter) {
  const recent = lapTimes
    .filter((lap) => (
      lap.player.toLowerCase() === username.toLowerCase()
      && lap.trackId === trackId
      && layoutMatches(lap, layoutFilter)
    ))
    .sort((a, b) => (
      new Date(`${b.date}T12:00:00`) - new Date(`${a.date}T12:00:00`)
      || String(b.id).localeCompare(String(a.id))
    ))
    .slice(0, 6);

  if (!recent.length) return null;
  return recent.reduce((total, lap) => total + lap.ms, 0) / recent.length;
}

function predictAiLapForLayout(lapTimes, username, trackId, layoutName, paceRatio) {
  const layoutFilter = layoutName || "Main layout";
  const personalBest = getPersonalBestForTrack(lapTimes, username, trackId, layoutFilter);
  const record = getPublicTrackRecord(lapTimes, trackId, layoutFilter);

  if (personalBest) {
    const recentAverage = getRecentAverageMs(lapTimes, username, trackId, layoutFilter);
    const consistencyGap = recentAverage ? Math.max(0, recentAverage - personalBest.ms) / recentAverage : 0;
    const improvement = clamp(0.006 + consistencyGap * 0.28, 0.006, 0.035);
    return {
      ms: Math.round(personalBest.ms * (1 - improvement)),
      basis: "PB + recent trend"
    };
  }

  if (record) {
    return {
      ms: Math.round(record.ms * paceRatio * 1.015),
      basis: "pace ratio estimate"
    };
  }

  return null;
}

function getAiLeaderboard(lapTimes, username, trackQuery, layoutFilter = ALL_LAYOUTS, options = {}) {
  const realLeaderboard = getLeaderboard(lapTimes, trackQuery, layoutFilter);
  const matchingTracks = tracks.filter((track) => trackMatchesQuery(track, trackQuery));
  const paceRatio = getUserPaceRatio(lapTimes, username);
  const rawSkillLevel = Number(options.skillLevel);
  const skillLevel = Number.isFinite(rawSkillLevel) ? clamp(rawSkillLevel, 0, 100) : AI_SKILL_DEFAULT;
  const skillRatio = skillLevel / 100;
  const trackCondition = getAiPercentCondition(options.trackCondition, "track");
  const kartCondition = getAiPercentCondition(options.kartCondition, "kart");
  const allPerformanceMaxed = (
    skillRatio === 1
    && trackCondition.ratio === 1
    && kartCondition.ratio === 1
  );
  const combinedPerformance = skillRatio * trackCondition.ratio * kartCondition.ratio;
  const allowedRecordGainMs = allPerformanceMaxed
    ? AI_RECORD_FLOOR_MS
    : Math.min(AI_RECORD_FLOOR_MS - 1, Math.floor(AI_RECORD_FLOOR_MS * combinedPerformance));
  const candidates = [];

  matchingTracks.forEach((track) => {
    getTrackLayouts(track.id)
      .filter((layoutName) => layoutFilter === ALL_LAYOUTS || layoutName === layoutFilter)
      .forEach((layoutName) => {
        const prediction = predictAiLapForLayout(lapTimes, username, track.id, layoutName, paceRatio);
        if (!prediction) return;
        const record = getPublicTrackRecord(lapTimes, track.id, layoutName || "Main layout");

        candidates.push({
          trackId: track.id,
          layoutName,
          recordMs: record?.ms || null,
          prediction,
          seed: hashString(`${track.id}-${layoutName}`)
        });
      });
  });

  if (!candidates.length) return realLeaderboard;

  const skillMultiplier = 1.16 - skillRatio * 0.168;
  const conditionRatio = (trackCondition.ratio + kartCondition.ratio) / 2;
  const fastWindow = (0.004 + skillRatio * 0.017) * (0.7 + conditionRatio * 0.5);
  const slowWindow = (0.025 + (1 - skillRatio) * 0.065) * trackCondition.spread * kartCondition.spread;
  const generatedCount = Math.max(AI_LAP_COUNT, Math.min(120, candidates.length * 10));
  const aiLaps = Array.from({ length: generatedCount }, (_, index) => {
    const candidate = candidates[index % candidates.length];
    const consistencyNoise = (seededNoise(candidate.seed, index) - 0.5) * 2;
    const slowerTail = seededNoise(candidate.seed, index, 7) ** 2 * (0.004 + (1 - skillRatio) * 0.028);
    const fieldVariation = consistencyNoise < 0
      ? consistencyNoise * fastWindow
      : consistencyNoise * slowWindow + slowerTail;
    const simulatedMs = Math.max(1000, Math.round(
      candidate.prediction.ms
      * skillMultiplier
      * trackCondition.multiplier
      * kartCondition.multiplier
      * (1 + fieldVariation)
    ));
    const recordFloorMs = candidate.recordMs
      ? Math.max(1000, candidate.recordMs - allowedRecordGainMs)
      : 1000;
    const isBenchmarkLap = allPerformanceMaxed && index < candidates.length && candidate.recordMs;
    const ms = isBenchmarkLap ? recordFloorMs : Math.max(recordFloorMs, simulatedMs);

    return {
      id: `ai-${candidate.trackId}-${candidate.layoutName}-${index}`,
      player: `AI Driver ${String(index + 1).padStart(2, "0")}`,
      trackId: candidate.trackId,
      layout: candidate.layoutName,
      kart: `${trackCondition.label} / ${kartCondition.label}`,
      ms,
      date: new Date().toISOString().slice(0, 10),
      visibility: "private",
      ai: true,
      lr: Math.round(820 + skillLevel * 8.5 + (1 - seededNoise(candidate.seed, index, 13)) * 90),
      source: candidate.prediction.basis
    };
  });

  return [...realLeaderboard, ...aiLaps]
    .sort((a, b) => a.ms - b.ms);
}

function getLapsForTrack(lapTimes, username, trackId, sortConfig, layoutFilter = ALL_LAYOUTS) {
  const laps = lapTimes
    .filter((lap) => (
      lap.player.toLowerCase() === username.toLowerCase()
      && lap.trackId === trackId
      && layoutMatches(lap, layoutFilter)
    ))
    .sort((a, b) => {
      const lapA = Number(a.lapNumber) || 0;
      const lapB = Number(b.lapNumber) || 0;
      if (lapA && lapB && lapA !== lapB) return lapA - lapB;
      return new Date(`${a.date}T12:00:00`) - new Date(`${b.date}T12:00:00`) || String(a.id).localeCompare(String(b.id));
    });

  return laps.sort((a, b) => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    if (sortConfig.key === "time") return (a.ms - b.ms) * direction;
    if (sortConfig.key === "date") {
      return (new Date(`${a.date}T12:00:00`) - new Date(`${b.date}T12:00:00`)) * direction;
    }
    return ((Number(a.lapNumber) || 0) - (Number(b.lapNumber) || 0)) * direction;
  });
}

function addDisplayDeltas(laps) {
  return laps.map((lap, index) => ({
    ...lap,
    deltaMs: index === 0 ? null : lap.ms - laps[index - 1].ms
  }));
}

function formatDelta(deltaMs) {
  if (deltaMs === null) return "--";
  const sign = deltaMs > 0 ? "+" : "";
  return `${sign}${(deltaMs / 1000).toFixed(3)}s`;
}

function parseFinishPosition(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function applyPairwiseElo(ratings, ordered, kFactor) {
  if (ordered.length < 2) return;

  const changes = new Map(ordered.map((entry) => [entry.player, 0]));

  for (let winnerIndex = 0; winnerIndex < ordered.length; winnerIndex += 1) {
    for (let loserIndex = winnerIndex + 1; loserIndex < ordered.length; loserIndex += 1) {
      const winner = ordered[winnerIndex];
      const loser = ordered[loserIndex];
      const winnerRating = ratings.get(winner.player) || ELO_START;
      const loserRating = ratings.get(loser.player) || ELO_START;
      const expectedWinner = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
      const change = kFactor * (1 - expectedWinner);

      changes.set(winner.player, (changes.get(winner.player) || 0) + change);
      changes.set(loser.player, (changes.get(loser.player) || 0) - change);
    }
  }

  changes.forEach((change, player) => {
    ratings.set(player, Math.max(100, (ratings.get(player) || ELO_START) + change));
  });
}

function getSoloRaceResultAdjustment(position) {
  if (!position) return 0;
  if (position === 1) return 14;
  if (position === 2) return 9;
  if (position === 3) return 5;
  if (position === 4) return 2;
  return Math.max(-12, 5 - position);
}

function getEloRatings(lapTimes, leagueResults = [], accounts = []) {
  const ratings = new Map(accounts.map((account) => [account.username, ELO_START]));
  const bestByPlayerTrackLayout = new Map();

  lapTimes
    .filter((lap) => lap.visibility !== "private")
    .forEach((lap) => {
      const layoutName = lap.layout || "Main layout";
      const key = `${lap.trackId}:${layoutName}:${lap.player.toLowerCase()}`;
      const currentBest = bestByPlayerTrackLayout.get(key);
      if (!currentBest || lap.ms < currentBest.ms) {
        bestByPlayerTrackLayout.set(key, lap);
      }
      if (!ratings.has(lap.player)) ratings.set(lap.player, ELO_START);
    });

  const groups = new Map();
  bestByPlayerTrackLayout.forEach((lap) => {
    const groupKey = `${lap.trackId}:${lap.layout || "Main layout"}`;
    groups.set(groupKey, [...(groups.get(groupKey) || []), lap]);
  });

  Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, laps]) => {
      const ordered = [...laps].sort((a, b) => a.ms - b.ms);
      applyPairwiseElo(ratings, ordered, ELO_K);
    });

  const raceGroups = new Map();
  leagueResults
    .map((result) => ({
      ...result,
      position: parseFinishPosition(result.finish)
    }))
    .filter((result) => result.player && result.leagueId && result.trackId && result.date && result.position)
    .forEach((result) => {
      if (!ratings.has(result.player)) ratings.set(result.player, ELO_START);
      const groupKey = `${result.leagueId}:${result.trackId}:${result.date}`;
      raceGroups.set(groupKey, [...(raceGroups.get(groupKey) || []), result]);
    });

  Array.from(raceGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, results]) => {
      const ordered = [...results].sort((a, b) => (
        a.position - b.position
        || Number(b.points || 0) - Number(a.points || 0)
        || String(a.id).localeCompare(String(b.id))
      ));

      if (ordered.length > 1) {
        applyPairwiseElo(ratings, ordered, RACE_RESULT_ELO_K);
        return;
      }

      const [soloResult] = ordered;
      ratings.set(
        soloResult.player,
        Math.max(100, (ratings.get(soloResult.player) || ELO_START) + getSoloRaceResultAdjustment(soloResult.position))
      );
    });

  return ratings;
}

function getPlayerElo(eloRatings, username) {
  return Math.round(eloRatings.get(username) || ELO_START);
}

function getNextLapNumber(lapTimes, username, trackId) {
  const currentMax = lapTimes
    .filter((lap) => lap.player.toLowerCase() === username.toLowerCase() && lap.trackId === trackId)
    .reduce((max, lap) => Math.max(max, Number(lap.lapNumber) || 0), 0);
  return currentMax + 1;
}

function getPlayerXp(lapTimes, username) {
  return lapTimes.filter((lap) => lap.player.toLowerCase() === username.toLowerCase()).length * XP_PER_LAP;
}

function getPlayerLevel(lapTimes, username, bonusXp = 0) {
  return Math.floor((getPlayerXp(lapTimes, username) + bonusXp) / XP_PER_LEVEL) + 1;
}

function getLevelProgress(lapTimes, username, bonusXp = 0) {
  return (getPlayerXp(lapTimes, username) + bonusXp) % XP_PER_LEVEL;
}

function getTrackMastery(lapTimes, username, trackId) {
  const lapCount = lapTimes.filter((lap) => (
    lap.player.toLowerCase() === username.toLowerCase() && lap.trackId === trackId
  )).length;

  return {
    lapCount,
    level: Math.floor(lapCount / TRACK_MASTERY_LAPS_PER_LEVEL) + 1,
    progress: lapCount % TRACK_MASTERY_LAPS_PER_LEVEL
  };
}

function getAccentContrastColor(color) {
  const normalized = String(color || "").replace("#", "").trim();
  const hex = normalized.length === 3
    ? normalized.split("").map((character) => `${character}${character}`).join("")
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#11141a" : "#ffffff";
}

function getThemeStyle(theme) {
  const isDark = theme.mode === "dark";

  return {
    "--accent": theme.accent,
    "--accent-contrast": getAccentContrastColor(theme.accent),
    "--background": theme.background,
    "--surface": theme.surface,
    "--text": theme.text,
    "--muted": isDark ? "#9aa3b2" : "#687080",
    "--border": isDark ? "#3a4150" : "#dde2ea",
    "--shadow": isDark ? "rgba(0, 0, 0, 0.32)" : "rgba(22, 26, 35, 0.04)"
  };
}

function canLoadPrivateSeedData() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function normalizeAccount(account) {
  const username = typeof account === "string" ? account : account?.username || "";

  return {
    username: username.trim(),
    city: typeof account === "object" ? account.city || "" : "",
    bio: typeof account === "object" ? account.bio || "Karting profile" : "Karting profile",
    friends: typeof account === "object" && Array.isArray(account.friends) ? account.friends : [],
    avatar: typeof account === "object" ? account.avatar || "" : "",
    passwordHash: typeof account === "object" ? account.passwordHash || "" : "",
    passwordSalt: typeof account === "object" ? account.passwordSalt || "" : "",
    homeTrackId: typeof account === "object" ? account.homeTrackId || "" : "",
    kartExperience: typeof account === "object" ? account.kartExperience || "casual" : "casual",
    onboardingComplete: typeof account === "object" ? Boolean(account.onboardingComplete) : false
  };
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

function normalizeHeader(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseTimeValue(value) {
  if (!value) return null;
  const normalized = String(value).trim();

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Math.round(Number(normalized) * 1000);
  }

  const match = normalized.match(/^(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const milliseconds = Number((match[3] || "0").padEnd(3, "0"));

  return parseLapTime(minutes, seconds, milliseconds);
}

function parseK1LapPaste(text) {
  const normalized = text.replace(/\r/g, "\n");
  const chunkPattern = /\(\s*\d+\s*\)\s*([0-9]+(?::[0-9]{1,2})?(?:\.[0-9]{1,3})?)/g;
  const chunks = [...normalized.matchAll(chunkPattern)].map((match) => match[1]);
  const values = chunks.length
    ? chunks
    : normalized
      .split(/[\n|]+/)
      .map((item) => item.replace(/\(\s*\d+\s*\)/g, "").trim())
      .filter(Boolean);

  return values
    .map((value) => parseTimeValue(value))
    .filter((value) => value && value > 0);
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getLeague(leagueId) {
  return leagues.find((league) => league.id === leagueId);
}

function getK1SpeedLocations() {
  return tracks.filter((track) => track.name.startsWith("K1 Speed"));
}

function getLeagueLocations(league) {
  if (league?.trackIds?.length) {
    return league.trackIds.map(getTrack).filter(Boolean);
  }
  return getK1SpeedLocations();
}

function getLeagueRaceDateSet(leagueId) {
  return new Set((getLeague(leagueId)?.dates || []).map((item) => item.date));
}

function isLeagueRaceDate(leagueId, date) {
  return getLeagueRaceDateSet(leagueId).has(date);
}

function getUserLeagueMemberships(memberships, username) {
  return memberships.filter((membership) => membership.player.toLowerCase() === username.toLowerCase());
}

function getLeagueMembers(memberships, leagueId, trackId) {
  return [...new Set(
    memberships
      .filter((membership) => membership.leagueId === leagueId && membership.trackId === trackId)
      .map((membership) => membership.player)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function getUserLeagueResults(results, username) {
  return results.filter((result) => result.player.toLowerCase() === username.toLowerCase());
}

function getLeagueBonusXp(lapTimes, results, memberships, username) {
  const userMemberships = getUserLeagueMemberships(memberships, username);
  const membershipKeys = new Set(userMemberships.map((membership) => `${membership.leagueId}:${membership.trackId}`));
  const lapBonus = lapTimes
    .filter((lap) => lap.player.toLowerCase() === username.toLowerCase())
    .reduce((total, lap) => {
      const matchesLeagueNight = userMemberships.some((membership) => (
        membership.trackId === lap.trackId && isLeagueRaceDate(membership.leagueId, lap.date)
      ));
      return total + (matchesLeagueNight ? K1_GP_NIGHT_BONUS_XP : 0);
    }, 0);
  const resultBonus = getUserLeagueResults(results, username)
    .filter((result) => membershipKeys.has(`${result.leagueId}:${result.trackId}`) && isLeagueRaceDate(result.leagueId, result.date))
    .length * K1_GP_NIGHT_BONUS_XP;

  return lapBonus + resultBonus;
}

function getCell(row, headerMap, names, fallbackIndex) {
  const headerIndex = names.map(normalizeHeader).find((name) => headerMap[name] !== undefined);
  if (headerIndex !== undefined) return row[headerMap[headerIndex]] || "";
  return row[fallbackIndex] || "";
}

function parseLapCsv(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return { laps: [], errors: ["CSV file is empty."] };

  const firstRow = rows[0].map(normalizeHeader);
  const knownHeaders = ["player", "driver", "username", "track", "trackname", "layout", "tracklayout", "kart", "kartclass", "class", "time", "laptime", "date", "lap", "lapnumber", "lapnum"];
  const hasHeader = firstRow.some((cell) => knownHeaders.includes(cell));
  const headerMap = {};

  if (hasHeader) {
    firstRow.forEach((cell, index) => {
      headerMap[cell] = index;
    });
  }

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const errors = [];
  const laps = dataRows.map((row, index) => {
    const player = getCell(row, headerMap, ["player", "driver", "username"], 0).trim();
    const trackName = getCell(row, headerMap, ["track", "trackname"], 1).trim();
    const layout = hasHeader ? getCell(row, headerMap, ["layout", "tracklayout"], 2).trim() || "Main layout" : "Main layout";
    const kart = getCell(row, headerMap, ["kart", "kartclass", "class", "car"], hasHeader ? 3 : 2).trim() || kartOptions[0];
    const time = getCell(row, headerMap, ["time", "laptime", "bestlap"], hasHeader ? 4 : 3).trim();
    const date = getCell(row, headerMap, ["date"], hasHeader ? 5 : 4).trim() || new Date().toISOString().slice(0, 10);
    const lapNumber = Number(getCell(row, headerMap, ["lap", "lapnumber", "lapnum"], hasHeader ? 6 : 5)) || undefined;
    const track = findTrackByName(trackName);
    const ms = parseTimeValue(time);
    const rowNumber = hasHeader ? index + 2 : index + 1;

    if (!player || !track || !ms) {
      errors.push(`Row ${rowNumber} skipped: expected player, known track, kart, lap time, date.`);
      return null;
    }

    return {
      id: Date.now() + index,
      player,
      trackId: track.id,
      kart,
      ms,
      date,
      lapNumber,
      layout,
      visibility: "public"
    };
  }).filter(Boolean);

  return { laps, errors };
}

function normalizeLapDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return value;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
    return parsed.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SearchField({ id, label, icon, value, onChange, placeholder, list }) {
  return (
    <label className="field">
      <span className="field-label">
        {icon}
        {label}
      </span>
      <span className="search-wrap">
        <Search size={16} aria-hidden="true" />
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          list={list}
        />
      </span>
    </label>
  );
}

function TrackImage({ track, layoutName }) {
  const layoutOption = getLayoutOption(track.id, layoutName);
  const imageCandidates = getTrackImageCandidates(track, layoutName);
  const [imageIndex, setImageIndex] = useState(0);
  const image = imageCandidates[imageIndex];

  useEffect(() => {
    setImageIndex(0);
  }, [track.id, layoutName]);

  if (image) {
    return (
      <img
        src={image}
        alt={`${track.name} ${layoutOption?.name || "track"} layout`}
        onError={() => setImageIndex((index) => index + 1)}
      />
    );
  }

  return (
    <div className="track-placeholder" aria-label={`${track.name} photo placeholder`}>
      <Camera size={24} aria-hidden="true" />
      <span>Add /public/tracks/{track.id}/{slugify(layoutOption?.name || "cover")}.jpg</span>
    </div>
  );
}

function App() {
  const sharedLapIdsRef = useRef(new Set());
  const sharedLeagueMembershipIdsRef = useRef(new Set());
  const suppressLapPublishRef = useRef(false);
  const suppressLeaguePublishRef = useRef(false);
  const shouldSeedPrivateData = ENABLE_SAMPLE_DATA && canLoadPrivateSeedData();
  const sampleStartAccounts = shouldSeedPrivateData ? sampleAccounts : [emptyAccount];
  const sampleStartLapTimes = shouldSeedPrivateData ? sampleLapTimes : [];

  const [activeTab, setActiveTab] = useState("leaderboard");
  const [accounts, setAccounts] = useState(() => loadAccounts(sampleStartAccounts));
  const [currentUser, setCurrentUser] = useState(() => {
    const savedCurrentUser = loadStored("lapboard-current-user", sampleStartAccounts[0]?.username || "You");
    return typeof savedCurrentUser === "string" ? savedCurrentUser : sampleStartAccounts[0]?.username || "You";
  });
  const [lapTimes, setLapTimes] = useState(() => loadLapTimes(sampleStartLapTimes));
  const [leagueMemberships, setLeagueMemberships] = useState(() => loadLeagueMemberships());
  const [leagueResults, setLeagueResults] = useState(() => loadLeagueResults());
  const [mediaEntries, setMediaEntries] = useState(() => loadMediaEntries());
  const [teams, setTeams] = useState(() => loadTeams());
  const [trackQuery, setTrackQuery] = useState("");
  const [leaderboardLayout, setLeaderboardLayout] = useState(ALL_LAYOUTS);
  const [leaderboardMode, setLeaderboardMode] = useState(LEADERBOARD_MODE_REAL);
  const [aiSkillLevel, setAiSkillLevel] = useState(AI_SKILL_DEFAULT);
  const [aiTrackCondition, setAiTrackCondition] = useState(AI_CONDITION_DEFAULT);
  const [aiKartCondition, setAiKartCondition] = useState(AI_CONDITION_DEFAULT);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLayouts, setDirectoryLayouts] = useState({});
  const [myLapsTrackId, setMyLapsTrackId] = useState(tracks[0]?.id || "");
  const [myLapsLayout, setMyLapsLayout] = useState(ALL_LAYOUTS);
  const [myLapsSort, setMyLapsSort] = useState({ key: "lap", direction: "asc" });
  const [myLapsPage, setMyLapsPage] = useState(1);
  const [myLapsPageSize, setMyLapsPageSize] = useState(25);
  const [formTrackName, setFormTrackName] = useState(tracks[0]?.name || "");
  const [layout, setLayout] = useState(getTrackLayouts(tracks[0]?.id)[0] || "Main layout");
  const [kart, setKart] = useState(kartOptions[0] || "");
  const [minutes, setMinutes] = useState("00");
  const [seconds, setSeconds] = useState("24");
  const [milliseconds, setMilliseconds] = useState("135");
  const [showK1Importer, setShowK1Importer] = useState(false);
  const [k1LapText, setK1LapText] = useState("");
  const [k1LapDate, setK1LapDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [authEmail, setAuthEmail] = useState("");
  const [authMode, setAuthMode] = useState("sign-in");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [friendName, setFriendName] = useState("");
  const [theme, setTheme] = useState(() => loadStored("lapboard-theme", defaultTheme));
  const [now, setNow] = useState(() => new Date());
  const [message, setMessage] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [backendStatusDetail, setBackendStatusDetail] = useState("");
  const [lastSharedError, setLastSharedError] = useState(() => loadStored("lapboard-last-shared-error", ""));
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [authStatus, setAuthStatus] = useState(supabaseEnabled ? "checking" : "local");
  const [authRedirectError, setAuthRedirectError] = useState("");
  const [supabaseTestResult, setSupabaseTestResult] = useState("");
  const [verificationCooldownUntil, setVerificationCooldownUntil] = useState(0);
  const [lastSharedSync, setLastSharedSync] = useState("");
  const [autoPublishLaps, setAutoPublishLaps] = useState(() => Boolean(loadStored("lapboard-auto-publish-laps", false)));
  const [leagueTab, setLeagueTab] = useState("available");
  const [joiningLeagueId, setJoiningLeagueId] = useState("");
  const [joinTrackId, setJoinTrackId] = useState(getK1SpeedLocations()[0]?.id || "");
  const [resultLeagueKey, setResultLeagueKey] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [resultFinish, setResultFinish] = useState("");
  const [resultPoints, setResultPoints] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFileTitle, setMediaFileTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(() => !loadStored("lapboard-onboarding-complete", false));
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingUsername, setOnboardingUsername] = useState("");
  const [onboardingPassword, setOnboardingPassword] = useState("");
  const [onboardingCity, setOnboardingCity] = useState("");
  const [onboardingBio, setOnboardingBio] = useState("Karting profile");
  const [onboardingHomeTrackId, setOnboardingHomeTrackId] = useState(tracks[0]?.id || "");
  const [onboardingExperience, setOnboardingExperience] = useState("casual");
  const [onboardingThemeMode, setOnboardingThemeMode] = useState(theme.mode || "light");
  const [onboardingAccent, setOnboardingAccent] = useState(theme.accent || defaultTheme.accent);

  const account = accounts.find((item) => item.username === currentUser) || accounts[0] || emptyAccount;
  const accountFriends = Array.isArray(account.friends) ? account.friends : [];
  const userLeagueMemberships = useMemo(
    () => getUserLeagueMemberships(leagueMemberships, account.username),
    [leagueMemberships, account.username]
  );
  const userLeagueResults = useMemo(
    () => getUserLeagueResults(leagueResults, account.username),
    [leagueResults, account.username]
  );
  const userTeams = useMemo(
    () => teams.filter((team) => team.members.some((member) => member.toLowerCase() === account.username.toLowerCase())),
    [teams, account.username]
  );
  const leagueBonusXp = useMemo(
    () => getLeagueBonusXp(lapTimes, leagueResults, leagueMemberships, account.username),
    [lapTimes, leagueResults, leagueMemberships, account.username]
  );
  const visibleLapTimes = useMemo(() => getVisibleLapTimes(lapTimes, account.username), [lapTimes, account.username]);
  const selectedLeaderboardTrack = findTrackByName(trackQuery);
  const leaderboardLayoutOptions = selectedLeaderboardTrack ? getTrackLayouts(selectedLeaderboardTrack.id) : [];
  const leaderboardLayoutFilter = selectedLeaderboardTrack && leaderboardLayoutOptions.length > 1 ? leaderboardLayout : ALL_LAYOUTS;
  const leaderboard = useMemo(
    () => (
      leaderboardMode === LEADERBOARD_MODE_AI
        ? getAiLeaderboard(visibleLapTimes, account.username, trackQuery, leaderboardLayoutFilter, {
          skillLevel: aiSkillLevel,
          trackCondition: aiTrackCondition,
          kartCondition: aiKartCondition
        })
        : getLeaderboard(visibleLapTimes, trackQuery, leaderboardLayoutFilter)
    ),
    [
      visibleLapTimes,
      account.username,
      trackQuery,
      leaderboardLayoutFilter,
      leaderboardMode,
      aiSkillLevel,
      aiTrackCondition,
      aiKartCondition
    ]
  );
  const eloRatings = useMemo(
    () => getEloRatings(visibleLapTimes, leagueResults, accounts),
    [visibleLapTimes, leagueResults, accounts]
  );
  const elo = getPlayerElo(eloRatings, account.username);
  const recentLapTimes = useMemo(
    () =>
      lapTimes
        .filter((lap) => lap.player.toLowerCase() === account.username.toLowerCase())
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6),
    [lapTimes, account.username]
  );
  const communityLaps = useMemo(
    () => getCommunityBestLaps(lapTimes),
    [lapTimes]
  );
  const filteredTracks = useMemo(
    () => tracks.filter((track) => trackMatchesQuery(track, directoryQuery)),
    [directoryQuery]
  );
  const groupedDirectoryTracks = useMemo(() => [
    {
      key: "indoor",
      title: "Indoor tracks",
      tracks: filteredTracks.filter((track) => isIndoorTrack(track))
    },
    {
      key: "outdoor",
      title: "Outdoor tracks",
      tracks: filteredTracks.filter((track) => !isIndoorTrack(track))
    }
  ].filter((group) => group.tracks.length), [filteredTracks]);
  const myLapsLayoutOptions = getTrackLayouts(myLapsTrackId);
  const myLapsLayoutFilter = myLapsLayoutOptions.length > 1 ? myLapsLayout : ALL_LAYOUTS;
  const myLapsWithDeltas = useMemo(
    () => getLapsForTrack(lapTimes, account.username, myLapsTrackId, myLapsSort, myLapsLayoutFilter),
    [lapTimes, account.username, myLapsTrackId, myLapsSort, myLapsLayoutFilter]
  );
  const bestVisibleLapMs = myLapsWithDeltas.length
    ? Math.min(...myLapsWithDeltas.map((lap) => lap.ms))
    : null;
  const selectedTrackMastery = getTrackMastery(lapTimes, account.username, myLapsTrackId);
  const myLapsTotalPages = Math.max(1, Math.ceil(myLapsWithDeltas.length / myLapsPageSize));
  const currentMyLapsPage = Math.min(myLapsPage, myLapsTotalPages);
  const pagedMyLaps = myLapsWithDeltas.slice(
    (currentMyLapsPage - 1) * myLapsPageSize,
    currentMyLapsPage * myLapsPageSize
  );
  const pagedMyLapsWithDeltas = addDisplayDeltas(pagedMyLaps);
  const selectedFormTrack = findTrackByName(formTrackName);
  const availableLayouts = useMemo(
    () => getTrackLayouts(selectedFormTrack?.id),
    [selectedFormTrack?.id]
  );
  const level = getPlayerLevel(lapTimes, account.username, leagueBonusXp);
  const xp = getPlayerXp(lapTimes, account.username) + leagueBonusXp;
  const levelProgress = getLevelProgress(lapTimes, account.username, leagueBonusXp);
  const navbarTime = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
  const sharedStatusLabel = backendStatus === "connected"
    ? `${supabaseEnabled ? `Supabase public data connected / ${supabaseSession?.user ? "signed in for publishing" : "sign in to publish"}` : "Shared backend connected"}${lastSharedSync ? ` / ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(lastSharedSync))}` : ""}`
    : backendStatus === "checking"
      ? `Checking ${supabaseEnabled ? "Supabase" : "shared backend"}`
      : `Local-only mode${backendStatusDetail ? ` / ${backendStatusDetail}` : ""}`;
  const authStatusLabel = authStatus === "signed-in"
    ? `signed in as ${supabaseSession?.user?.email}`
    : authStatus === "signed-out"
      ? "signed out. Public leaderboards can load, but publishing needs sign-in."
      : authStatus;
  const verificationCooldownSeconds = Math.max(0, Math.ceil((verificationCooldownUntil - now.getTime()) / 1000));
  const missingSupabaseEnv = {
    url: !supabaseUrl,
    anonKey: !supabaseAnonKey
  };
  const supabaseHost = getSafeHost(supabaseUrl);
  const anonKeyLooksValid = looksLikeSupabaseAnonKey(supabaseAnonKey);
  const showProductionSupabaseWarning = isProductionBuild && !supabaseEnabled;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    saveStored("lapboard-theme", theme);
    const nextThemeStyle = getThemeStyle({ ...defaultTheme, ...theme });
    Object.entries(nextThemeStyle).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    document.body.style.background = nextThemeStyle["--background"];
  }, [theme]);

  useEffect(() => {
    saveStored("lapboard-league-memberships", leagueMemberships);
  }, [leagueMemberships]);

  useEffect(() => {
    saveStored("lapboard-league-results", leagueResults);
  }, [leagueResults]);

  useEffect(() => {
    saveStored("lapboard-media", mediaEntries.filter((entry) => entry.type === "link"));
  }, [mediaEntries]);

  useEffect(() => {
    saveStored("lapboard-teams", teams);
  }, [teams]);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return undefined;

    let active = true;
    const authParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authErrorCode = authParams.get("error_code");
    const authError = authParams.get("error");
    const authDescription = authParams.get("error_description");

    if (authErrorCode || authError) {
      const detail = authErrorCode === "otp_expired"
        ? "That verification link expired. Resend the verification email, then open the newest link."
        : authDescription || "Supabase could not complete that sign-in link.";
      setAuthRedirectError(detail);
      setMessage(detail);
      setAuthStatus("signed-out");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    getCurrentSupabaseSession()
      .then(async (session) => {
        if (!active) return;
        setSupabaseSession(session);
        if (session?.user) {
          await loadSupabaseAccount(session);
          setAuthStatus("signed-in");
          setSharedConnected();
        } else {
          setAuthStatus("signed-out");
        }
      })
      .catch(() => {
        if (active) setAuthStatus("error");
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      if (session?.user) {
        loadSupabaseAccount(session).then(() => {
          setAuthStatus("signed-in");
          setSharedConnected();
        }).catch(() => setAuthStatus("error"));
      } else {
        setAuthStatus("signed-out");
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    syncSharedData();
    const timer = window.setInterval(() => {
      if (active) syncSharedData();
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (backendStatus !== "connected") return;
    if (supabaseEnabled && !supabaseSession?.user) return;
    publishSharedLaps(lapTimes);
  }, [backendStatus, lapTimes, supabaseSession?.user?.id]);

  useEffect(() => {
    saveStored("lapboard-auto-publish-laps", autoPublishLaps);
  }, [autoPublishLaps]);

  useEffect(() => {
    if (!autoPublishLaps || backendStatus !== "connected") return;
    if (supabaseEnabled && !supabaseSession?.user) return;
    publishOwnLaps("all", { silent: true });
  }, [autoPublishLaps, backendStatus, lapTimes, account.username, supabaseSession?.user?.id]);

  useEffect(() => {
    if (backendStatus !== "connected") return;
    if (supabaseEnabled && !supabaseSession?.user) return;
    if (suppressLeaguePublishRef.current) return;
    leagueMemberships
      .filter((membership) => membership.player.toLowerCase() === account.username.toLowerCase())
      .forEach((membership) => publishLeagueMembership(membership));
  }, [backendStatus, leagueMemberships, account.username, supabaseSession?.user?.id]);

  useEffect(() => {
    if (!showOnboarding) return;
    setOnboardingUsername(account.username === "You" ? "" : account.username);
    setOnboardingCity(account.city || "");
    setOnboardingBio(account.bio || "Karting profile");
    setOnboardingHomeTrackId(account.homeTrackId || tracks[0]?.id || "");
    setOnboardingExperience(account.kartExperience || "casual");
    setOnboardingThemeMode(theme.mode || "light");
    setOnboardingAccent(theme.accent || defaultTheme.accent);
  }, [account.username, showOnboarding]);

  useEffect(() => {
    if (!availableLayouts.includes(layout)) {
      setLayout(availableLayouts[0] || "Main layout");
    }
  }, [availableLayouts, layout]);

  useEffect(() => {
    setMyLapsPage(1);
  }, [myLapsTrackId, myLapsLayout, myLapsSort, myLapsPageSize, account.username]);

  useEffect(() => {
    if (leaderboardLayout !== ALL_LAYOUTS && !leaderboardLayoutOptions.includes(leaderboardLayout)) {
      setLeaderboardLayout(ALL_LAYOUTS);
    }
  }, [leaderboardLayout, leaderboardLayoutOptions]);

  useEffect(() => {
    if (myLapsLayout !== ALL_LAYOUTS && !myLapsLayoutOptions.includes(myLapsLayout)) {
      setMyLapsLayout(ALL_LAYOUTS);
    }
  }, [myLapsLayout, myLapsLayoutOptions]);

  useEffect(() => {
    if (!resultLeagueKey && userLeagueMemberships.length) {
      const membership = userLeagueMemberships[0];
      setResultLeagueKey(`${membership.leagueId}:${membership.trackId}`);
      setResultDate(getLeague(membership.leagueId)?.dates?.[0]?.date || "");
    }
  }, [resultLeagueKey, userLeagueMemberships]);

  function persistAccounts(nextAccounts, nextCurrentUser = currentUser) {
    const normalizedAccounts = nextAccounts.map((item) => ({
      ...normalizeAccount(item.username || ""),
      ...item,
      friends: Array.isArray(item.friends) ? item.friends : []
    })).filter((item) => item.username);

    setAccounts(normalizedAccounts);
    setCurrentUser(nextCurrentUser);
    saveStored("lapboard-accounts", normalizedAccounts);
    saveStored("lapboard-current-user", nextCurrentUser);
  }

  function persistLapTimes(nextLapTimes) {
    setLapTimes(nextLapTimes);
    saveStored("lapboard-times", nextLapTimes);
  }

  async function loadSupabaseAccount(session, fallbackUsername = "") {
    if (!supabaseEnabled || !session?.user) return null;

    let profile = await getProfile(session.user.id);
    if (!profile) {
      profile = await upsertProfile(session.user, {
        username: fallbackUsername || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "Driver",
        onboardingComplete: false
      });
    }

    const remoteAccount = profileToAccount(profile, session.user.email);
    const nextAccounts = mergeById(
      accounts.map((item) => ({ ...item, id: item.username })),
      [{ ...remoteAccount, id: remoteAccount.username }]
    ).map(({ id, ...item }) => item);
    persistAccounts(nextAccounts, remoteAccount.username);
    return remoteAccount;
  }

  async function saveSupabaseProfile(accountPatch = {}) {
    if (!supabaseEnabled || !supabaseSession?.user) return null;
    const profile = await upsertProfile(supabaseSession.user, {
      ...account,
      ...accountPatch
    });
    const remoteAccount = profileToAccount(profile, supabaseSession.user.email);
    persistAccounts(
      accounts.map((item) => item.username === account.username ? { ...item, ...remoteAccount } : item),
      remoteAccount.username
    );
    return remoteAccount;
  }

  function setSharedFailure(error, fallback = "Shared sync failed") {
    const detail = error?.message || fallback;
    const isSupabaseAuthReadinessError = supabaseEnabled && detail.startsWith("Sign in before ");

    if (isSupabaseAuthReadinessError) {
      setBackendStatus("connected");
      setBackendStatusDetail(detail);
      setLastSharedError(detail);
      saveStored("lapboard-last-shared-error", detail);
      setMessage(detail);
      return;
    }

    setBackendStatus("local-only");
    setBackendStatusDetail(detail);
    setLastSharedError(detail);
    saveStored("lapboard-last-shared-error", detail);
    setMessage(detail);
  }

  function setSharedConnected() {
    setBackendStatus("connected");
    setBackendStatusDetail("");
    setLastSharedError("");
    saveStored("lapboard-last-shared-error", "");
  }

  function setSharedOperationFailure(error, fallback = "Shared action failed") {
    const detail = error?.message || fallback;
    if (supabaseEnabled) setBackendStatus("connected");
    setBackendStatusDetail(detail);
    setLastSharedError(detail);
    saveStored("lapboard-last-shared-error", detail);
    setMessage(detail);
  }

  function clearSharedError() {
    setBackendStatusDetail("");
    setLastSharedError("");
    saveStored("lapboard-last-shared-error", "");
    if (supabaseEnabled) setBackendStatus("connected");
  }

  async function getSupabaseWriteSession() {
    if (!supabaseEnabled) return null;
    if (supabaseSession?.user) return supabaseSession;

    const session = await getCurrentSupabaseSession();
    if (session?.user) {
      setSupabaseSession(session);
      setAuthStatus("signed-in");
      setSharedConnected();
      return session;
    }

    setAuthStatus("signed-out");
    return null;
  }

  async function handleSupabaseAuth(event) {
    event.preventDefault();
    const email = authEmail.trim();
    const username = newAccountName.trim();
    const password = newAccountPassword.trim();
    const creatingAccount = authMode === "create-account";

    if (!email || password.length < 6 || (creatingAccount && !username)) {
      setMessage(creatingAccount
        ? "Enter an email, username, and at least 6 password characters."
        : "Enter your email and at least 6 password characters.");
      return;
    }

    try {
      const result = creatingAccount
        ? await signUpWithSupabase({ email, password, username })
        : await signInWithSupabase({ email, password });
      if (!result.session) {
        setMessage("Account created. Check your email to verify it, then sign in.");
        setVerificationCooldownUntil(Date.now() + 120000);
        setAuthMode("sign-in");
        return;
      }

      setSupabaseSession(result.session);
      setAuthStatus("signed-in");
      setSharedConnected();
      const remoteAccount = await loadSupabaseAccount(result.session, username);
      setAuthEmail("");
      setNewAccountPassword("");
      setNewAccountName("");
      setShowOnboarding(!remoteAccount?.onboardingComplete);
      setMessage(result.created ? "Account created and signed in." : "Signed in.");
      syncSharedData({ showMessage: false });
    } catch (error) {
      const detail = error.message || (creatingAccount ? "Could not create account." : "Sign in failed.");
      if (/could not reach supabase|failed to fetch/i.test(detail)) setAuthRedirectError(detail);
      setMessage(detail);
    }
  }

  async function handleSupabaseSignOut() {
    try {
      await signOutSupabase();
      setSupabaseSession(null);
      setAuthStatus("signed-out");
      setMessage("Signed out of Supabase.");
    } catch (error) {
      setMessage(error.message || "Could not sign out.");
    }
  }

  async function resendConfirmationEmail() {
    const email = authEmail.trim();
    if (!email) {
      setMessage("Enter the email you used for the account first.");
      return;
    }

    if (verificationCooldownSeconds > 0) {
      setMessage(`Wait ${Math.ceil(verificationCooldownSeconds / 60)} minute${Math.ceil(verificationCooldownSeconds / 60) === 1 ? "" : "s"} before resending verification.`);
      return;
    }

    try {
      await resendSupabaseConfirmation(email);
      setVerificationCooldownUntil(Date.now() + 120000);
      setMessage(`Sent another confirmation email to ${email}. Check spam/promotions if it does not show up.`);
    } catch (error) {
      const detail = error.message || "Could not resend the confirmation email.";
      if (/could not reach supabase|failed to fetch/i.test(detail)) {
        setAuthRedirectError(detail);
        setMessage(detail);
        return;
      }

      if (/rate limit/i.test(detail)) {
        setVerificationCooldownUntil(Date.now() + 600000);
        setMessage("Supabase email rate limit was reached. Wait about 10 minutes before trying again, or configure custom SMTP for higher limits.");
        return;
      }

      setMessage(detail);
    }
  }

  async function runSupabaseConnectionTest() {
    setSupabaseTestResult("Testing Supabase connection...");
    const result = await testSupabaseConnection();
    setSupabaseTestResult(result.detail);
    setMessage(result.detail);
  }

  async function syncSharedData({ showMessage = false } = {}) {
    try {
      if (import.meta.env.PROD && !supabaseEnabled && !API_BASE_URL) {
        throw new Error("Supabase env vars are missing in Vercel.");
      }

      if (supabaseEnabled) {
        const data = await loadSupabaseBootstrap();
        const sharedLaps = Array.isArray(data.laps) ? data.laps : [];

        sharedLaps.forEach((lap) => sharedLapIdsRef.current.add(String(lap.id)));
        setLapTimes((current) => {
          const nextLapTimes = mergeById(current, sharedLaps);
          saveStored("lapboard-times", nextLapTimes);
          return nextLapTimes;
        });
        setMediaEntries((current) => {
          const nextMediaEntries = mergeById(current, Array.isArray(data.media) ? data.media : []);
          saveStored("lapboard-media", nextMediaEntries.filter((entry) => entry.type === "link"));
          return nextMediaEntries;
        });
        setTeams((current) => {
          const nextTeams = mergeById(current, Array.isArray(data.teams) ? data.teams : []);
          saveStored("lapboard-teams", nextTeams);
          return nextTeams;
        });
        setLeagueMemberships((current) => {
          const sharedMemberships = Array.isArray(data.leagueMemberships) ? data.leagueMemberships : [];
          sharedMemberships.forEach((membership) => sharedLeagueMembershipIdsRef.current.add(String(membership.id)));
          const nextMemberships = mergeById(current, sharedMemberships);
          saveStored("lapboard-league-memberships", nextMemberships);
          return nextMemberships;
        });
        setSharedConnected();
        setLastSharedSync(new Date().toISOString());
        if (showMessage) {
          setMessage(`Synced ${sharedLaps.length} shared lap${sharedLaps.length === 1 ? "" : "s"} from Supabase.`);
        }
        return true;
      }

      const data = await requestSharedApi("/api/bootstrap");
      const sharedLaps = Array.isArray(data.laps) ? data.laps : [];

      sharedLaps.forEach((lap) => sharedLapIdsRef.current.add(String(lap.id)));
      setLapTimes((current) => {
        const nextLapTimes = mergeById(current, sharedLaps);
        saveStored("lapboard-times", nextLapTimes);
        return nextLapTimes;
      });
      setMediaEntries((current) => {
        const nextMediaEntries = mergeById(current, Array.isArray(data.media) ? data.media : []);
        saveStored("lapboard-media", nextMediaEntries.filter((entry) => entry.type === "link"));
        return nextMediaEntries;
      });
      setTeams((current) => {
        const nextTeams = mergeById(current, Array.isArray(data.teams) ? data.teams : []);
        saveStored("lapboard-teams", nextTeams);
        return nextTeams;
      });
      setLeagueMemberships((current) => {
        const sharedMemberships = Array.isArray(data.leagueMemberships) ? data.leagueMemberships : [];
        sharedMemberships.forEach((membership) => sharedLeagueMembershipIdsRef.current.add(String(membership.id)));
        const nextMemberships = mergeById(current, sharedMemberships);
        saveStored("lapboard-league-memberships", nextMemberships);
        return nextMemberships;
      });
      setSharedConnected();
      setLastSharedSync(new Date().toISOString());
      if (showMessage) {
        setMessage(`Synced ${sharedLaps.length} shared lap${sharedLaps.length === 1 ? "" : "s"} from the backend.`);
      }
      return true;
    } catch (error) {
      setBackendStatus("local-only");
      const detail = supabaseEnabled
        ? error.message || "Supabase sync failed"
        : error.message || "Shared backend unavailable";
      setBackendStatusDetail(detail);
      setLastSharedError(detail);
      saveStored("lapboard-last-shared-error", detail);
      if (showMessage) {
        setMessage(supabaseEnabled ? `Supabase sync failed: ${detail}` : `Could not reach the shared backend: ${detail}`);
      }
      return false;
    }
  }

  async function publishSharedLaps(lapsToPublish) {
    if (suppressLapPublishRef.current) return;
    const writeSession = supabaseEnabled ? await getSupabaseWriteSession() : null;
    if (supabaseEnabled && !writeSession?.user) {
      setSharedOperationFailure(
        new Error("Sign in with Supabase to upload laps. Your laps were saved locally."),
        "Sign in with Supabase to upload laps."
      );
      return;
    }

    const publicLaps = getPublicLaps(lapsToPublish)
      .filter((lap) => !supabaseEnabled || lap.player.toLowerCase() === account.username.toLowerCase())
      .filter((lap) => !sharedLapIdsRef.current.has(String(lap.id)));
    if (!publicLaps.length) return;

    publicLaps.forEach((lap) => sharedLapIdsRef.current.add(String(lap.id)));

    try {
      if (supabaseEnabled) {
        const savedLaps = await publishSupabaseLaps(publicLaps, writeSession.user.id);
        setLapTimes((current) => mergeById(current, savedLaps));
        setSharedConnected();
        return;
      }

      await requestSharedApi("/api/laps", {
        method: "POST",
        body: JSON.stringify({ laps: publicLaps })
      });
      setSharedConnected();
    } catch (error) {
      publicLaps.forEach((lap) => sharedLapIdsRef.current.delete(String(lap.id)));
      if (supabaseEnabled) {
        setSharedOperationFailure(error, "Could not publish laps to Supabase.");
        return;
      }
      setSharedFailure(error, "Could not publish laps.");
    }
  }

  function publishOwnLaps(scope = "track", { silent = false } = {}) {
    const matchingLaps = lapTimes.filter((lap) => (
      lap.player.toLowerCase() === account.username.toLowerCase()
      && (scope === "all" || (lap.trackId === myLapsTrackId && layoutMatches(lap, myLapsLayoutFilter)))
    ));

    if (!matchingLaps.length) {
      if (!silent) setMessage(scope === "all" ? "You do not have any laps to publish yet." : `No laps found for ${getTrackName(myLapsTrackId)}.`);
      return;
    }

    const matchingIds = new Set(matchingLaps.map((lap) => String(lap.id)));
    const needsVisibilityUpdate = matchingLaps.some((lap) => lap.visibility === "private");
    const nextLapTimes = needsVisibilityUpdate
      ? lapTimes.map((lap) => (
        matchingIds.has(String(lap.id)) ? { ...lap, visibility: "public" } : lap
      ))
      : lapTimes;
    const lapsToPublish = nextLapTimes
      .filter((lap) => matchingIds.has(String(lap.id)))
      .map((lap) => ({ ...lap, visibility: "public" }));

    if (needsVisibilityUpdate) persistLapTimes(nextLapTimes);
    publishSharedLaps(lapsToPublish);
    if (!silent) setMessage(
      scope === "all"
        ? `Publishing ${lapsToPublish.length} of your laps to the shared leaderboards.`
        : `Publishing ${lapsToPublish.length} ${getTrackName(myLapsTrackId)} lap${lapsToPublish.length === 1 ? "" : "s"} to the shared leaderboard.`
    );
  }

  async function publishSharedMedia(entry) {
    try {
      if (supabaseEnabled) {
        if (!supabaseSession?.user) throw new Error("Sign in before publishing media.");
        const savedEntry = await publishSupabaseMedia(entry, supabaseSession.user.id);
        setMediaEntries((current) => mergeById(current, [savedEntry]));
        setSharedConnected();
        return;
      }

      const saved = await requestSharedApi("/api/media", {
        method: "POST",
        body: JSON.stringify({ entry })
      });
      if (saved.entry) setMediaEntries((current) => mergeById(current, [saved.entry]));
      setSharedConnected();
    } catch (error) {
      setSharedFailure(error, "Could not publish media.");
    }
  }

  async function requestTeamUpdate(path, options = {}) {
    try {
      if (supabaseEnabled) {
        if (!supabaseSession?.user) throw new Error("Sign in before changing teams.");
        return null;
      }

      const saved = await requestSharedApi(path, options);
      if (saved.team) setTeams((current) => mergeById(current, [saved.team]));
      setSharedConnected();
      return saved;
    } catch (error) {
      setSharedFailure(error, "Could not update team.");
      return null;
    }
  }

  async function publishLeagueMembership(membership) {
    if (!membership?.id || sharedLeagueMembershipIdsRef.current.has(String(membership.id))) return;
    sharedLeagueMembershipIdsRef.current.add(String(membership.id));

    try {
      if (supabaseEnabled) {
        if (!supabaseSession?.user) throw new Error("Sign in before joining public leagues.");
        const savedMembership = await publishSupabaseLeagueMembership(membership, supabaseSession.user.id);
        setLeagueMemberships((current) => mergeById(current, [savedMembership]));
        setSharedConnected();
        return;
      }

      const saved = await requestSharedApi("/api/league-memberships", {
        method: "POST",
        body: JSON.stringify({ membership })
      });
      if (saved.membership) setLeagueMemberships((current) => mergeById(current, [saved.membership]));
      setSharedConnected();
    } catch (error) {
      sharedLeagueMembershipIdsRef.current.delete(String(membership.id));
      if (supabaseEnabled) {
        setSharedOperationFailure(error, "Could not publish league membership to Supabase.");
        return;
      }
      setSharedFailure(error, "Could not publish league membership.");
    }
  }

  async function deleteSharedLeagueMembership(membershipId) {
    try {
      if (supabaseEnabled) {
        await deleteSupabaseLeagueMembership(membershipId);
        sharedLeagueMembershipIdsRef.current.delete(String(membershipId));
        setSharedConnected();
        return;
      }

      await requestSharedApi(`/api/league-memberships/${encodeURIComponent(membershipId)}`, { method: "DELETE" });
      sharedLeagueMembershipIdsRef.current.delete(String(membershipId));
      setSharedConnected();
    } catch (error) {
      if (supabaseEnabled) {
        setSharedOperationFailure(error, "Could not delete league membership in Supabase.");
        return;
      }
      setSharedFailure(error, "Could not delete league membership.");
    }
  }

  function openOnboarding(step = 0) {
    setOnboardingStep(step);
    setShowOnboarding(true);
  }

  function finishOnboarding({ skipped = false } = {}) {
    const nextUsername = skipped
      ? account.username
      : (onboardingUsername.trim() || account.username);
    const nextPassword = onboardingPassword.trim();
    const selectedHomeTrack = getTrack(onboardingHomeTrackId) || tracks[0];

    if (!skipped && !nextUsername) {
      setMessage("Choose a username to finish onboarding.");
      setOnboardingStep(1);
      return;
    }

    const usernameTaken = accounts.some((item) => (
      item.username.toLowerCase() === nextUsername.toLowerCase()
      && item.username !== account.username
    ));

    if (!skipped && usernameTaken) {
      setMessage("That username already exists.");
      setOnboardingStep(1);
      return;
    }

    if (!skipped && !hasPassword(account) && nextPassword.length < 4) {
      setMessage("Use at least 4 characters for your account password.");
      setOnboardingStep(1);
      return;
    }

    const passwordFields = nextPassword.length >= 4 ? buildPasswordFields(nextPassword) : {};
    const shouldCreateCleanAccount = (
      !skipped
      && !account.onboardingComplete
      && account.username === "You"
      && nextUsername.toLowerCase() !== account.username.toLowerCase()
    );
    const onboardedAccount = {
      ...normalizeAccount(nextUsername),
      ...passwordFields,
      city: skipped ? account.city : onboardingCity.trim(),
      bio: skipped ? account.bio : onboardingBio.trim() || "Karting profile",
      homeTrackId: skipped ? account.homeTrackId : selectedHomeTrack?.id || "",
      kartExperience: skipped ? account.kartExperience : onboardingExperience,
      onboardingComplete: true
    };
    const updatedAccounts = shouldCreateCleanAccount
      ? [...accounts, onboardedAccount]
      : accounts.map((item) => {
        if (item.username !== account.username) return item;
        return {
          ...item,
          ...onboardedAccount,
          friends: Array.isArray(item.friends) ? item.friends : []
        };
      });

    if (nextUsername !== account.username && !shouldCreateCleanAccount) {
      persistLapTimes(lapTimes.map((lap) => (
        lap.player === account.username ? { ...lap, player: nextUsername } : lap
      )));
    }

    if (!skipped) {
      const matchedOnboardingPreset = themePresets.find((preset) => (
        preset.theme.mode === onboardingThemeMode
        && preset.theme.accent.toLowerCase() === onboardingAccent.toLowerCase()
      ))?.theme;
      const onboardingBaseTheme = matchedOnboardingPreset || (onboardingThemeMode === "dark" ? themePresets[2].theme : themePresets[0].theme);
      setTheme((current) => ({
        ...onboardingBaseTheme,
        mode: onboardingThemeMode,
        accent: onboardingAccent
      }));

      if (selectedHomeTrack) {
        setFormTrackName(selectedHomeTrack.name);
        setTrackQuery(selectedHomeTrack.name);
        setMyLapsTrackId(selectedHomeTrack.id);
      }
    }

    persistAccounts(updatedAccounts, nextUsername);
    if (supabaseEnabled && supabaseSession?.user && !skipped) {
      saveSupabaseProfile({
        username: nextUsername,
        city: onboardingCity.trim(),
        bio: onboardingBio.trim() || "Karting profile",
        homeTrackId: selectedHomeTrack?.id || "",
        kartExperience: onboardingExperience,
        onboardingComplete: true
      }).catch((error) => setMessage(error.message || "Could not save Supabase profile."));
    }
    saveStored("lapboard-onboarding-complete", true);
    setOnboardingPassword("");
    setShowOnboarding(false);
    setActiveTab("leaderboard");
    setMessage(skipped ? "Onboarding skipped. You can update your profile any time." : "Welcome to LapBoard. Your profile is ready.");
  }

  function joinLeague(leagueId) {
    const league = getLeague(leagueId);
    const leagueLocations = getLeagueLocations(league);
    const selectedJoinTrackId = leagueLocations.some((track) => track.id === joinTrackId)
      ? joinTrackId
      : leagueLocations[0]?.id || "";

    if (!selectedJoinTrackId) {
      setMessage("Pick a location before joining.");
      return;
    }

    const alreadyJoined = leagueMemberships.some((membership) => (
      membership.player.toLowerCase() === account.username.toLowerCase()
      && membership.leagueId === leagueId
      && membership.trackId === selectedJoinTrackId
    ));

    if (alreadyJoined) {
      setMessage("You already joined that league at this location.");
      setJoiningLeagueId("");
      setLeagueTab("mine");
      return;
    }

    const nextMembership = {
      id: `${account.username}-${leagueId}-${selectedJoinTrackId}-${Date.now()}`,
      player: account.username,
      leagueId,
      trackId: selectedJoinTrackId,
      joinedAt: new Date().toISOString().slice(0, 10)
    };

    setLeagueMemberships((current) => [nextMembership, ...current]);
    publishLeagueMembership(nextMembership);
    setResultLeagueKey(`${leagueId}:${selectedJoinTrackId}`);
    setResultDate(league?.dates?.[0]?.date || "");
    setJoiningLeagueId("");
    setLeagueTab("mine");
    setMessage(`Joined ${league?.name || "league"} at ${getTrackName(selectedJoinTrackId)}.`);
  }

  function leaveLeague(membershipId) {
    const membership = leagueMemberships.find((item) => item.id === membershipId);
    setLeagueMemberships((current) => current.filter((item) => item.id !== membershipId));
    deleteSharedLeagueMembership(membershipId);
    if (resultLeagueKey === `${membership?.leagueId}:${membership?.trackId}`) {
      setResultLeagueKey("");
      setResultDate("");
    }
    setMessage(`Left ${getLeague(membership?.leagueId)?.name || "league"}${membership?.trackId ? ` at ${getTrackName(membership.trackId)}` : ""}.`);
  }

  function addLeagueResult(event) {
    event.preventDefault();
    const [leagueId, trackId] = resultLeagueKey.split(":");

    if (!leagueId || !trackId || !resultDate) {
      setMessage("Choose a league and date before adding a result.");
      return;
    }

    const newResult = {
      id: Date.now(),
      player: account.username,
      leagueId,
      trackId,
      date: resultDate,
      finish: resultFinish.trim(),
      points: resultPoints.trim(),
      notes: resultNotes.trim()
    };

    setLeagueResults((current) => [newResult, ...current]);
    setResultFinish("");
    setResultPoints("");
    setResultNotes("");
    setMessage(`League result added for ${formatDate(resultDate)}. LR updated.`);
  }

  function handleK1LapImport(event) {
    event?.preventDefault();
    const selectedTrack = findTrackByName(formTrackName);
    const parsedLaps = parseK1LapPaste(k1LapText);

    if (!selectedTrack) {
      setMessage("Pick a track before importing K1 laps.");
      return;
    }

    if (!parsedLaps.length) {
      setMessage("Paste laps like (01) 66.128 | (02) 65.510.");
      return;
    }

    const firstLapNumber = getNextLapNumber(lapTimes, account.username, selectedTrack.id);
    const importedLaps = parsedLaps.map((ms, index) => ({
      id: Date.now() + index,
      player: account.username,
      trackId: selectedTrack.id,
      kart,
      ms,
      date: k1LapDate || new Date().toISOString().slice(0, 10),
      lapNumber: firstLapNumber + index,
      layout,
      visibility: "public"
    }));

    persistLapTimes([...importedLaps, ...lapTimes]);
    publishSharedLaps(importedLaps);
    setTrackQuery(selectedTrack.name);
    setMyLapsTrackId(selectedTrack.id);
    setK1LapText("");
    setShowK1Importer(false);
    setMessage(`Imported ${importedLaps.length} K1 lap${importedLaps.length === 1 ? "" : "s"} for ${selectedTrack.name}.`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const selectedTrack = findTrackByName(formTrackName);
    const nextMs = parseLapTime(minutes, seconds, milliseconds);

    if (!selectedTrack) {
      setMessage("Pick a track from the track search suggestions.");
      return;
    }

    if (!kart || Number.isNaN(nextMs) || nextMs <= 0) {
      setMessage("Enter a kart class and a valid lap time.");
      return;
    }

    const newLap = {
      id: Date.now(),
      player: account.username,
      trackId: selectedTrack.id,
      kart,
      ms: nextMs,
      date: new Date().toISOString().slice(0, 10),
      lapNumber: getNextLapNumber(lapTimes, account.username, selectedTrack.id),
      layout,
      visibility: "public"
    };

    const oldBest = getPersonalBests(lapTimes, account.username).find(
      (item) => item.track.id === selectedTrack.id
    )?.best;
    const nextLapTimes = [newLap, ...lapTimes];

    persistLapTimes(nextLapTimes);
    publishSharedLaps([newLap]);
    setTrackQuery(selectedTrack.name);
    setMyLapsTrackId(selectedTrack.id);
    setActiveTab("leaderboard");

    if (!oldBest || nextMs < oldBest.ms) {
      setMessage(`New personal best at ${selectedTrack.name}: ${formatTime(nextMs)}.`);
    } else {
      setMessage(`Lap added at ${selectedTrack.name}: ${formatTime(nextMs)}.`);
    }
  }

  function changeMyLapsSort(key) {
    setMyLapsSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  function updateTheme(key, value) {
    setTheme((current) => {
      if (key === "mode") {
        const preset = value === "dark" ? themePresets[2].theme : themePresets[0].theme;
        return {
          ...current,
          ...preset,
          accent: current.accent || preset.accent
        };
      }
      return { ...current, [key]: value };
    });
  }

  function applyThemePreset(presetTheme) {
    setTheme({ ...presetTheme });
  }

  function updateNumber(setter, maxLength) {
    return (event) => {
      const value = event.target.value.replace(/\D/g, "").slice(0, maxLength);
      setter(value);
    };
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const text = await file.text();
    const { laps, errors } = parseLapCsv(text);

    if (!laps.length) {
      setMessage(errors[0] || "No valid laps found in that CSV.");
      return;
    }

    const importedDrivers = [...new Set(laps.map((lap) => lap.player))];
    const nextAccounts = [...accounts];

    importedDrivers.forEach((username) => {
      const exists = nextAccounts.some((item) => item.username.toLowerCase() === username.toLowerCase());
      if (!exists) nextAccounts.push(normalizeAccount(username));
    });

    persistAccounts(nextAccounts);
    persistLapTimes([...laps, ...lapTimes]);
    publishSharedLaps(laps);
    setTrackQuery(getTrackName(laps[0].trackId));
    setMyLapsTrackId(laps[0].trackId);
    setMessage(`Imported ${laps.length} lap${laps.length === 1 ? "" : "s"} from ${file.name}.${errors.length ? ` ${errors.length} row${errors.length === 1 ? "" : "s"} skipped.` : ""}`);
  }

  async function handleProfilePhotoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file for your profile picture.");
      return;
    }

    const avatar = await readImageFile(file);
    const updatedAccounts = accounts.map((item) => (
      item.username === account.username ? { ...item, avatar } : item
    ));

    persistAccounts(updatedAccounts, account.username);
    if (supabaseEnabled && supabaseSession?.user) {
      saveSupabaseProfile({ avatar }).catch((error) => setMessage(error.message || "Could not save profile picture to Supabase."));
    }
    setMessage("Profile picture updated.");
  }

  function createAccount(event) {
    if (supabaseEnabled) {
      handleSupabaseAuth(event);
      return;
    }

    event.preventDefault();
    const username = newAccountName.trim();
    const password = newAccountPassword.trim();
    if (!username) return;

    const existing = accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      if (!verifyPassword(existing, password)) {
        setMessage("Incorrect password for that account.");
        return;
      }

      const nextAccounts = !hasPassword(existing) && password.length >= 4
        ? accounts.map((item) => item.username === existing.username ? { ...item, ...buildPasswordFields(password) } : item)
        : accounts;

      persistAccounts(nextAccounts, existing.username);
      setNewAccountName("");
      setNewAccountPassword("");
      if (!existing.onboardingComplete) {
        setOnboardingUsername(existing.username);
        setOnboardingPassword("");
        openOnboarding(hasPassword(existing) || password.length >= 4 ? 2 : 1);
      }
      return;
    }

    if (password.length < 4) {
      setMessage("Use at least 4 characters for a new account password.");
      return;
    }

    const nextAccount = {
      ...normalizeAccount(username),
      ...buildPasswordFields(password),
      onboardingComplete: false
    };
    persistAccounts([...accounts, nextAccount], nextAccount.username);
    setNewAccountName("");
    setNewAccountPassword("");
    setOnboardingUsername(nextAccount.username);
    setOnboardingPassword("");
    openOnboarding(2);
  }

  function updateCurrentPassword(event) {
    event.preventDefault();
    const nextPassword = newPassword.trim();

    if (supabaseEnabled && supabase) {
      if (nextPassword.length < 6) {
        setMessage("Use at least 6 characters for the new Supabase password.");
        return;
      }

      supabase.auth.updateUser({ password: nextPassword })
        .then(({ error }) => {
          if (error) throw error;
          setCurrentPassword("");
          setNewPassword("");
          setMessage("Supabase password updated.");
        })
        .catch((error) => setMessage(error.message || "Could not update Supabase password."));
      return;
    }

    if (hasPassword(account) && !verifyPassword(account, currentPassword)) {
      setMessage("Current password is incorrect.");
      return;
    }

    if (nextPassword.length < 4) {
      setMessage("Use at least 4 characters for the new password.");
      return;
    }

    const securedAccounts = accounts.map((item) => (
      item.username === account.username ? { ...item, ...buildPasswordFields(nextPassword) } : item
    ));

    persistAccounts(securedAccounts, account.username);
    setCurrentPassword("");
    setNewPassword("");
    setMessage(`Password updated for ${account.username}.`);
  }

  function renameAccount(event) {
    event.preventDefault();
    const nextUsername = renameValue.trim();
    if (!nextUsername || nextUsername.toLowerCase() === account.username.toLowerCase()) return;

    const usernameTaken = accounts.some((item) => item.username.toLowerCase() === nextUsername.toLowerCase());
    if (usernameTaken) {
      setMessage("That username already exists.");
      return;
    }

    const renamedAccounts = accounts.map((item) => {
      const friends = Array.isArray(item.friends) ? item.friends : [];
      if (item.username === account.username) {
        return { ...item, username: nextUsername };
      }
      return {
        ...item,
        friends: friends.map((friend) => friend === account.username ? nextUsername : friend)
      };
    });
    const renamedLapTimes = lapTimes.map((lap) => (
      lap.player === account.username ? { ...lap, player: nextUsername } : lap
    ));

    persistAccounts(renamedAccounts, nextUsername);
    persistLapTimes(renamedLapTimes);
    if (supabaseEnabled && supabaseSession?.user) {
      saveSupabaseProfile({ username: nextUsername }).catch((error) => setMessage(error.message || "Could not rename Supabase profile."));
    }
    setRenameValue("");
    setMessage(`Username changed to ${nextUsername}.`);
  }

  function addFriend(event) {
    event.preventDefault();
    const username = friendName.trim();
    if (!username || username.toLowerCase() === account.username.toLowerCase()) return;

    const friendAccount = accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
    const accountToAdd = friendAccount || normalizeAccount(username);
    const nextAccounts = friendAccount ? accounts : [...accounts, accountToAdd];

    const withFriend = nextAccounts.map((item) => {
      const friends = Array.isArray(item.friends) ? item.friends : [];
      if (item.username !== account.username || friends.includes(accountToAdd.username)) return item;
      return { ...item, friends: [...friends, accountToAdd.username] };
    });

    persistAccounts(withFriend);
    setFriendName("");
  }

  function removeFriend(username) {
    const nextAccounts = accounts.map((item) => {
      if (item.username !== account.username) return item;
      const friends = Array.isArray(item.friends) ? item.friends : [];
      return { ...item, friends: friends.filter((friend) => friend !== username) };
    });

    persistAccounts(nextAccounts);
  }

  function clearLocalData() {
    persistLapTimes([]);
    persistAccounts([emptyAccount], "You");
    localStorage.setItem("lapboard-seed-version", `cleared-${SPLIT_SEED_VERSION}`);
    setMessage("Local laps, accounts, and friends were cleared.");
  }

  function exportLocalData() {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      currentUser,
      accounts: accounts.map(({ passwordHash, passwordSalt, ...publicAccount }) => publicAccount),
      lapTimes,
      leagueMemberships,
      leagueResults,
      mediaEntries: mediaEntries.filter((entry) => entry.type === "link"),
      teams,
      theme,
      autoPublishLaps
    };

    downloadJsonFile(`lapboard-export-${new Date().toISOString().slice(0, 10)}.json`, exportData);
    setMessage("LapBoard data exported. Passwords were not included.");
  }

  async function importLocalData(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.lapTimes)) {
        setMessage("That file does not look like a LapBoard export.");
        return;
      }

      const importedAccounts = Array.isArray(parsed.accounts)
        ? parsed.accounts.map((item) => normalizeAccount(item)).filter((item) => item.username)
        : [];
      const importedLapTimes = Array.isArray(parsed.lapTimes)
        ? parsed.lapTimes
          .filter((lap) => lap?.player && lap?.trackId && Number(lap.ms) > 0)
          .map((lap, index) => ({
            ...lap,
            id: String(lap.id || `imported-lap-${Date.now()}-${index}`),
            ms: Math.round(Number(lap.ms)),
            date: normalizeLapDate(lap.date),
            layout: lap.layout || "Main layout",
            visibility: lap.visibility === "private" ? "private" : "public"
          }))
        : [];
      const importedMemberships = Array.isArray(parsed.leagueMemberships)
        ? parsed.leagueMemberships.filter((membership) => membership?.player && membership?.leagueId && membership?.trackId)
        : [];
      const importedResults = Array.isArray(parsed.leagueResults)
        ? parsed.leagueResults.filter((result) => result?.player && result?.leagueId && result?.trackId && result?.date)
        : [];
      const importedMedia = Array.isArray(parsed.mediaEntries)
        ? parsed.mediaEntries.filter((entry) => entry?.title && entry?.url && entry?.type === "link")
        : [];
      const importedTeams = Array.isArray(parsed.teams)
        ? parsed.teams.filter((team) => team?.name && Array.isArray(team.members))
        : [];

      const nextAccounts = importedAccounts.length ? importedAccounts : [normalizeAccount(parsed.currentUser || account.username)];
      const nextCurrentUser = nextAccounts.some((item) => item.username === parsed.currentUser)
        ? parsed.currentUser
        : nextAccounts[0]?.username || account.username;
      const importWriteSession = supabaseEnabled ? await getSupabaseWriteSession() : null;
      const shouldPublishImportedLapsToSupabase = Boolean(importWriteSession?.user);
      if (shouldPublishImportedLapsToSupabase) suppressLapPublishRef.current = true;
      if (supabaseEnabled) suppressLeaguePublishRef.current = true;
      importedMemberships.forEach((membership) => {
        if (membership?.id) sharedLeagueMembershipIdsRef.current.add(String(membership.id));
      });

      persistAccounts(nextAccounts, nextCurrentUser);
      persistLapTimes(importedLapTimes);
      setLeagueMemberships(importedMemberships);
      setLeagueResults(importedResults);
      setMediaEntries(importedMedia);
      setTeams(importedTeams);
      if (parsed.theme && typeof parsed.theme === "object") setTheme({ ...defaultTheme, ...parsed.theme });
      setAutoPublishLaps(Boolean(parsed.autoPublishLaps));

      if (shouldPublishImportedLapsToSupabase) {
        const currentDriver = account.username.toLowerCase();
        const importedOwnSourceLaps = importedLapTimes
          .filter((lap) => lap.player.toLowerCase() === nextCurrentUser.toLowerCase() || lap.player.toLowerCase() === currentDriver);
        const importedOwnLaps = importedOwnSourceLaps
          .map((lap, index) => ({
            ...lap,
            id: `import-${importWriteSession.user.id}-${Date.now()}-${index}`,
            player: account.username,
            visibility: "public"
          }));

        try {
          const savedLaps = await publishSupabaseLaps(importedOwnLaps, importWriteSession.user.id);
          savedLaps.forEach((lap) => sharedLapIdsRef.current.add(String(lap.id)));
          importedOwnSourceLaps.forEach((lap) => sharedLapIdsRef.current.add(String(lap.id)));
          setSharedConnected();
          setMessage(`Imported ${importedLapTimes.length} lap${importedLapTimes.length === 1 ? "" : "s"} from ${file.name}. Published ${savedLaps.length} to Supabase.`);
        } catch (error) {
          const detail = error.message || "Supabase import publish failed";
          setSharedOperationFailure(error, "Supabase import publish failed");
          setMessage(`Imported locally, but Supabase publish failed: ${detail}`);
        } finally {
          window.setTimeout(() => {
            suppressLapPublishRef.current = false;
            suppressLeaguePublishRef.current = false;
          }, 0);
        }
      } else {
        window.setTimeout(() => {
          suppressLeaguePublishRef.current = false;
        }, 0);
        setMessage(
          supabaseEnabled
            ? `Imported ${importedLapTimes.length} lap${importedLapTimes.length === 1 ? "" : "s"} locally from ${file.name}. Sign in with Supabase to publish them.`
            : `Imported ${importedLapTimes.length} lap${importedLapTimes.length === 1 ? "" : "s"} from ${file.name}.`
        );
      }
    } catch {
      suppressLapPublishRef.current = false;
      suppressLeaguePublishRef.current = false;
      setMessage("Could not import that JSON file.");
    }
  }

  async function addMediaLink(event) {
    event.preventDefault();
    const title = mediaTitle.trim();
    const url = mediaUrl.trim();

    if (!title || !url) {
      setMessage("Add a title and video link first.");
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const nextEntry = {
      id: `media-link-${Date.now()}`,
      owner: account.username,
      title,
      url: normalizedUrl,
      type: "link",
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setMediaEntries((current) => [nextEntry, ...current]);
    publishSharedMedia(nextEntry);
    setMediaTitle("");
    setMediaUrl("");
    setMessage("Video link added to Media Center.");
  }

  function handleMediaFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMessage("Choose a video file for footage uploads.");
      return;
    }

    const nextEntry = {
      id: `media-file-${Date.now()}`,
      owner: account.username,
      title: mediaFileTitle.trim() || file.name,
      url: URL.createObjectURL(file),
      type: "file",
      fileName: file.name,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setMediaEntries((current) => [nextEntry, ...current]);
    setMediaFileTitle("");
    setMessage("Footage uploaded for this browser session.");
  }

  async function removeMediaEntry(entryId) {
    setMediaEntries((current) => current.filter((entry) => entry.id !== entryId));
    try {
      if (supabaseEnabled) {
        await deleteSupabaseMedia(entryId);
        setSharedConnected();
        return;
      }

      await requestSharedApi(`/api/media/${encodeURIComponent(entryId)}`, { method: "DELETE" });
      setSharedConnected();
    } catch (error) {
      setSharedFailure(error, "Could not delete media.");
    }
  }

  async function createTeam(event) {
    event.preventDefault();
    const name = teamName.trim();
    if (!name) {
      setMessage("Name your team first.");
      return;
    }

    const exists = teams.some((team) => team.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      setMessage("That team already exists.");
      return;
    }

    const nextTeam = {
      id: `team-${Date.now()}`,
      name,
      description: teamDescription.trim(),
      owner: account.username,
      members: [account.username],
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setTeams((current) => [nextTeam, ...current]);
    if (supabaseEnabled) {
      if (!supabaseSession?.user) {
        setMessage("Sign in before creating a public team.");
        return;
      }
      createSupabaseTeam(nextTeam, supabaseSession.user.id)
        .then((savedTeam) => {
          setTeams((current) => mergeById(current, [savedTeam]));
          setSharedConnected();
        })
        .catch((error) => setSharedFailure(error, "Could not create team in Supabase."));
    } else {
      requestTeamUpdate("/api/teams", {
        method: "POST",
        body: JSON.stringify({ team: nextTeam })
      });
    }
    setTeamName("");
    setTeamDescription("");
    setMessage(`Created ${name}.`);
  }

  async function joinTeam(teamId) {
    setTeams((current) => current.map((team) => {
      if (team.id !== teamId || team.members.some((member) => member.toLowerCase() === account.username.toLowerCase())) return team;
      return { ...team, members: [...team.members, account.username] };
    }));
    if (supabaseEnabled) {
      if (!supabaseSession?.user) {
        setMessage("Sign in before joining a public team.");
        return;
      }
      joinSupabaseTeam(teamId, account.username, supabaseSession.user.id)
        .then(() => {
          setSharedConnected();
        })
        .catch((error) => setSharedFailure(error, "Could not join team in Supabase."));
      return;
    }
    requestTeamUpdate(`/api/teams/${encodeURIComponent(teamId)}/join`, {
      method: "PATCH",
      body: JSON.stringify({ username: account.username })
    });
  }

  async function leaveTeam(teamId) {
    setTeams((current) => current.map((team) => (
      team.id === teamId
        ? { ...team, members: team.members.filter((member) => member.toLowerCase() !== account.username.toLowerCase()) }
        : team
    )));
    if (supabaseEnabled) {
      if (!supabaseSession?.user) return;
      leaveSupabaseTeam(teamId, supabaseSession.user.id)
        .then(() => {
          setSharedConnected();
        })
        .catch((error) => setSharedFailure(error, "Could not leave team in Supabase."));
      return;
    }
    requestTeamUpdate(`/api/teams/${encodeURIComponent(teamId)}/leave`, {
      method: "PATCH",
      body: JSON.stringify({ username: account.username })
    });
  }

  async function deleteTeam(teamId) {
    setTeams((current) => current.filter((team) => team.id !== teamId));
    try {
      if (supabaseEnabled) {
        await deleteSupabaseTeam(teamId);
        setSharedConnected();
        return;
      }

      await requestSharedApi(`/api/teams/${encodeURIComponent(teamId)}`, { method: "DELETE" });
      setSharedConnected();
    } catch (error) {
      setSharedFailure(error, "Could not delete team.");
    }
  }

  if (supabaseEnabled && (authStatus !== "signed-in" || !supabaseSession?.user)) {
    const creatingAccount = authMode === "create-account";

    return (
      <main className="auth-gate" style={getThemeStyle({ ...defaultTheme, ...theme })}>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-brand">
            <img className="brand-logo" src="/lapboardlogo.png" alt="" />
            <span>Lap<span>Board</span></span>
          </div>

          <div className="auth-copy">
            <p className="helper-text">Driver account required</p>
            <h1 id="auth-title">{creatingAccount ? "Create your LapBoard account" : "Sign in to LapBoard"}</h1>
            <p>
              Your account keeps profiles, laps, leaderboards, leagues, teams, and media tied to one Supabase login.
            </p>
          </div>

          <div className="auth-mode-toggle" role="tablist" aria-label="Account action">
            <button
              type="button"
              className={authMode === "sign-in" ? "active" : ""}
              onClick={() => setAuthMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={creatingAccount ? "active" : ""}
              onClick={() => setAuthMode("create-account")}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSupabaseAuth}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            {creatingAccount && (
              <label className="field">
                <span className="field-label">Username</span>
                <input
                  value={newAccountName}
                  onChange={(event) => setNewAccountName(event.target.value)}
                  placeholder="Driver name"
                  autoComplete="username"
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={newAccountPassword}
                onChange={(event) => setNewAccountPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete={creatingAccount ? "new-password" : "current-password"}
              />
            </label>

            <button className="primary-button" type="submit">
              <KeyRound size={16} aria-hidden="true" />
              {creatingAccount ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="auth-support">
            <p>
              Supabase config: {supabaseHost} / anon key {supabaseAnonKey ? anonKeyLooksValid ? "loaded" : "loaded but wrong format" : "missing"}
            </p>
            {supabaseTestResult && <p>{supabaseTestResult}</p>}
            {authStatus === "checking" && <p>Checking for an existing session...</p>}
            {authRedirectError && <p className="connection-error">{authRedirectError}</p>}
            {message && <p>{message}</p>}
            <button className="ghost-button" type="button" onClick={runSupabaseConnectionTest}>
              Test Supabase connection
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={resendConfirmationEmail}
              disabled={verificationCooldownSeconds > 0}
            >
              {verificationCooldownSeconds > 0
                ? `Resend in ${Math.ceil(verificationCooldownSeconds / 60)}m`
                : "Resend verification email"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell" style={getThemeStyle({ ...defaultTheme, ...theme })}>
      <datalist id="track-options">
        {tracks.map((track) => (
          <option key={track.id} value={track.name} />
        ))}
      </datalist>

      {showOnboarding && (
        <section className="onboarding-shell" aria-labelledby="onboarding-title" role="dialog" aria-modal="true">
          <div className="onboarding-card">
            <div className="onboarding-progress" aria-label="Onboarding progress">
              {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, step) => (
                <span key={step} className={step <= onboardingStep ? "active" : ""} />
              ))}
            </div>

            {onboardingStep === 0 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <Flag size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Welcome to LapBoard</h1>
                <p>Set up your driver profile, pick your home track, and tune the app before you start logging real karting laps.</p>
                <div className="onboarding-actions">
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(1)}>
                    Start setup
                  </button>
                  <button className="ghost-button" type="button" onClick={() => finishOnboarding({ skipped: true })}>
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <UserRound size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Create your account</h1>
                <div className="onboarding-grid">
                  <label className="field">
                    <span className="field-label">Username</span>
                    <input
                      value={onboardingUsername}
                      onChange={(event) => setOnboardingUsername(event.target.value)}
                      placeholder="Driver name"
                      autoComplete="username"
                    />
                  </label>
                  {!hasPassword(account) && (
                    <label className="field">
                      <span className="field-label">Password</span>
                      <input
                        type="password"
                        value={onboardingPassword}
                        onChange={(event) => setOnboardingPassword(event.target.value)}
                        placeholder="At least 4 characters"
                        autoComplete="new-password"
                      />
                    </label>
                  )}
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(0)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(2)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <MapPin size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Build your driver profile</h1>
                <div className="onboarding-grid">
                  <label className="field">
                    <span className="field-label">City</span>
                    <input value={onboardingCity} onChange={(event) => setOnboardingCity(event.target.value)} placeholder="Torrance, CA" />
                  </label>
                  <label className="field">
                    <span className="field-label">Home track</span>
                    <select value={onboardingHomeTrackId} onChange={(event) => setOnboardingHomeTrackId(event.target.value)}>
                      {tracks.map((track) => (
                        <option key={track.id} value={track.id}>{track.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Experience</span>
                    <select value={onboardingExperience} onChange={(event) => setOnboardingExperience(event.target.value)}>
                      <option value="casual">Casual driver</option>
                      <option value="league">League racer</option>
                      <option value="endurance">Endurance racer</option>
                      <option value="owner-kart">Owner kart driver</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Bio</span>
                    <textarea value={onboardingBio} onChange={(event) => setOnboardingBio(event.target.value)} placeholder="Karting profile" />
                  </label>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(1)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(3)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <Camera size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Choose your look</h1>
                <div className="onboarding-grid compact">
                  <label className="field">
                    <span className="field-label">Mode</span>
                    <select value={onboardingThemeMode} onChange={(event) => setOnboardingThemeMode(event.target.value)}>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                  <label className="color-field onboarding-color">
                    <span>Accent color</span>
                    <input type="color" value={onboardingAccent} onChange={(event) => setOnboardingAccent(event.target.value)} />
                  </label>
                </div>
                <div className="theme-presets onboarding-presets" aria-label="Theme presets">
                  {themePresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.name}
                      className="theme-preset"
                      onClick={() => {
                        setOnboardingThemeMode(preset.theme.mode);
                        setOnboardingAccent(preset.theme.accent);
                      }}
                    >
                      <span
                        className="theme-swatch"
                        style={{
                          "--swatch-accent": preset.theme.accent,
                          "--swatch-background": preset.theme.background,
                          "--swatch-surface": preset.theme.surface,
                          "--swatch-text": preset.theme.text
                        }}
                        aria-hidden="true"
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
                <div className="onboarding-preview" style={{ borderColor: onboardingAccent }}>
                  <span style={{ background: onboardingAccent }} />
                  <strong>{onboardingUsername.trim() || account.username}</strong>
                  <small>{getTrackName(onboardingHomeTrackId)} / {onboardingExperience.replace("-", " ")}</small>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(2)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(4)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 4 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <Plus size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Add laps and imports</h1>
                <p>Use Add lap time for one lap, Upload CSV for spreadsheets, or Upload K1 laps to paste timing strings from K1 sessions.</p>
                <div className="feature-tour-list">
                  <div>
                    <strong>Manual laps</strong>
                    <span>Pick a real karting track, layout, kart class, date, and lap time.</span>
                  </div>
                  <div>
                    <strong>CSV imports</strong>
                    <span>Bulk upload rows for player, track, layout, kart, lap time, and date.</span>
                  </div>
                  <div>
                    <strong>K1 paste import</strong>
                    <span>Paste splits like (01) 66.128 | (02) 65.510 and LapBoard creates each lap.</span>
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(3)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(5)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 5 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <Trophy size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Leaderboards and AI laps</h1>
                <p>The leaderboard shows real personal bests by track and layout. Switch to AI laps to simulate a field based on your pace.</p>
                <div className="feature-tour-list">
                  <div>
                    <strong>Real laps</strong>
                    <span>Your PB automatically appears when you add a faster lap.</span>
                  </div>
                  <div>
                    <strong>AI laps</strong>
                    <span>Generate dozens of AI competitors with skill, track condition, and kart condition sliders.</span>
                  </div>
                  <div>
                    <strong>Record cap</strong>
                    <span>AI laps cannot go more than 0.500 seconds faster than a track record.</span>
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(4)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(6)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 6 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <Table2 size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">My Laps, XP, and LR</h1>
                <p>My Laps is your private lap notebook. Filter by track/layout, sort by time or date, and page through larger sessions.</p>
                <div className="feature-tour-list">
                  <div>
                    <strong>Deltas</strong>
                    <span>Delta from previous compares each visible lap to the lap directly above it.</span>
                  </div>
                  <div>
                    <strong>XP and levels</strong>
                    <span>Every lap adds XP, and each track has its own mastery level.</span>
                  </div>
                  <div>
                    <strong>LR rating</strong>
                    <span>Lap comparisons and race results affect your LapBoard Rating.</span>
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(5)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(7)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 7 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <MapPin size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Tracks and records</h1>
                <p>The Tracks tab is a directory of real karting locations split into indoor and outdoor sections.</p>
                <div className="feature-tour-list">
                  <div>
                    <strong>Layouts</strong>
                    <span>Tracks can have multiple layouts, each with its own image and record.</span>
                  </div>
                  <div>
                    <strong>Images</strong>
                    <span>Drop files into public/tracks/track-id/ and LapBoard will try cover.jpg, track.jpg, main.jpg, or layout names.</span>
                  </div>
                  <div>
                    <strong>PB/TR</strong>
                    <span>Cards show your personal best and the official track record separately.</span>
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(6)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(8)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 8 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <ListChecks size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Leagues, events, and profiles</h1>
                <p>Leagues/Events helps you join current series, track race dates, add results, and follow your season.</p>
                <div className="feature-tour-list">
                  <div>
                    <strong>League results</strong>
                    <span>Add finishes and points from previous races to keep your history together.</span>
                  </div>
                  <div>
                    <strong>K1 GP Night</strong>
                    <span>League race dates can award special XP bonuses.</span>
                  </div>
                  <div>
                    <strong>Profiles and friends</strong>
                    <span>Change username/password, upload a profile picture, add friends, and choose theme presets.</span>
                  </div>
                </div>
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(7)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => setOnboardingStep(9)}>Next</button>
                </div>
              </div>
            )}

            {onboardingStep === 9 && (
              <div className="onboarding-step">
                <span className="icon-badge">
                  <Trophy size={20} aria-hidden="true" />
                </span>
                <h1 id="onboarding-title">Ready to chase laps</h1>
                <div className="onboarding-summary">
                  <div>
                    <span>Driver</span>
                    <strong>{onboardingUsername.trim() || account.username}</strong>
                  </div>
                  <div>
                    <span>Home track</span>
                    <strong>{getTrackName(onboardingHomeTrackId)}</strong>
                  </div>
                  <div>
                    <span>First goal</span>
                    <strong>Add a lap or upload a CSV</strong>
                  </div>
                </div>
                {message && <p className="form-message">{message}</p>}
                <div className="onboarding-actions">
                  <button className="ghost-button" type="button" onClick={() => setOnboardingStep(8)}>Back</button>
                  <button className="primary-button" type="button" onClick={() => finishOnboarding()}>
                    Enter LapBoard
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <header className="topbar">
        <button className="brand button-reset" onClick={() => setActiveTab("leaderboard")} aria-label="LapBoard home">
          <img className="brand-logo" src="/lapboardlogo.png" alt="" />
          <span>Lap<span>Board</span></span>
        </button>

        <nav className="main-nav" aria-label="Primary">
          {[
            ["leaderboard", "Leaderboard"],
            ["my-laps", "My Laps"],
            ["tracks", "Tracks"],
            ["media", "Media Center"],
            ["teams", "Team Center"],
            ["leagues", "Leagues/Events"],
            ["profiles", "Profiles"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <button className="nav-status button-reset" type="button" onClick={() => setActiveTab("profiles")}>
          <span className="nav-time">{navbarTime}</span>
          <span className="level-pill">Lv {level}</span>
          <span className="lr-pill">LR {elo}</span>
          {account.avatar ? (
            <img className="nav-avatar" src={account.avatar} alt="" />
          ) : (
            <UserRound size={18} aria-hidden="true" />
          )}
          <span>{account.username}</span>
        </button>
      </header>

      {message && !showOnboarding && (
        <p className="app-message-toast" role="status" aria-live="polite">{message}</p>
      )}

      {activeTab === "leaderboard" && (
        <>
          <div className="workspace">
            <aside className="panel add-panel" aria-labelledby="add-time-title">
              <div className="panel-heading">
                <span className="icon-badge">
                  <Clock3 size={18} aria-hidden="true" />
                </span>
                <h1 id="add-time-title">Add lap time</h1>
              </div>

              <form onSubmit={handleSubmit} className="lap-form">
                <SearchField
                  id="lap-track-search"
                  label="Track"
                  icon={<MapPin size={15} aria-hidden="true" />}
                  value={formTrackName}
                  onChange={setFormTrackName}
                  placeholder="Search track name"
                  list="track-options"
                />

                <label className="field">
                  <span className="field-label">
                    <Table2 size={15} aria-hidden="true" />
                    Layout
                  </span>
                  <select value={layout} onChange={(event) => setLayout(event.target.value)}>
                    {availableLayouts.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">
                    <Flag size={15} aria-hidden="true" />
                    Kart class
                  </span>
                  <select value={kart} onChange={(event) => setKart(event.target.value)}>
                    {kartOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <fieldset className="time-fieldset">
                  <legend>Lap time</legend>
                  <div className="time-inputs">
                    <label>
                      <span>MM</span>
                      <input
                        inputMode="numeric"
                        value={minutes}
                        onChange={updateNumber(setMinutes, 2)}
                        onBlur={() => setMinutes(minutes.padStart(2, "0") || "00")}
                      />
                    </label>
                    <b>:</b>
                    <label>
                      <span>SS</span>
                      <input
                        inputMode="numeric"
                        value={seconds}
                        onChange={updateNumber(setSeconds, 2)}
                        onBlur={() => setSeconds(seconds.padStart(2, "0") || "00")}
                      />
                    </label>
                    <b>.</b>
                    <label>
                      <span>MS</span>
                      <input
                        inputMode="numeric"
                        value={milliseconds}
                        onChange={updateNumber(setMilliseconds, 3)}
                        onBlur={() => setMilliseconds(milliseconds.padStart(3, "0") || "000")}
                      />
                    </label>
                  </div>
                </fieldset>

                <button className="primary-button" type="submit">
                  <Plus size={18} aria-hidden="true" />
                  Submit lap time
                </button>

                <label className="upload-button">
                  <Upload size={17} aria-hidden="true" />
                  Upload CSV laps
                  <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
                </label>
                <p className="upload-help">CSV: player, track, layout, kart, lap time, date</p>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setShowK1Importer((current) => !current)}
                >
                  <Upload size={17} aria-hidden="true" />
                  Upload K1 laps
                </button>

                {showK1Importer && (
                  <div className="k1-import-panel">
                    <label className="field">
                      <span className="field-label">Lap date</span>
                      <input
                        type="date"
                        value={k1LapDate}
                        onChange={(event) => setK1LapDate(event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">K1 lap paste</span>
                      <textarea
                        value={k1LapText}
                        onChange={(event) => setK1LapText(event.target.value)}
                        placeholder="(01) 66.128 | (02) 65.510 | (03) 65.255"
                        rows="5"
                      />
                    </label>
                    <button className="primary-button" type="button" onClick={handleK1LapImport}>
                      <Plus size={17} aria-hidden="true" />
                      Import pasted laps
                    </button>
                  </div>
                )}
              </form>
            </aside>

            <section className="panel leaderboard-panel" aria-labelledby="leaderboard-title">
              <div className="panel-heading">
                <span className="icon-badge">
                  <Trophy size={18} aria-hidden="true" />
                </span>
                <h2 id="leaderboard-title">Track leaderboard</h2>
              </div>

              <div className="leaderboard-filters">
                <fieldset className="mode-switch" aria-label="Leaderboard mode">
                  <legend>Mode</legend>
                  <div>
                    <button
                      type="button"
                      className={leaderboardMode === LEADERBOARD_MODE_REAL ? "active" : ""}
                      onClick={() => setLeaderboardMode(LEADERBOARD_MODE_REAL)}
                    >
                      Real laps
                    </button>
                    <button
                      type="button"
                      className={leaderboardMode === LEADERBOARD_MODE_AI ? "active" : ""}
                      onClick={() => setLeaderboardMode(LEADERBOARD_MODE_AI)}
                    >
                      AI laps
                    </button>
                  </div>
                </fieldset>

                <SearchField
                  id="leaderboard-track-search"
                  label="Track search"
                  icon={<Search size={15} aria-hidden="true" />}
                  value={trackQuery}
                  onChange={setTrackQuery}
                  placeholder="Search all tracks or type a track name"
                  list="track-options"
                />

                {leaderboardLayoutOptions.length > 1 && (
                  <label className="field">
                    <span className="field-label">
                      <Table2 size={15} aria-hidden="true" />
                      Layout
                    </span>
                    <select value={leaderboardLayout} onChange={(event) => setLeaderboardLayout(event.target.value)}>
                      <option value={ALL_LAYOUTS}>All layouts</option>
                      {leaderboardLayoutOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button className="ghost-button sync-button" type="button" onClick={() => syncSharedData({ showMessage: true })}>
                  Sync shared laps
                </button>
                <button className="ghost-button compact-action-button" type="button" onClick={() => publishOwnLaps("all")}>
                  Publish all
                </button>
                <label className="toggle-field compact-toggle">
                  <input
                    type="checkbox"
                    checked={autoPublishLaps}
                    onChange={(event) => {
                      setAutoPublishLaps(event.target.checked);
                      if (event.target.checked) publishOwnLaps("all");
                    }}
                  />
                  <span>Auto publish</span>
                </label>
                <span className={`sync-pill ${backendStatus === "connected" ? "connected" : "local"}`}>
                  {sharedStatusLabel}
                </span>
              </div>

              {leaderboardMode === LEADERBOARD_MODE_AI && (
                <div className="ai-controls" aria-label="AI lap tuning controls">
                  <label className="field range-field">
                    <span className="field-label">AI skill level</span>
                    <span className="range-row">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={aiSkillLevel}
                        onInput={(event) => setAiSkillLevel(Number(event.target.value))}
                        onChange={(event) => setAiSkillLevel(Number(event.target.value))}
                      />
                      <input
                        className="range-value"
                        type="number"
                        min="0"
                        max="100"
                        value={aiSkillLevel}
                        aria-label="AI skill value"
                        onChange={(event) => setAiSkillLevel(clamp(Number(event.target.value) || 0, 0, 100))}
                      />
                    </span>
                  </label>
                  <label className="field range-field">
                    <span className="field-label">Track condition</span>
                    <span className="condition-row">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={aiTrackCondition}
                        aria-label="Track condition slider"
                        onInput={(event) => setAiTrackCondition(Number(event.target.value))}
                        onChange={(event) => setAiTrackCondition(Number(event.target.value))}
                      />
                      <span className="percent-input">
                        <input
                          className="condition-value"
                          type="number"
                          min="0"
                          max="100"
                          value={aiTrackCondition}
                          aria-label="Track condition percent"
                          onChange={(event) => setAiTrackCondition(clamp(Number(event.target.value) || 0, 0, 100))}
                        />
                        <span aria-hidden="true">%</span>
                      </span>
                    </span>
                  </label>
                  <label className="field range-field">
                    <span className="field-label">Kart condition</span>
                    <span className="condition-row">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={aiKartCondition}
                        aria-label="Kart condition slider"
                        onInput={(event) => setAiKartCondition(Number(event.target.value))}
                        onChange={(event) => setAiKartCondition(Number(event.target.value))}
                      />
                      <span className="percent-input">
                        <input
                          className="condition-value"
                          type="number"
                          min="0"
                          max="100"
                          value={aiKartCondition}
                          aria-label="Kart condition percent"
                          onChange={(event) => setAiKartCondition(clamp(Number(event.target.value) || 0, 0, 100))}
                        />
                        <span aria-hidden="true">%</span>
                      </span>
                    </span>
                  </label>
                </div>
              )}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Driver</th>
                      <th>Track</th>
                      <th>Layout</th>
                      <th>Best lap</th>
                      <th>LR</th>
                      <th>Kart</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((lap, index) => (
                      <tr
                        key={`${lap.ai ? "ai" : "real"}-${lap.player}-${lap.trackId}-${lap.layout || "Main layout"}`}
                        className={index === 0 ? "leader" : ""}
                      >
                        <td>
                          <span className="rank">
                            {index === 0 && <Medal size={15} aria-hidden="true" />}
                            {index + 1}
                          </span>
                        </td>
                        <td className="driver">
                          ({lap.ai ? "AI" : getPlayerLevel(visibleLapTimes, lap.player)}) {lap.player}
                          {lap.ai && <span className="ai-badge">AI</span>}
                        </td>
                        <td>{getTrackName(lap.trackId)}</td>
                        <td>{lap.layout || "Main layout"}</td>
                        <td className="best-time">{formatTime(lap.ms)}</td>
                        <td>{lap.ai ? lap.lr : getPlayerElo(eloRatings, lap.player)}</td>
                        <td>{lap.kart}</td>
                        <td>{lap.ai ? "AI estimate" : formatDate(lap.date)}</td>
                      </tr>
                    ))}
                    {!leaderboard.length && (
                      <tr>
                        <td colSpan="8" className="empty-cell">No lap times match this track search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="profile-grid" aria-label="Current profile details">
            <ProfileSummary account={account} recentLapTimes={recentLapTimes} level={level} xp={xp} levelProgress={levelProgress} elo={elo} />
            <RecentLaps recentLapTimes={recentLapTimes} />
          </section>
        </>
      )}

      {activeTab === "my-laps" && (
        <section className="panel laps-panel" aria-labelledby="my-laps-title">
          <div className="panel-heading split">
            <span>
              <span className="icon-badge">
                <Table2 size={18} aria-hidden="true" />
              </span>
              <h1 id="my-laps-title">My laps</h1>
            </span>
            <span className="helper-text">PBs are calculated automatically from this lap history</span>
          </div>

          <div className="laps-toolbar">
            <label className="field">
              <span className="field-label">
                <MapPin size={15} aria-hidden="true" />
                Track
              </span>
              <select value={myLapsTrackId} onChange={(event) => setMyLapsTrackId(event.target.value)}>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>{track.name}</option>
                ))}
              </select>
            </label>
            {myLapsLayoutOptions.length > 1 && (
              <label className="field">
                <span className="field-label">
                  <Table2 size={15} aria-hidden="true" />
                  Layout
                </span>
                <select value={myLapsLayout} onChange={(event) => setMyLapsLayout(event.target.value)}>
                  <option value={ALL_LAYOUTS}>All layouts</option>
                  {myLapsLayoutOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            )}
            <Stat label="Visible laps" value={myLapsWithDeltas.length} />
            <Stat
              label="Best visible lap"
              value={bestVisibleLapMs !== null ? formatTime(bestVisibleLapMs) : "--.---"}
            />
            <Stat
              label="Track mastery"
              value={`Lv ${selectedTrackMastery.level} / ${selectedTrackMastery.lapCount} laps`}
            />
            <Stat label="LR rating" value={elo} />
            <label className="field">
              <span className="field-label">Laps per page</span>
              <select
                value={myLapsPageSize}
                onChange={(event) => setMyLapsPageSize(Number(event.target.value))}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button className="ghost-button" type="button" onClick={() => publishOwnLaps("track")}>
              Publish this track
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <button className="sort-button" type="button" onClick={() => changeMyLapsSort("lap")}>
                      Lap # {myLapsSort.key === "lap" ? myLapsSort.direction.toUpperCase() : ""}
                    </button>
                  </th>
                  <th>
                    <button className="sort-button" type="button" onClick={() => changeMyLapsSort("date")}>
                      Date {myLapsSort.key === "date" ? myLapsSort.direction.toUpperCase() : ""}
                    </button>
                  </th>
                  <th>
                    <button className="sort-button" type="button" onClick={() => changeMyLapsSort("time")}>
                      Lap time {myLapsSort.key === "time" ? myLapsSort.direction.toUpperCase() : ""}
                    </button>
                  </th>
                  <th>Delta from previous</th>
                  <th>Layout</th>
                  <th>Kart</th>
                </tr>
              </thead>
              <tbody>
                {pagedMyLapsWithDeltas.map((lap, index) => (
                  <tr key={lap.id} className={lap.ms === bestVisibleLapMs ? "leader" : ""}>
                    <td className="driver">{lap.lapNumber || ((currentMyLapsPage - 1) * myLapsPageSize) + index + 1}</td>
                    <td>{formatDate(lap.date)}</td>
                    <td className="best-time">{formatTime(lap.ms)}</td>
                    <td className={lap.deltaMs !== null && lap.deltaMs < 0 ? "delta-good" : "delta-bad"}>
                      {formatDelta(lap.deltaMs)}
                    </td>
                    <td>{lap.layout || "Main layout"}</td>
                    <td>{lap.kart}</td>
                  </tr>
                ))}
                {!myLapsWithDeltas.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">No laps saved for {getTrackName(myLapsTrackId)} yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-row" aria-label="My laps pagination">
            <button
              type="button"
              className="ghost-button"
              disabled={currentMyLapsPage === 1}
              onClick={() => setMyLapsPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </button>
            <span>Page {currentMyLapsPage} of {myLapsTotalPages}</span>
            <button
              type="button"
              className="ghost-button"
              disabled={currentMyLapsPage === myLapsTotalPages}
              onClick={() => setMyLapsPage((page) => Math.min(myLapsTotalPages, page + 1))}
            >
              Next
            </button>
          </div>

          <section className="community-laps-section" aria-labelledby="community-laps-title">
            <div className="compact-heading">
              <UsersRound size={16} aria-hidden="true" />
              <h2 id="community-laps-title">Community laps</h2>
            </div>
            <p className="section-copy">
              Everyone's best public lap is shown for every track and layout. Private imported laps stay visible only to their owner.
              <span className={`sync-pill ${backendStatus === "connected" ? "connected" : "local"}`}>
                {sharedStatusLabel}
              </span>
            </p>
            <div className="table-wrap compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Track</th>
                    <th>Layout</th>
                    <th>Driver</th>
                    <th>Best lap</th>
                    <th>Kart</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {communityLaps.map((lap) => (
                    <tr key={`community-${lap.trackId}-${lap.layout}-${lap.player}-${lap.id}`}>
                      <td className="driver">#{lap.communityRank}</td>
                      <td>{getTrackName(lap.trackId)}</td>
                      <td>{lap.layout || "Main layout"}</td>
                      <td className="driver">{lap.player}</td>
                      <td className="best-time">{formatTime(lap.ms)}</td>
                      <td>{lap.kart}</td>
                      <td>{formatDate(lap.date)}</td>
                    </tr>
                  ))}
                  {!communityLaps.length && (
                    <tr>
                      <td colSpan="7" className="empty-cell">No public community laps have been submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {activeTab === "tracks" && (
        <section className="panel directory-panel" aria-labelledby="tracks-title">
          <div className="panel-heading split">
            <span>
              <span className="icon-badge">
                <MapPin size={18} aria-hidden="true" />
              </span>
              <h1 id="tracks-title">Track directory</h1>
            </span>
            <span className="helper-text">Tracks with no track record are unknown, email lapboardofficial@gmail.com to add</span>
          </div>

          <SearchField
            id="directory-search"
            label="Find track"
            icon={<Search size={15} aria-hidden="true" />}
            value={directoryQuery}
            onChange={setDirectoryQuery}
            placeholder="Search name, city, or layout"
          />

          <div className="track-groups">
            {groupedDirectoryTracks.map((group) => (
              <section className="track-group" key={group.key} aria-labelledby={`track-group-${group.key}`}>
                <div className="track-group-heading">
                  <h2 id={`track-group-${group.key}`}>{group.title}</h2>
                  <span>{group.tracks.length} tracks</span>
                </div>
                <div className="track-directory">
                  {group.tracks.map((track) => {
                    const layoutOptions = getTrackLayouts(track.id);
                    const selectedDirectoryLayout = directoryLayouts[track.id] || layoutOptions[0] || "Main layout";
                    const trackMastery = getTrackMastery(lapTimes, account.username, track.id);
                    const layoutRecordFilter = layoutOptions.length > 1 ? selectedDirectoryLayout : ALL_LAYOUTS;
                    const personalBest = getPersonalBestForTrack(lapTimes, account.username, track.id, layoutRecordFilter);
                    const trackRecord = getPublicTrackRecord(lapTimes, track.id, layoutRecordFilter);
                    const juniorTrackRecord = getConfiguredJuniorTrackRecord(track.id, layoutRecordFilter);
                    return (
                      <article className="track-card" key={track.id}>
                        <div className="track-media">
                          <TrackImage track={track} layoutName={selectedDirectoryLayout} />
                        </div>
                        <div className="track-card-body">
                          <div className="track-card-title">
                            <h3>{track.name}</h3>
                            <span>{isIndoorTrack(track) ? "Indoor" : "Outdoor"}</span>
                          </div>
                          <p className="track-city">
                            <MapPin size={15} aria-hidden="true" />
                            {track.city}
                          </p>
                          <p className="track-notes">{track.notes}</p>
                          <label className="field compact-field">
                            <span className="field-label">
                              <Table2 size={15} aria-hidden="true" />
                              Layout
                            </span>
                            <select
                              value={selectedDirectoryLayout}
                              onChange={(event) => {
                                setDirectoryLayouts((current) => ({
                                  ...current,
                                  [track.id]: event.target.value
                                }));
                              }}
                            >
                              {layoutOptions.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </select>
                          </label>
                          <div className="track-fact-grid">
                            <div className="track-facts">
                              <span>Records</span>
                              <strong>
                                PB: {personalBest ? formatTime(personalBest.ms) : "--.---"} / TR: {trackRecord ? formatTime(trackRecord.ms) : "--.---"}
                                {juniorTrackRecord ? ` / Jr TR: ${formatTime(juniorTrackRecord.ms)}` : ""}
                              </strong>
                            </div>
                            <div className="track-facts">
                              <span>Mastery</span>
                              <strong>Lv {trackMastery.level} / {trackMastery.lapCount} laps</strong>
                            </div>
                          </div>
                          <div className="track-facts layout-fact">
                            <span>Layouts</span>
                            <strong>{getTrackLayouts(track.id).join(", ")}</strong>
                          </div>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              setFormTrackName(track.name);
                              setLayout(getTrackLayouts(track.id)[0] || "Main layout");
                              setTrackQuery(track.name);
                              setActiveTab("leaderboard");
                            }}
                          >
                            Add time here
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            {!groupedDirectoryTracks.length && (
              <p className="empty-state">No tracks match that search.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === "media" && (
        <section className="panel media-panel" aria-labelledby="media-title">
          <div className="panel-heading split">
            <span>
              <span className="icon-badge">
                <Film size={18} aria-hidden="true" />
              </span>
              <h1 id="media-title">Media Center</h1>
            </span>
            <span className="helper-text">Upload footage previews or save links to race videos</span>
          </div>

          <div className="media-layout">
            <section className="media-tools">
              <form className="media-form" onSubmit={addMediaLink}>
                <div className="compact-heading">
                  <LinkIcon size={16} aria-hidden="true" />
                  <h2>Add video link</h2>
                </div>
                <label className="field">
                  <span className="field-label">Title</span>
                  <input value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} placeholder="Final heat at Torrance" />
                </label>
                <label className="field">
                  <span className="field-label">Video URL</span>
                  <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://youtube.com/..." />
                </label>
                <button className="primary-button" type="submit">
                  <Plus size={16} aria-hidden="true" />
                  Save link
                </button>
              </form>

              <div className="media-form">
                <div className="compact-heading">
                  <Upload size={16} aria-hidden="true" />
                  <h2>Upload footage</h2>
                </div>
                <label className="field">
                  <span className="field-label">Title</span>
                  <input value={mediaFileTitle} onChange={(event) => setMediaFileTitle(event.target.value)} placeholder="Practice run clip" />
                </label>
                <label className="upload-button">
                  <Upload size={17} aria-hidden="true" />
                  Choose video file
                  <input type="file" accept="video/*" onChange={handleMediaFileUpload} />
                </label>
                <p className="upload-help">File uploads preview in this browser session. Links are saved.</p>
              </div>
            </section>

            <section className="media-library" aria-label="Saved media">
              {mediaEntries.map((entry) => (
                <article className="media-card" key={entry.id}>
                  <div className="media-preview">
                    {entry.type === "file" ? (
                      <video src={entry.url} controls />
                    ) : (
                      <a href={entry.url} target="_blank" rel="noreferrer">
                        <Play size={30} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="helper-text">{entry.owner} / {formatDate(entry.createdAt)}</span>
                    <h2>{entry.title}</h2>
                    <p>{entry.type === "file" ? entry.fileName : entry.url}</p>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => removeMediaEntry(entry.id)}>
                    Remove
                  </button>
                </article>
              ))}
              {!mediaEntries.length && (
                <p className="empty-state">No media added yet. Upload footage or save a race video link.</p>
              )}
            </section>
          </div>
        </section>
      )}

      {activeTab === "teams" && (
        <section className="panel teams-panel" aria-labelledby="teams-title">
          <div className="panel-heading split">
            <span>
              <span className="icon-badge">
                <UsersRound size={18} aria-hidden="true" />
              </span>
              <h1 id="teams-title">Team Center</h1>
            </span>
            <span className="helper-text">{userTeams.length} joined team{userTeams.length === 1 ? "" : "s"}</span>
          </div>

          <div className="teams-layout">
            <form className="team-create-panel" onSubmit={createTeam}>
              <div className="compact-heading">
                <Plus size={16} aria-hidden="true" />
                <h2>Create team</h2>
              </div>
              <label className="field">
                <span className="field-label">Team name</span>
                <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Apex Kart Club" />
              </label>
              <label className="field">
                <span className="field-label">Description</span>
                <textarea value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)} placeholder="League team, endurance crew, friend group..." />
              </label>
              <button className="primary-button" type="submit">Create team</button>
            </form>

            <section className="team-list" aria-label="Teams">
              {teams.map((team) => {
                const isMember = team.members.some((member) => member.toLowerCase() === account.username.toLowerCase());
                return (
                  <article className="team-card" key={team.id}>
                    <div>
                      <span className="helper-text">Owner: {team.owner}</span>
                      <h2>{team.name}</h2>
                      <p>{team.description || "No description yet."}</p>
                    </div>
                    <div className="team-members">
                      {team.members.map((member) => (
                        <span key={member}>{member}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={isMember ? "ghost-button" : "primary-button"}
                      onClick={() => isMember ? leaveTeam(team.id) : joinTeam(team.id)}
                    >
                      {isMember ? "Leave team" : "Join team"}
                    </button>
                    {team.owner === account.username && (
                      <button className="ghost-button" type="button" onClick={() => deleteTeam(team.id)}>
                        Delete team
                      </button>
                    )}
                  </article>
                );
              })}
              {!teams.length && (
                <p className="empty-state">No teams yet. Create one to invite drivers into a shared garage.</p>
              )}
            </section>
          </div>
        </section>
      )}

      {activeTab === "leagues" && (
        <section className="panel leagues-panel" aria-labelledby="leagues-title">
          <div className="panel-heading split">
            <span>
              <span className="icon-badge">
                <ListChecks size={18} aria-hidden="true" />
              </span>
              <h1 id="leagues-title">Leagues/Events</h1>
            </span>
            <span className="helper-text">K1 GP Night bonus: +{K1_GP_NIGHT_BONUS_XP} XP</span>
          </div>

          <div className="sub-tabs" role="tablist" aria-label="League views">
            <button type="button" className={leagueTab === "available" ? "active" : ""} onClick={() => setLeagueTab("available")}>
              Current leagues
            </button>
            <button type="button" className={leagueTab === "mine" ? "active" : ""} onClick={() => setLeagueTab("mine")}>
              My Leagues
            </button>
            <button type="button" className={leagueTab === "events" ? "active" : ""} onClick={() => setLeagueTab("events")}>
              Events
            </button>
          </div>

          {leagueTab === "available" && (
            <div className="league-grid">
              {leagues.map((league) => (
                <article className="league-card" key={league.id}>
                  <div>
                    <span className="league-season">{league.season}</span>
                    <h2>{league.name}</h2>
                    <p>{league.description}</p>
                  </div>
                  <div className="league-dates">
                    {league.dates.map((date) => (
                      <span key={date.date}>{date.label}{date.note || ""}</span>
                    ))}
                  </div>
                  {joiningLeagueId === league.id ? (
                    <div className="join-box">
                      <label className="field">
                        <span className="field-label">
                          <MapPin size={15} aria-hidden="true" />
                          Location
                        </span>
                        <select value={joinTrackId} onChange={(event) => setJoinTrackId(event.target.value)}>
                          {getLeagueLocations(league).map((track) => (
                            <option key={track.id} value={track.id}>{track.name}</option>
                          ))}
                        </select>
                      </label>
                      <div className="join-actions">
                        <button className="primary-button" type="button" onClick={() => joinLeague(league.id)}>Join</button>
                        <button className="ghost-button" type="button" onClick={() => setJoiningLeagueId("")}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => {
                        setJoinTrackId(getLeagueLocations(league)[0]?.id || "");
                        setJoiningLeagueId(league.id);
                      }}
                    >
                      Join league
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}

          {leagueTab === "mine" && (
            <div className="my-leagues-layout">
              <section className="league-stack">
                {userLeagueMemberships.map((membership) => {
                  const league = getLeague(membership.leagueId);
                  const leagueMembers = getLeagueMembers(leagueMemberships, membership.leagueId, membership.trackId);
                  return (
                    <article className="league-card joined-league" key={membership.id}>
                      <div className="league-card-header">
                        <div>
                          <span className="league-season">{league?.season || "2026"} / {getTrackName(membership.trackId)}</span>
                          <h2>{league?.name || "League"}</h2>
                        </div>
                        <button className="ghost-button compact-action-button" type="button" onClick={() => leaveLeague(membership.id)}>
                          Leave
                        </button>
                      </div>
                      <div className="league-dates">
                        {(league?.dates || []).map((date) => (
                          <span key={date.date}>{date.label}{date.note || ""}</span>
                        ))}
                      </div>
                      <div className="league-members">
                        <span>Drivers</span>
                        <div>
                          {leagueMembers.map((member) => (
                            <strong key={member}>{member}</strong>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!userLeagueMemberships.length && (
                  <p className="empty-state">Join a league to see your 2026 schedule and results here.</p>
                )}
              </section>

              <section className="result-panel">
                <div className="compact-heading">
                  <Trophy size={16} aria-hidden="true" />
                  <h2>Add previous result</h2>
                </div>
                <form className="result-form" onSubmit={addLeagueResult}>
                  <label className="field">
                    <span className="field-label">League</span>
                    <select value={resultLeagueKey} onChange={(event) => {
                      const key = event.target.value;
                      setResultLeagueKey(key);
                      const [leagueId] = key.split(":");
                      setResultDate(getLeague(leagueId)?.dates?.[0]?.date || "");
                    }}>
                      {userLeagueMemberships.map((membership) => (
                        <option key={membership.id} value={`${membership.leagueId}:${membership.trackId}`}>
                          {getLeague(membership.leagueId)?.name} / {getTrackName(membership.trackId)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Race date</span>
                    <select value={resultDate} onChange={(event) => setResultDate(event.target.value)}>
                      {(getLeague(resultLeagueKey.split(":")[0])?.dates || []).map((date) => (
                        <option key={date.date} value={date.date}>{date.label}{date.note || ""}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Finish</span>
                    <input value={resultFinish} onChange={(event) => setResultFinish(event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Points</span>
                    <input value={resultPoints} onChange={(event) => setResultPoints(event.target.value)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Notes</span>
                    <textarea value={resultNotes} onChange={(event) => setResultNotes(event.target.value)} />
                  </label>
                  <button className="primary-button" type="submit" disabled={!userLeagueMemberships.length}>Add result</button>
                </form>

                <div className="result-list">
                  {userLeagueResults.map((result) => (
                    <div className="result-row" key={result.id}>
                      <span>{formatDate(result.date)}</span>
                      <strong>{getLeague(result.leagueId)?.name} / {getTrackName(result.trackId)}</strong>
                      <small>{result.finish || "Finish --"} / {result.points || "0"} pts {isLeagueRaceDate(result.leagueId, result.date) ? `/ +${K1_GP_NIGHT_BONUS_XP} XP` : ""}</small>
                      {result.notes && <p>{result.notes}</p>}
                    </div>
                  ))}
                  {!userLeagueResults.length && <p className="empty-state">No league results logged yet.</p>}
                </div>
              </section>
            </div>
          )}

          {leagueTab === "events" && (
            <div className="league-grid">
              {events.map((event) => (
                <article className="league-card event-card" key={event.id}>
                  <div>
                    <span className="league-season">{event.type} / {getTrackName(event.trackId)}</span>
                    <h2>{event.name}</h2>
                    <p>VSK endurance event dates for the 2026 season.</p>
                  </div>
                  <div className="league-dates">
                    {event.dates.map((date) => (
                      <span key={date.date}>{date.label}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "profiles" && (
        <section className="profiles-layout">
          <div className="panel">
            <div className="panel-heading">
              <span className="icon-badge">
                <UserRound size={18} aria-hidden="true" />
              </span>
              <h1>Accounts</h1>
            </div>

            <label className="profile-upload">
              {account.avatar ? (
                <img src={account.avatar} alt={`${account.username} profile`} />
              ) : (
                <span className="helmet small-helmet" aria-hidden="true">{account.username.slice(0, 2).toUpperCase()}</span>
              )}
              <span>
                <strong>{account.username}</strong>
                <small>Upload profile picture</small>
              </span>
              <input type="file" accept="image/*" onChange={handleProfilePhotoUpload} />
            </label>

            {!supabaseEnabled && (
              <form className="inline-form" onSubmit={createAccount}>
                <input
                  value={newAccountName}
                  onChange={(event) => setNewAccountName(event.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                />
                <input
                  type="password"
                  value={newAccountPassword}
                  onChange={(event) => setNewAccountPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button className="primary-button" type="submit">
                  <KeyRound size={16} aria-hidden="true" />
                  Use account
                </button>
              </form>
            )}

            {supabaseEnabled && (
              <div className="profile-auth-status">
                <p className="helper-text">
                  Supabase auth: {authStatusLabel}
                </p>
                <button className="ghost-button profile-action" type="button" onClick={handleSupabaseSignOut}>
                  Sign out
                </button>
              </div>
            )}

            <div className="profile-auth-status shared-diagnostic">
              <p className="helper-text">Shared data: {sharedStatusLabel}</p>
              {showProductionSupabaseWarning && (
                <p className="connection-error">
                  Vercel cannot see the Supabase environment variables in this build. Missing: {[
                    missingSupabaseEnv.url ? "VITE_SUPABASE_URL" : "",
                    missingSupabaseEnv.anonKey ? "VITE_SUPABASE_ANON_KEY" : ""
                  ].filter(Boolean).join(", ") || "unknown"}. Add them to Vercel Production and redeploy.
                </p>
              )}
              {lastSharedError && (
                <p className="connection-error">Last error: {lastSharedError}</p>
              )}
              <button
                className="ghost-button profile-action"
                type="button"
                onClick={() => {
                  clearSharedError();
                  syncSharedData({ showMessage: true });
                }}
              >
                Reconnect shared data
              </button>
            </div>

            <div className="account-list">
              {(supabaseEnabled ? [account] : accounts).map((item) => (
                <button
                  type="button"
                  key={item.username}
                  className={item.username === account.username ? "account-row selected" : "account-row"}
                  onClick={() => {
                    if (item.username === account.username) return;
                    if (hasPassword(item)) {
                      setNewAccountName(item.username);
                      setNewAccountPassword("");
                      setMessage(`Enter ${item.username}'s password to switch accounts.`);
                      return;
                    }
                    persistAccounts(accounts, item.username);
                  }}
                >
                  <span>{item.username}</span>
                  <small>{hasPassword(item) ? "locked" : "unlocked"} / {Array.isArray(item.friends) ? item.friends.length : 0} friends</small>
                </button>
              ))}
            </div>

            <form className="inline-form section-form" onSubmit={updateCurrentPassword}>
              {hasPassword(account) && !supabaseEnabled && (
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Current password"
                  autoComplete="current-password"
                />
              )}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={supabaseEnabled ? "New Supabase password" : hasPassword(account) ? "New password" : "Set account password"}
                autoComplete="new-password"
              />
              <button className="ghost-button" type="submit">
                <KeyRound size={16} aria-hidden="true" />
                {supabaseEnabled || hasPassword(account) ? "Change password" : "Set password"}
              </button>
            </form>

            <form className="inline-form section-form" onSubmit={renameAccount}>
              <input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder={`Rename ${account.username}`}
              />
              <button className="ghost-button" type="submit">Rename current user</button>
            </form>

            <button className="ghost-button profile-action" type="button" onClick={() => openOnboarding(0)}>
              Run onboarding again
            </button>

            <button className="ghost-button profile-action" type="button" onClick={exportLocalData}>
              <Upload size={16} aria-hidden="true" />
              Export local data
            </button>

            <label className="upload-button profile-action">
              <Upload size={16} aria-hidden="true" />
              Import LapBoard data
              <input type="file" accept="application/json,.json" onChange={importLocalData} />
            </label>

            <button className="danger-button" type="button" onClick={clearLocalData}>
              <Trash2 size={16} aria-hidden="true" />
              Remove local demo/data
            </button>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <span className="icon-badge">
                <UsersRound size={18} aria-hidden="true" />
              </span>
              <h2>Friends</h2>
            </div>

            <form className="inline-form" onSubmit={addFriend}>
              <input
                value={friendName}
                onChange={(event) => setFriendName(event.target.value)}
                placeholder="Add friend username"
              />
              <button className="primary-button" type="submit">
                <UserPlus size={16} aria-hidden="true" />
                Add
              </button>
            </form>

            <div className="friend-list">
              {accountFriends.map((friend) => (
                <div className="friend-row" key={friend}>
                  <span>{friend}</span>
                  <button type="button" onClick={() => removeFriend(friend)}>Remove</button>
                </div>
              ))}
              {!accountFriends.length && <p className="empty-state">No friends added yet.</p>}
            </div>
          </div>

          <div className="panel">
            <ProfileSummary account={account} recentLapTimes={recentLapTimes} framed={false} level={level} xp={xp} levelProgress={levelProgress} elo={elo} />
            <RecentLaps recentLapTimes={recentLapTimes} />
          </div>

          <div className="panel theme-panel">
            <div className="panel-heading">
              <span className="icon-badge">
                <Camera size={18} aria-hidden="true" />
              </span>
              <h2>Theme</h2>
            </div>

            <label className="field">
              <span className="field-label">Mode</span>
              <select value={theme.mode} onChange={(event) => updateTheme("mode", event.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>

            <div className="theme-presets" aria-label="Theme presets">
              {themePresets.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  className="theme-preset"
                  onClick={() => applyThemePreset(preset.theme)}
                >
                  <span
                    className="theme-swatch"
                    style={{
                      "--swatch-accent": preset.theme.accent,
                      "--swatch-background": preset.theme.background,
                      "--swatch-surface": preset.theme.surface,
                      "--swatch-text": preset.theme.text
                    }}
                    aria-hidden="true"
                  />
                  {preset.name}
                </button>
              ))}
            </div>

            {[
              ["accent", "Accent"],
              ["background", "Background"],
              ["surface", "Surface"],
              ["text", "Text"]
            ].map(([key, label]) => (
              <label className="color-field" key={key}>
                <span>{label}</span>
                <input
                  type="color"
                  value={theme[key] || defaultTheme[key]}
                  onChange={(event) => updateTheme(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ProfileSummary({ account, recentLapTimes, framed = true, level = 1, xp = 0, levelProgress = 0, elo = ELO_START }) {
  return (
    <div className={framed ? "profile-card" : "profile-summary"}>
      {account.avatar ? (
        <img className="profile-avatar" src={account.avatar} alt={`${account.username} profile`} />
      ) : (
        <div className="helmet" aria-hidden="true">{account.username.slice(0, 2).toUpperCase()}</div>
      )}
      <div>
        <h2>Player profile</h2>
        <p>{account.username}</p>
        <span>Level {level} / LR {elo} / {xp} XP / {recentLapTimes.length} recent laps</span>
        <div className="xp-track" aria-label={`${levelProgress} XP toward next level`}>
          <span style={{ width: `${Math.min(100, (levelProgress / XP_PER_LEVEL) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function RecentLaps({ recentLapTimes }) {
  return (
    <div className="panel compact-panel">
      <div className="compact-heading">
        <Clock3 size={16} aria-hidden="true" />
        <h2>Recent laptimes</h2>
      </div>
      <div className="mini-table">
        {recentLapTimes.map((lap) => (
          <div className="mini-row" key={lap.id}>
            <span>{getTrackName(lap.trackId)}</span>
            <strong>{formatTime(lap.ms)}</strong>
            <small>{lap.layout || "Main layout"} / {formatDate(lap.date)}</small>
          </div>
        ))}
        {!recentLapTimes.length && <p className="empty-state">No laps yet.</p>}
      </div>
    </div>
  );
}

function PersonalBests({ personalBests }) {
  return (
    <div className="panel compact-panel">
      <div className="compact-heading">
        <Trophy size={16} aria-hidden="true" />
        <h2>Personal bests by track</h2>
      </div>
      <div className="mini-table">
        {personalBests.map(({ track, best }) => (
          <div className="mini-row" key={track.id}>
            <span>{track.name}</span>
            <strong>{best ? formatTime(best.ms) : "--:--.---"}</strong>
            <small>{best ? best.kart : "No time"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
