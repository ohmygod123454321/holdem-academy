// Lightweight progress tracking (localStorage). Plain JS, attaches to window.
// Replaces the old hardcoded "mock" stats on the home page with real progress:
// which lessons you've opened, your practice-quiz accuracy, and replays run.
const Progress = (function () {
  const KEY = "hp-progress-v1";
  const LESSON_IDS = ["rules", "positions", "preflop", "odds", "stack", "tournament", "gto", "glossary"];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }

  function get() {
    const p = load();
    return {
      lessons: Array.isArray(p.lessons) ? p.lessons : [],
      quiz: p.quiz && typeof p.quiz === "object" ? p.quiz : {},
      replays: p.replays || 0,
      handsPlayed: p.handsPlayed || 0,
    };
  }

  function visitLesson(id) {
    if (!LESSON_IDS.includes(id)) return;
    const p = get();
    if (!p.lessons.includes(id)) { p.lessons.push(id); save(p); }
  }
  function recordQuiz(id, correct) {
    const p = get();
    p.quiz[id] = { correct: !!correct };
    save(p);
  }
  function addReplay() { const p = get(); p.replays = (p.replays || 0) + 1; save(p); }
  function addHand(n) { const p = get(); p.handsPlayed = (p.handsPlayed || 0) + (n || 1); save(p); }
  function reset() { save({}); }

  function summary() {
    const p = get();
    const lessonsDone = LESSON_IDS.filter(id => p.lessons.includes(id)).length;
    const quizIds = Object.keys(p.quiz);
    const practiceDone = quizIds.length;
    const correct = quizIds.filter(id => p.quiz[id] && p.quiz[id].correct).length;
    const accuracy = practiceDone ? Math.round((correct / practiceDone) * 100) : 0;
    // a simple level derived from how much has been done
    const xp = lessonsDone + practiceDone + Math.floor((p.handsPlayed || 0) / 20);
    const level = xp >= 24 ? "職業" : xp >= 12 ? "進階" : xp >= 5 ? "中階" : "新手";
    return {
      lessonsDone, lessonTotal: LESSON_IDS.length,
      practiceDone, correct, accuracy,
      mistakes: practiceDone - correct,
      replays: p.replays || 0,
      handsPlayed: p.handsPlayed || 0,
      level,
    };
  }

  return { get, visitLesson, recordQuiz, addReplay, addHand, reset, summary, LESSON_IDS };
})();

if (typeof window !== "undefined") window.Progress = Progress;
