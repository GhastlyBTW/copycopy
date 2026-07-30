import { useState, useEffect, useRef } from "react";
import {
  Flame,
  Clock,
  Check,
  Heart,
  Sparkles,
  ArrowLeft,
  Menu,
  X,
  BarChart3,
  Sun,
  Moon,
  Bug,
} from "lucide-react";
import {
  isConfigured,
  getExistingUser,
  continueAsGuest,
  signInWithGoogle,
  linkGoogleAccount,
  getAccountInfo,
  signOut,
  loadProfile,
  createProfile as createProfileRow,
  updateProfile,
  loadFeed as fetchFeed,
  submitEntry,
  toggleReaction,
  sendFeedback,
} from "./api.js";

/*
  DAILY BRIEF — functional prototype
  ------------------------------------------------
  Styled with a light/dark theme token system (see THEME below) so the whole
  app can be reskinned by editing one object instead of hunting through JSX.

  Backed by Supabase (see src/api.js and supabase/schema.sql). Visitors are
  signed in anonymously, so identity is stable across reloads without asking
  for an email.

  Everyone sees the same brief on the same day (brief index = day-of-year %
  number of briefs). You can browse the last 14 days and fill out a brief you
  missed — it joins that day's room but doesn't affect your streak.
*/

const BRIEFS = [
  {
    id: "faun",
    brand: "Faun",
    productName: "Faun No. 1",
    product:
      "A single serum meant to replace a whole shelf of products — one bottle that handles hydration, brightening, and barrier repair. Bottle design is deliberately plain, almost apothecary-like.",
    audience:
      "Late-20s to early-40s professionals who used to do the 10-step routine, burned out on it, and now want the result without the ritual. Skeptical of hype, responsive to confidence and restraint.",
    tone: ["calm", "confident", "dry-witted"],
    notTone: "clinical, girlboss wellness",
    campaign:
      "Launching the serum, positioned directly against routine overload — 'less but better.'",
    deliverables: [
      { key: "tagline", label: "Tagline", type: "short", placeholder: "One line, under 8 words" },
      {
        key: "ig",
        label: "Instagram caption (launch post)",
        type: "medium",
        placeholder: "2-3 sentences",
      },
      {
        key: "hero",
        label: "Landing page hero (headline + subhead + CTA)",
        type: "medium",
        placeholder: "Headline\nSubhead\nCTA button text",
      },
    ],
  },
  {
    id: "ledge",
    brand: "Ledge",
    productName: "Ledge Flex Budget",
    product:
      "A budgeting app that auto-adjusts your 'safe to spend' number based on income that varies week to week — built for people who don't get a predictable paycheck.",
    audience:
      "Freelancers, gig workers, and contractors, roughly 25-40. Money-anxious not because they're bad with money, but because their income is unpredictable. Tired of budgeting tools built for salaried people.",
    tone: ["reassuring", "plainspoken", "slightly funny about money anxiety"],
    notTone: "finance bro, preachy",
    campaign: "Tax season stress relief push — helping users feel ready instead of ambushed.",
    deliverables: [
      { key: "push", label: "Push notification", type: "short", placeholder: "Under 12 words" },
      { key: "tagline", label: "Tagline", type: "short", placeholder: "One line" },
      {
        key: "video",
        label: "Short-form video script (15 sec)",
        type: "medium",
        placeholder: "Beat by beat, 3-4 lines",
      },
    ],
  },
  {
    id: "cinder",
    brand: "Cinder",
    productName: "Cinder Nightfall",
    product:
      "A running shoe built with reflective, high-visibility detailing and a grippier sole for pre-dawn or late-night pavement — designed for runners who train around a day job, not around daylight.",
    audience:
      "Serious amateur runners, 20s-40s, who run before work or after their kids are asleep. Identify with grit more than performance-marketing gloss. Respect runners who show up when it's inconvenient.",
    tone: ["gritty", "cinematic", "a little defiant"],
    notTone: "motivational-poster energy",
    campaign: "New shoe drop themed around running in the dark.",
    deliverables: [
      { key: "tagline", label: "Tagline", type: "short", placeholder: "One line" },
      { key: "cta", label: "CTA button copy", type: "short", placeholder: "2-4 words" },
      {
        key: "hero",
        label: "Landing page hero (headline + subhead + CTA)",
        type: "medium",
        placeholder: "Headline\nSubhead\nCTA button text",
      },
    ],
  },
  {
    id: "amble",
    brand: "Amble",
    productName: "Amble Starter Box",
    product:
      "A coffee subscription that ships pre-portioned pour-over pouches — no grinder, no scale, no decision-making. Cancel or pause anytime, first bag free.",
    audience:
      "People who drink coffee daily but have never once described themselves as 'into coffee.' Intimidated by roaster jargon and specialty coffee shop culture, just want a good cup with zero learning curve.",
    tone: ["warm", "unpretentious", "a little playful"],
    notTone: "snobby, roaster jargon",
    campaign: "Encouraging first-timers to try a subscription with a no-pressure free trial.",
    deliverables: [
      { key: "cta", label: "CTA button copy", type: "short", placeholder: "2-4 words" },
      { key: "hashtag", label: "Campaign hashtag", type: "short", placeholder: "One tag" },
      {
        key: "caption",
        label: "Instagram caption (trial offer post)",
        type: "medium",
        placeholder: "2-3 sentences",
      },
    ],
  },
  {
    id: "harborline",
    brand: "Harborline",
    productName: "Harborline Cleanup Day",
    product:
      "A local nonprofit organizing recurring coastal cleanup events — supplies provided, no experience needed, 2-hour commitment.",
    audience:
      "Local residents, 20s-50s, who care about the coast but have never volunteered for anything formal. Time-strapped, want to help without a big commitment, easily discouraged by guilt-driven messaging.",
    tone: ["hopeful", "direct", "community-minded"],
    notTone: "guilt-tripping, doom and gloom",
    campaign: "Recruiting first-time volunteers for a weekend cleanup event.",
    deliverables: [
      { key: "tagline", label: "Tagline", type: "short", placeholder: "One line" },
      { key: "push", label: "Push notification (event reminder)", type: "short", placeholder: "Under 12 words" },
      {
        key: "hero",
        label: "Landing page hero (headline + subhead + CTA)",
        type: "medium",
        placeholder: "Headline\nSubhead\nCTA button text",
      },
    ],
  },
  {
    id: "loop",
    brand: "Loop",
    productName: "Loop Remnant Capsule",
    product:
      "A streetwear capsule made entirely from deadstock fabric sourced from overstock factory runs — every drop is small and won't be restocked, by design.",
    audience:
      "18-28, plugged into streetwear/sneaker culture, cares about sustainability but would never buy something marketed primarily as 'sustainable.' Responds to scarcity, exclusivity, and insider tone.",
    tone: ["blunt", "insider", "a little rebellious"],
    notTone: "corporate sustainability speak",
    campaign: "New capsule drop, limited run, sustainability as a flex not a lecture.",
    deliverables: [
      { key: "tagline", label: "Tagline", type: "short", placeholder: "One line" },
      { key: "push", label: "Push notification (drop alert)", type: "short", placeholder: "Under 12 words" },
      {
        key: "caption",
        label: "Instagram caption (drop announcement)",
        type: "medium",
        placeholder: "2-3 sentences",
      },
    ],
  },
];

const REACTIONS = ["Nailed the tone", "Bold choice", "Loved the twist"];
const PAST_DAYS_COUNT = 14;

const THEME = {
  light: {
    page: "bg-stone-50 text-stone-900",
    muted: "text-stone-400",
    card: "bg-white border border-stone-200",
    text: "text-stone-700",
    strongText: "text-stone-900",
    chip: "bg-stone-100 text-stone-700",
    notChip: "bg-red-50 text-red-500",
    inputClass:
      "border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white text-stone-900 placeholder-stone-400",
    buttonPrimary: "bg-stone-900 text-white hover:bg-stone-800",
    buttonPrimaryDisabled: "bg-stone-300 text-white cursor-not-allowed",
    daySelected: "bg-stone-900 text-white border-stone-900",
    dayDone: "bg-stone-100 border-stone-200 text-stone-700",
    dayDefault: "bg-white border-stone-200 text-stone-500",
    banner: "bg-stone-900 text-white",
    reactionBtn: "border border-stone-200 hover:bg-stone-100 text-stone-700",
    reactionBtnOn: "border border-stone-900 bg-stone-900 text-white",
    panel: "bg-white",
    toggleSelected: "bg-stone-900 text-white border-stone-900",
    toggleUnselected: "bg-white text-stone-600 border-stone-200 hover:bg-stone-50",
    overlay: "bg-black/40",
    statBox: "bg-stone-50 border border-stone-200",
  },
  dark: {
    page: "bg-stone-950 text-stone-100",
    muted: "text-stone-500",
    card: "bg-stone-900 border border-stone-800",
    text: "text-stone-300",
    strongText: "text-stone-50",
    chip: "bg-stone-800 text-stone-300",
    notChip: "bg-red-950 text-red-400",
    inputClass:
      "border border-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-100 bg-stone-900 text-stone-100 placeholder-stone-600",
    buttonPrimary: "bg-stone-100 text-stone-900 hover:bg-white",
    buttonPrimaryDisabled: "bg-stone-700 text-stone-400 cursor-not-allowed",
    daySelected: "bg-stone-100 text-stone-900 border-stone-100",
    dayDone: "bg-stone-800 border-stone-700 text-stone-300",
    dayDefault: "bg-stone-900 border-stone-800 text-stone-500",
    banner: "bg-stone-100 text-stone-900",
    reactionBtn: "border border-stone-700 hover:bg-stone-800 text-stone-300",
    reactionBtnOn: "border border-stone-100 bg-stone-100 text-stone-900",
    panel: "bg-stone-900",
    toggleSelected: "bg-stone-100 text-stone-900 border-stone-100",
    toggleUnselected: "bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800",
    overlay: "bg-black/60",
    statBox: "bg-stone-950 border border-stone-800",
  },
};

// Local calendar date, not UTC — parseDateStr/getDayIndex below both work in
// local time, and toISOString() is UTC, so using it here meant the "day"
// silently rolled over at UTC midnight instead of the visitor's own midnight.
function getDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/*
  Google sign-in and account-linking both redirect back with the outcome
  encoded in the URL rather than as a normal return value — Supabase puts
  errors (e.g. linking a Google identity that's already tied to another
  account) in the query string or hash as `error_description`. Read it
  once on mount and strip it so a refresh doesn't re-show a stale error.
*/
function consumeAuthRedirectError() {
  const params = new URLSearchParams(window.location.search || window.location.hash.replace(/^#/, ""));
  const description = params.get("error_description");
  if (!description) return null;
  const code = params.get("error_code");
  const clean = window.location.origin + window.location.pathname;
  window.history.replaceState(null, "", clean);
  return { message: description.replace(/\+/g, " "), code };
}
function parseDateStr(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function getDayIndex(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}
function briefForDateStr(s) {
  return BRIEFS[getDayIndex(parseDateStr(s)) % BRIEFS.length];
}
function formatElapsed(sec) {
  const s = Math.max(0, sec || 0);
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}
function formatDayLabel(s) {
  const d = parseDateStr(s);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function DailyBriefApp() {
  const [loading, setLoading] = useState(true);
  const [needsAuthChoice, setNeedsAuthChoice] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [profile, setProfile] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);

  const todayStr = getDateStr(new Date());
  const [viewDate, setViewDate] = useState(todayStr);

  const [values, setValues] = useState({});
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  // True specifically when a "save progress with Google" attempt failed
  // because that Google account already belongs to a different profile —
  // the fix isn't retrying the link, it's signing into the account that
  // already exists.
  const [authConflict, setAuthConflict] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("idle");

  const startRef = useRef(null);
  const timerRef = useRef(null);
  const prevViewDateRef = useRef(todayStr);

  const theme = profile?.theme || "light";
  const t = THEME[theme];

  const brief = briefForDateStr(viewDate);
  const isToday = viewDate === todayStr;
  const submitted = !!(profile && profile.history && profile.history[viewDate]);

  const pastDays = Array.from({ length: PAST_DAYS_COUNT }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (PAST_DAYS_COUNT - 1 - i));
    return getDateStr(d);
  });

  const historyEntries = profile ? Object.entries(profile.history || {}) : [];
  const times = historyEntries
    .map(([, h]) => h.seconds)
    .filter((n) => typeof n === "number" && n > 0);
  const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const bestTime = times.length ? Math.min(...times) : null;
  const totalCompleted = historyEntries.length;
  const longestStreak = Math.max(profile?.bestStreak || 0, profile?.streak || 0);

  // Runs once a session (guest or Google) is confirmed to exist — loads
  // whatever's tied to that account, or asks for a name if this is its
  // first time here.
  const afterAuth = async () => {
    try {
      const [p, info] = await Promise.all([loadProfile(), getAccountInfo()]);
      setAccountInfo(info);
      if (p) {
        setProfile(p);
        const entry = p.history && p.history[todayStr];
        if (entry) {
          setValues(entry.values || {});
          loadFeed(todayStr);
        }
      } else {
        setNeedsName(true);
      }
    } catch (e) {
      setError(e?.message || "Couldn't reach the server.");
      setAuthConflict(false);
    } finally {
      setLoading(false);
      setNeedsAuthChoice(false);
    }
  };

  // initial load: only proceed straight into the app if a session already
  // exists (a returning guest or a signed-in user, including landing back
  // here right after a Google redirect) — otherwise ask which one to start.
  useEffect(() => {
    (async () => {
      try {
        const redirectError = consumeAuthRedirectError();
        if (redirectError) {
          setError(redirectError.message);
          setAuthConflict(redirectError.code === "identity_already_exists");
        }

        const user = await getExistingUser();
        if (!user) {
          setNeedsAuthChoice(true);
          setLoading(false);
          return;
        }
        await afterAuth();
      } catch (e) {
        setError(e?.message || "Couldn't reach the server.");
        setAuthConflict(false);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseGuest = async () => {
    setError("");
    setAuthConflict(false);
    setLoading(true);
    try {
      await continueAsGuest();
      await afterAuth();
    } catch (e) {
      setError(e?.message || "Couldn't continue as guest.");
      setAuthConflict(false);
      setLoading(false);
    }
  };

  const chooseGoogle = () => {
    setError("");
    setAuthConflict(false);
    signInWithGoogle();
  };

  const upgradeToGoogle = () => {
    linkGoogleAccount();
  };

  // The fix for "this Google account already belongs to another profile":
  // sign into that profile directly rather than trying to merge into it.
  // This abandons whatever local guest session is currently active — its
  // data isn't deleted, just no longer reachable from this browser.
  const signInToExistingAccount = () => {
    setError("");
    setAuthConflict(false);
    signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  // when the viewed date changes (after the initial mount), reset the form/timer.
  // Compares against the previous value rather than an effect-ran-once flag —
  // the latter breaks under React StrictMode's dev-mode double-invoke, which
  // fires this on mount too and would wipe state (like a fresh auth error)
  // the very effect right after it just set.
  useEffect(() => {
    if (prevViewDateRef.current === viewDate) return;
    prevViewDateRef.current = viewDate;

    if (timerRef.current) clearInterval(timerRef.current);
    startRef.current = null;
    setElapsed(0);
    setError("");
    setAuthConflict(false);

    const entry = profile?.history?.[viewDate];
    if (entry) {
      setValues(entry.values || {});
      setFeed([]);
      loadFeed(viewDate);
    } else {
      setValues({});
      setFeed([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate]);

  useEffect(() => {
    return () => timerRef.current && clearInterval(timerRef.current);
  }, []);

  const createProfile = async () => {
    if (!nameInput.trim()) return;
    try {
      const p = await createProfileRow(nameInput.trim());
      setProfile(p);
      setNeedsName(false);
    } catch (e) {
      setError("Couldn't save that name. Check your connection and try again.");
      setAuthConflict(false);
    }
  };

  const loadFeed = async (dateKey) => {
    setFeedLoading(true);
    try {
      setFeed(await fetchFeed(dateKey));
    } catch (e) {
      // keep whatever's already showing rather than wiping it on a failed fetch
    } finally {
      setFeedLoading(false);
    }
  };

  const startTimerIfNeeded = () => {
    if (startRef.current || submitted) return;
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  const handleChange = (key, val) => {
    startTimerIfNeeded();
    setValues((v) => ({ ...v, [key]: val }));
  };

  const allFilled = brief.deliverables.every(
    (d) => (values[d.key] || "").trim().length > 0
  );

  const handleSubmit = async () => {
    if (!allFilled || !profile) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const finalElapsed = startRef.current
      ? Math.floor((Date.now() - startRef.current) / 1000)
      : 0;

    let newProfile;
    if (isToday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = getDateStr(yesterday);
      const newStreak = profile.lastDate === yStr ? profile.streak + 1 : 1;
      newProfile = {
        ...profile,
        streak: newStreak,
        bestStreak: Math.max(profile.bestStreak || 0, newStreak),
        lastDate: viewDate,
        history: {
          ...profile.history,
          [viewDate]: { briefId: brief.id, values, seconds: finalElapsed },
        },
      };
    } else {
      newProfile = {
        ...profile,
        history: {
          ...profile.history,
          [viewDate]: { briefId: brief.id, values, seconds: finalElapsed, backfilled: true },
        },
      };
    }
    setProfile(newProfile);

    try {
      await submitEntry({
        name: profile.name,
        dateStr: viewDate,
        briefId: brief.id,
        values,
        seconds: finalElapsed,
        backfilled: !isToday,
      });
      if (isToday) {
        await updateProfile({
          streak: newProfile.streak,
          bestStreak: newProfile.bestStreak,
          lastDate: newProfile.lastDate,
        });
      }
      await loadFeed(viewDate);
    } catch (e) {
      setProfile(profile);
      setError("Couldn't submit that. Check your connection and try again.");
      setAuthConflict(false);
    }
  };

  const react = async (entryId, tag) => {
    const entry = feed.find((e) => e.id === entryId);
    if (!entry) return;
    const wasOn = !!entry.mine?.[tag];

    // Optimistic: the button should respond instantly, and a failed
    // reaction is not worth interrupting the reader over.
    setFeed((prev) =>
      prev.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              mine: { ...e.mine, [tag]: !wasOn },
              reactions: {
                ...e.reactions,
                [tag]: Math.max(0, (e.reactions?.[tag] || 0) + (wasOn ? -1 : 1)),
              },
            }
      )
    );

    try {
      await toggleReaction(entryId, tag, wasOn);
    } catch (e) {
      setFeed((prev) =>
        prev.map((e) =>
          e.id !== entryId
            ? e
            : {
                ...e,
                mine: { ...e.mine, [tag]: wasOn },
                reactions: {
                  ...e.reactions,
                  [tag]: Math.max(0, (e.reactions?.[tag] || 0) + (wasOn ? 1 : -1)),
                },
              }
        )
      );
    }
  };

  const setThemeAndSave = async (nextTheme) => {
    if (!profile) return;
    setProfile({ ...profile, theme: nextTheme });
    try {
      await updateProfile({ theme: nextTheme });
    } catch (e) {
      // theme is cosmetic; fail silently
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || !profile) return;
    setFeedbackStatus("sending");
    try {
      await sendFeedback({ type: feedbackType, text: feedbackText.trim() });
      setFeedbackStatus("sent");
      setFeedbackText("");
    } catch (e) {
      setFeedbackStatus("error");
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Almost there</h1>
          <p className="text-stone-600 text-sm mb-4">
            Daily Brief needs a Supabase project to store submissions. Create a free one, run{" "}
            <code className="bg-stone-200 rounded px-1">supabase/schema.sql</code> in its SQL
            editor, enable anonymous sign-ins, then add a{" "}
            <code className="bg-stone-200 rounded px-1">.env</code> file:
          </p>
          <pre className="bg-stone-900 text-stone-100 rounded-lg p-4 text-xs overflow-x-auto">
            {"VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ..."}
          </pre>
          <p className="text-stone-500 text-sm mt-4">Then restart the dev server.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-400 text-sm">
        Loading…
      </div>
    );
  }

  if (needsAuthChoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Daily Brief</h1>
          <p className="text-stone-500 mb-6 text-sm">
            A daily copywriting brief, same for everyone, written against the clock.
          </p>
          <button
            onClick={chooseGoogle}
            className="w-full bg-stone-900 text-white rounded-lg py-3 font-medium hover:bg-stone-800 mb-3"
          >
            Sign in with Google
          </button>
          <button
            onClick={chooseGuest}
            className="w-full border border-stone-300 text-stone-700 rounded-lg py-3 font-medium hover:bg-stone-100"
          >
            Continue as guest
          </button>
          <p className="text-xs text-stone-400 mt-4">
            Guest progress stays on this device only. Sign in to keep your streak across devices.
          </p>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  if (needsName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Pick a name</h1>
          <p className="text-stone-500 mb-6 text-sm">
            This is how others will see you in the room.
          </p>
          <input
            autoFocus
            className="w-full border border-stone-300 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-stone-900"
            placeholder="e.g. Jordan"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProfile()}
          />
          <button
            onClick={createProfile}
            disabled={!nameInput.trim()}
            className="w-full bg-stone-900 text-white rounded-lg py-3 font-medium hover:bg-stone-800 disabled:bg-stone-300"
          >
            Start writing
          </button>
          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6 text-center">
        <div className="max-w-sm">
          <p className="text-stone-900 font-medium mb-2">Couldn't load your profile</p>
          <p className="text-stone-500 text-sm mb-4">{error || "Something went wrong."}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-stone-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-stone-800"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  const others = feed.filter((e) => e.userId !== profile.id);

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <p className={`text-xs uppercase tracking-wide ${t.muted}`}>
              {isToday ? "Daily Brief" : "Catching up"}
            </p>
            <h1 className="text-lg font-semibold">{formatDayLabel(viewDate)}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-orange-500 font-medium">
              <Flame size={18} />
              <span>{profile.streak}</span>
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className={`p-2 rounded-lg ${t.chip} hover:opacity-80`}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {error && (
          <div className={`rounded-lg px-4 py-3 mb-6 text-sm ${t.notChip}`}>
            <div className="flex items-start justify-between gap-3">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError("");
                  setAuthConflict(false);
                }}
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
            {authConflict && (
              <button
                onClick={signInToExistingAccount}
                className="mt-2 text-sm font-medium underline underline-offset-2"
              >
                Sign in with that Google account instead
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {pastDays.map((d) => {
            const isSelected = d === viewDate;
            const done = !!profile?.history?.[d];
            const dObj = parseDateStr(d);
            return (
              <button
                key={d}
                onClick={() => setViewDate(d)}
                className={
                  "flex-shrink-0 flex flex-col items-center justify-center w-11 h-14 rounded-lg border text-xs " +
                  (isSelected ? t.daySelected : done ? t.dayDone : t.dayDefault)
                }
              >
                <span>{dObj.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <span className="font-medium">{dObj.getDate()}</span>
                {done && (
                  <Check size={10} className={isSelected ? "" : "text-green-600"} />
                )}
              </button>
            );
          })}
        </div>

        {!isToday && (
          <button
            onClick={() => setViewDate(todayStr)}
            className={`flex items-center gap-1.5 text-sm ${t.muted} hover:opacity-80 mb-4`}
          >
            <ArrowLeft size={14} />
            Back to today
          </button>
        )}

        <div className={`rounded-2xl p-6 mb-6 ${t.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className={t.muted} />
            <span className={`text-xs uppercase tracking-wide ${t.muted}`}>
              {isToday ? "Today's client" : "The client"}
            </span>
          </div>
          <h2 className={`text-xl font-semibold mb-3 ${t.strongText}`}>{brief.brand}</h2>

          <div className="mb-4">
            <p className={`text-xs uppercase tracking-wide ${t.muted} mb-1`}>What it is</p>
            <p className={`text-sm leading-relaxed ${t.text}`}>
              <span className={`font-semibold ${t.strongText}`}>{brief.productName}</span>
              {" — "}
              {brief.product}
            </p>
          </div>

          <div className="mb-4">
            <p className={`text-xs uppercase tracking-wide ${t.muted} mb-1`}>Who it's for</p>
            <p className={`text-sm leading-relaxed ${t.text}`}>{brief.audience}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {brief.tone.map((tone) => (
              <span key={tone} className={`text-xs px-2.5 py-1 rounded-full ${t.chip}`}>
                {tone}
              </span>
            ))}
            <span className={`text-xs px-2.5 py-1 rounded-full ${t.notChip}`}>
              not: {brief.notTone}
            </span>
          </div>

          <div>
            <p className={`text-xs uppercase tracking-wide ${t.muted} mb-1`}>The campaign</p>
            <p className={`text-sm leading-relaxed ${t.text}`}>{brief.campaign}</p>
          </div>
        </div>

        {!submitted && (
          <div className={`flex items-center gap-2 text-sm ${t.muted} mb-4`}>
            <Clock size={15} />
            <span>{startRef.current ? formatElapsed(elapsed) : "Timer starts when you write"}</span>
          </div>
        )}

        {!submitted ? (
          <div className="space-y-5">
            {brief.deliverables.map((d) => (
              <div key={d.key}>
                <label className={`block text-sm font-medium mb-1.5 ${t.strongText}`}>
                  {d.label}
                </label>
                {d.type === "short" ? (
                  <input
                    className={`w-full rounded-lg px-4 py-2.5 ${t.inputClass}`}
                    placeholder={d.placeholder}
                    value={values[d.key] || ""}
                    onChange={(e) => handleChange(d.key, e.target.value)}
                  />
                ) : (
                  <textarea
                    className={`w-full rounded-lg px-4 py-2.5 h-24 resize-none ${t.inputClass}`}
                    placeholder={d.placeholder}
                    value={values[d.key] || ""}
                    onChange={(e) => handleChange(d.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={!allFilled}
              className={`w-full rounded-lg py-3 font-medium ${
                allFilled ? t.buttonPrimary : t.buttonPrimaryDisabled
              }`}
            >
              {isToday ? "Submit today's work" : "Submit for this day"}
            </button>
            {!isToday && (
              <p className={`text-xs text-center ${t.muted}`}>
                Backfilling a past day joins that day's room but won't affect your streak.
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className={`rounded-2xl p-5 mb-3 flex items-center gap-2 ${t.banner}`}>
              <Check size={18} />
              <span className="font-medium">
                Submitted in {formatElapsed(profile.history[viewDate]?.seconds || 0)}
              </span>
            </div>

            <div className={`rounded-2xl p-5 mb-6 ${t.card}`}>
              <p className={`text-xs uppercase tracking-wide ${t.muted} mb-3`}>Your submission</p>
              <div className="space-y-3">
                {brief.deliverables.map((d) => (
                  <div key={d.key}>
                    <p className={`text-xs mb-0.5 ${t.muted}`}>{d.label}</p>
                    <p className={`text-sm whitespace-pre-line ${t.text}`}>{values[d.key]}</p>
                  </div>
                ))}
              </div>
            </div>

            <h3 className={`text-sm uppercase tracking-wide ${t.muted} mb-3`}>
              The room ({others.length})
            </h3>

            {feedLoading ? (
              <p className={`text-sm ${t.muted}`}>Loading the room…</p>
            ) : others.length === 0 ? (
              <p className={`text-sm ${t.muted}`}>
                No one else has submitted yet — check back later.
              </p>
            ) : (
              <div className="space-y-3">
                {others.map((entry) => (
                  <div key={entry.id} className={`rounded-2xl p-5 ${t.card}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-medium text-sm ${t.strongText}`}>{entry.name}</span>
                      <span className={`text-xs ${t.muted}`}>{formatElapsed(entry.seconds)}</span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {brief.deliverables.map((d) => (
                        <div key={d.key}>
                          <p className={`text-xs mb-0.5 ${t.muted}`}>{d.label}</p>
                          <p className={`text-sm whitespace-pre-line ${t.text}`}>
                            {entry.values[d.key]}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {REACTIONS.map((tag) => {
                        const on = !!entry.mine?.[tag];
                        return (
                          <button
                            key={tag}
                            onClick={() => react(entry.id, tag)}
                            aria-pressed={on}
                            className={`text-xs rounded-full px-3 py-1 flex items-center gap-1 ${
                              on ? t.reactionBtnOn : t.reactionBtn
                            }`}
                          >
                            <Heart size={11} fill={on ? "currentColor" : "none"} />
                            {tag}
                            {entry.reactions?.[tag] ? ` · ${entry.reactions[tag]}` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {menuOpen && (
        <div
          className={`fixed inset-0 flex justify-end z-50 ${t.overlay}`}
          onClick={() => setMenuOpen(false)}
        >
          <div
            className={`w-80 max-w-full h-full overflow-y-auto p-6 ${t.panel}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-lg font-semibold ${t.strongText}`}>Menu</h2>
              <button onClick={() => setMenuOpen(false)} className={t.muted}>
                <X size={20} />
              </button>
            </div>

            <section className="mb-8">
              <h3 className={`text-xs uppercase tracking-wide ${t.muted} mb-3`}>Account</h3>
              {accountInfo?.isGuest ? (
                <div className={`rounded-lg p-3 ${t.statBox}`}>
                  <p className={`text-sm ${t.text} mb-2`}>
                    Playing as a guest — your streak only lives on this device.
                  </p>
                  <button
                    onClick={upgradeToGoogle}
                    className={`w-full rounded-lg py-2 text-sm font-medium ${t.buttonPrimary}`}
                  >
                    Save progress with Google
                  </button>
                </div>
              ) : (
                <div className={`rounded-lg p-3 ${t.statBox}`}>
                  <p className={`text-sm ${t.text} mb-2`}>
                    Signed in as {accountInfo?.email || "…"}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className={`w-full rounded-lg py-2 text-sm font-medium border ${t.toggleUnselected}`}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </section>

            <section className="mb-8">
              <h3 className={`flex items-center gap-2 text-xs uppercase tracking-wide ${t.muted} mb-3`}>
                <BarChart3 size={14} /> Your stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 ${t.statBox}`}>
                  <p className={`text-xs ${t.muted} mb-1`}>Current streak</p>
                  <p className={`text-lg font-semibold ${t.strongText}`}>{profile.streak}</p>
                </div>
                <div className={`rounded-lg p-3 ${t.statBox}`}>
                  <p className={`text-xs ${t.muted} mb-1`}>Longest streak</p>
                  <p className={`text-lg font-semibold ${t.strongText}`}>{longestStreak}</p>
                </div>
                <div className={`rounded-lg p-3 ${t.statBox}`}>
                  <p className={`text-xs ${t.muted} mb-1`}>Briefs completed</p>
                  <p className={`text-lg font-semibold ${t.strongText}`}>{totalCompleted}</p>
                </div>
                <div className={`rounded-lg p-3 ${t.statBox}`}>
                  <p className={`text-xs ${t.muted} mb-1`}>Avg. time</p>
                  <p className={`text-lg font-semibold ${t.strongText}`}>
                    {avgTime != null ? formatElapsed(avgTime) : "—"}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${t.statBox} col-span-2`}>
                  <p className={`text-xs ${t.muted} mb-1`}>Best time</p>
                  <p className={`text-lg font-semibold ${t.strongText}`}>
                    {bestTime != null ? formatElapsed(bestTime) : "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className={`text-xs uppercase tracking-wide ${t.muted} mb-3`}>Appearance</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setThemeAndSave("light")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg border py-2 ${
                    theme === "light" ? t.toggleSelected : t.toggleUnselected
                  }`}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  onClick={() => setThemeAndSave("dark")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg border py-2 ${
                    theme === "dark" ? t.toggleSelected : t.toggleUnselected
                  }`}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
            </section>

            <section>
              <h3 className={`flex items-center gap-2 text-xs uppercase tracking-wide ${t.muted} mb-3`}>
                <Bug size={14} /> Bugs & suggestions
              </h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setFeedbackType("bug")}
                  className={`flex-1 text-sm rounded-lg border py-2 ${
                    feedbackType === "bug" ? t.toggleSelected : t.toggleUnselected
                  }`}
                >
                  Bug
                </button>
                <button
                  onClick={() => setFeedbackType("suggestion")}
                  className={`flex-1 text-sm rounded-lg border py-2 ${
                    feedbackType === "suggestion" ? t.toggleSelected : t.toggleUnselected
                  }`}
                >
                  Suggestion
                </button>
              </div>
              <textarea
                value={feedbackText}
                onChange={(e) => {
                  setFeedbackText(e.target.value);
                  if (feedbackStatus !== "idle") setFeedbackStatus("idle");
                }}
                placeholder={
                  feedbackType === "bug"
                    ? "What happened, and what did you expect instead?"
                    : "What would make this better?"
                }
                className={`w-full rounded-lg px-3 py-2.5 h-24 resize-none text-sm mb-3 ${t.inputClass}`}
              />
              <button
                onClick={submitFeedback}
                disabled={!feedbackText.trim() || feedbackStatus === "sending"}
                className={`w-full rounded-lg py-2.5 text-sm font-medium ${
                  feedbackText.trim() ? t.buttonPrimary : t.buttonPrimaryDisabled
                }`}
              >
                {feedbackStatus === "sending" ? "Sending…" : "Send"}
              </button>
              {feedbackStatus === "sent" && (
                <p className="text-sm text-green-600 mt-2">Thanks — got it.</p>
              )}
              {feedbackStatus === "error" && (
                <p className="text-sm text-red-500 mt-2">
                  Couldn't send that right now — try again in a bit.
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
