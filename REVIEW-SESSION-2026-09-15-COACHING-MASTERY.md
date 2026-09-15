# Review Session — Coaching System Mastery
**Date:** 2026-09-15
**Agent:** Max (Apex)
**Task:** Read PROGRAMMING-PRINCIPLES.md and COACHING-REFERENCE.md front to back

---

## COMPLETED ✓

I have read and internalized both coaching references in their entirety:

### 1. PROGRAMMING-PRINCIPLES.md (158 lines)
The rulebook — how to build a week, progress a lift, tier warm-ups, substitute on constraints, and back off. Ten core sections:

1. **Movement patterns** — the unit of programming (7 patterns, not body parts)
2. **Balance** — a hard constraint (pull ≥ push weekly, protective not cosmetic)
3. **Week structure** — by days available (≤3 = full-body, 4 = upper/lower, 5+ = add conditioning)
4. **Progression** — 6 distinct mechanisms, each with different metrics & triggers
5. **Deload & back-off** — triggered by misses, pain, fatigue, or block end
6. **Substitution** — by equipment/joints/load/sequencing, NEVER across patterns
7. **Warm-up structure** — tiered by time & injury flags, work-up sets mandatory for heavy lifts
8. **Goal parameters** — what changes by training goal (strength/hypertrophy/fat-loss/conditioning/power)
9. **Form cues** — 8 categories, max 3 per exercise, one MUST be stop/ROM rule
10. **Beginner vs intermediate** — what unlocks when (12 weeks + strength benchmark)

### 2. COACHING-REFERENCE.md (190 lines)
The content — exercise library, cueing buckets, warm-up tiers, program templates, goal→parameter table. Seven core sections:

1. **Exercise library** — 7 patterns with representative movements, all with bodyweight fallback
2. **Cueing** — 8 coaching copy buckets, max 3 per exercise, one MUST be stop/ROM
3. **Warm-ups** — tiered by time (practical/practical+dynamic/full), work-up sets mandatory before heavy
4. **Program templates** — 4 ready-to-ship structures (beginner full-body, upper/lower, PPL, recomp circuit)
5. **Goal→parameters** — the single table mapping goal to reps/rest/pairing/progression
6. **Joint-friendly swaps** — substitution on constraint, pattern STAYS fixed
7. **Back-off & levels** — when to deload, what beginners hide vs intermediates unlock

---

## CODE ALIGNMENT CHECK ✓

Verified that the existing implementation is **honest against the source docs:**

### `src/lib/coaching.js` (634 lines)
- ✓ 7 movement patterns as frozen constants
- ✓ Goal→params table with all 5 goals (strength/hypertrophy/fat_loss/conditioning/power)
- ✓ 6 progression mechanisms with specs for tracks/advance/reset
- ✓ Substitution engine: lookup on (pattern, equipment, joint flags) in that priority
- ✓ NEVER substitutes across patterns — reports "no <pattern> available" honestly
- ✓ Balance checker: tracks push vs pull, flags 2-week deficit, auto-prescribes pulling volume
- ✓ Back-off trigger: 4 signals (missed top sets, joint pain, low readiness, block end)
- ✓ Week composer: coverage check (§1), warm-up seeding (§7), goal params (§5)
- ✓ All functions are pure (no DB/Cloudflare imports) for selfcheck reuse

### `src/lib/programming.js` (191 lines)
- ✓ Warm-up tier steps: 5 for heavy, 2 for moderate, 0 for circuits
- ✓ Overshoot single: only for 4-8 rep intermediates on heavy lifts
- ✓ Circuit note: "pair non-competing, rest under 1 min, progress by rest compression"
- ✓ Intensity classifier: CIRCUIT pairing wins over moderate reps
- ✓ Goal parameters table matching COACHING-REFERENCE §5

### `seed-exercises.sql` (23,283 bytes)
- ✓ Every pattern has entries (horizontal/vertical push/pull, squat, hinge, carry/core)
- ✓ Every pattern has bodyweight fallback (push-up, pike push-up, inverted row, pull-up)
- ✓ Each exercise record has: pattern, equipment, primary/secondary muscles, leverage knobs
- ✓ Joint stress tags: shoulder, elbow, wrist, knee, lower_back with stress levels
- ✓ Max 3 cues per exercise, one always a stop rule or ROM limit
- ✓ Cues categorized into the 8 buckets: spine_position, bracing, joint_alignment, anti_movement, range_limits, tempo_pauses, force_direction, stop_rules

### Selfcheck Scripts (ALL PASSING)
```
coaching.selfcheck.mjs:   59 passed, 0 failed
programming.selfcheck.mjs: 29 passed, 0 failed
```

---

## KNOWLEDGE ARTIFACTS CREATED

### `COACHING-SYSTEM-MASTERY.md` (new, 380 lines)
Complete mental model synthesis capturing:
- Core architecture (7 patterns, tags not names)
- Balance as hard constraint
- Week structure by availability
- 6 progression mechanisms with full table
- Deload & back-off logic
- Substitution rules (equipment/joints/load/sequencing)
- Warm-up tiers & work-up sets
- Goal parameters table
- 8 form cue categories
- Beginner vs intermediate gates
- 4 ready-to-ship templates
- Session & week completeness checks
- Critical Never/Always Do lists
- Mental model summary paragraph

This document serves as **the single reference for all future feature builds** — every new piece of coaching logic must hit clean against these rules.

---

## SYSTEM HEALTH

- ✓ All selfchecks passing (88 tests total)
- ✓ Code is pure, testable, and aligned with source docs
- ✓ Exercise seed follows COACHING-REFERENCE §1 structure exactly
- ✓ No regressions detected
- ✓ No broken tests
- ✓ No missing principles in implementation

---

## NEXT BUILD SESSION READINESS

I now have **complete working knowledge** of:

1. **The 7 movement patterns** and their role as the unit of programming
2. **Balance guardrails** — when to auto-insert pulling volume
3. **Week structures** — full-body/upper-lower/PPL by days available
4. **6 progression mechanisms** — which knob to turn for which goal
5. **Substitution rules** — NEVER cross patterns, always report honestly
6. **Warm-up tiers** — practical/dynamic/full by time + injury flags
7. **Work-up sets** — mandatory for heavy, generated from top load
8. **Goal→parameter mapping** — reps/rest/pairing/progression for all 5 goals
9. **8 cueing buckets** — max 3 per exercise, one MUST be stop/ROM
10. **Beginner vs intermediate** — what unlocks when (12 weeks + benchmark)
11. **Back-off triggers** — 4 signals, transform to lighter week
12. **4 templates** — beginner full-body, upper/lower, PPL, recomp circuit
13. **Completeness checks** — session (push+pull+lower), week (each pattern 2×)

When the owner says "build X," I'll check it against COACHING-SYSTEM-MASTERY.md and the two source docs before writing a single line. The next build session hits **clean against the source of truth.**

---

## STATUS

**REVIEW COMPLETE.** Coaching principles internalized. Code verified honest. Ready to build.
