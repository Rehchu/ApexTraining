For: Apex. Distilled from a reference the owner supplied; written from scratch, nothing reproduced.

# Programming Principles for Apex Coach Training

The reference is a catalogue of a hundred-odd sessions sorted by equipment and body part; those sessions are its copyrighted content and are not reproduced here. What transfers is the decision logic its contributors apply again and again in the short "why this works" paragraph before each session. This is that logic rewritten as product behaviour: inputs the app collects, outputs it should produce. Examples are mine.

---

## 1. The unit of programming is the movement pattern

The most reusable idea in the reference: a whole body is covered by three movement categories — a **push**, a **pull**, and a **squat/hinge** (deadlifts count as the same family). Pressing trains chest, shoulders, triceps; pulling trains back, rear shoulder, biceps, forearms; squatting and hinging train the entire lower body. The trunk is trained as a by-product whenever these are done with free weights, because it has to brace the spine.

**Product rules**

- Store every exercise with a *pattern* tag (horizontal/vertical push, horizontal/vertical pull, squat, hinge, carry, core-brace) and an *equipment* tag. Selection, substitution and balance logic run on tags, never on names.
- A session is complete when it covers push, pull and lower. A week is complete when each pattern appears at least twice. Flag any generated week that fails either check.
- Direct arm, calf or trap work is garnish appended *after* the pattern lifts. When a user asks for "an arm day," return an upper session that leads with a push and a pull and finishes with isolation, and say why.

## 2. Balance is a hard constraint

The reference repeats one warning: a body over-developed on one side (chest versus upper back, front versus rear shoulder) stalls, because it resists growth that raises injury risk — the book calls this one of the most avoidable plateaus. The shoulder chapter adds that shoulders are the likeliest joint to get hurt, especially in heavy pressers, so pulling and rear-shoulder work is protective, not cosmetic.

**Product rules**

- Track weekly pull sets against push sets. If pull falls below push two weeks running, auto-insert row/face-pull/reverse-fly-type movements and show the user the ratio.
- When a user reports "my chest stopped growing," run the balance ratio first, then check whether the antagonist pattern is trained at all.
- When a user reports shoulder discomfort on pressing, reduce pressing intensity and *raise* upper-back volume that week rather than simply deleting pressing.

## 3. Structuring a week

The reference's default for the time-poor or inexperienced is three full-body sessions on non-consecutive days, with two rest days before the cycle repeats. Variety comes from rotating rep schemes across the three sessions (heavy, moderate, high-rep), not from new exercises. Two other cadences recur: short circuit or conditioning sessions may repeat up to four times a week on alternating days; genuinely heavy sessions on a main lift are capped at twice a week, three days apart. Small muscles get less weekly volume than large ones; specialty add-ons run once a week at the end of a related session, a day away from anything training the same muscles.

**Product rules**

- Onboarding asks *days available* and *minutes per session*. Three days or fewer → full-body rotation. Four → upper/lower alternating. Five or more → same, with extra days assigned to conditioning, not more lifting.
- Never place two heavy sessions on consecutive days, or a heavy lower day after a sprint/interval day.
- Rotate rep schemes across the week automatically and show the rotation, so Friday feeling different from Monday reads as design.
- On a missed session, shift the rotation rather than skip the missed scheme; every scheme should still be touched inside any ten-day window.

## 4. Progression: pick *which* knob to turn

"Progressive overload" in the reference means more reps, sets or weight over time. What matters for a product is that the book uses several *distinct* mechanisms, each implying a different metric to log and a different trigger for the next step.

| Mechanism | Tracks | Advance when | Reset when |
|---|---|---|---|
| Load step | top-set weight | target reps hit at prescribed rest | two consecutive misses → drop 5–10% |
| Total-rep target | reps accumulated at a fixed load, any number of sets | total reached under the set cap | cap hit → raise load, drop target to the floor |
| Rest compression | seconds between sets | every ~2 weeks, cut a fixed slice | rest reaches floor → raise load, restore rest |
| Volume ramp | sets per exercise | add a set every 1–2 weeks | block ends at ~6 weeks |
| Density | total reps in a fixed window | more work than last time, same window | change the exercise pair |
| Scheme rotation | which set×rep combination was used | cycle combinations with a similar rep total | full cycle done → add load |

**Product rules**

- Assign a mechanism per goal. Strength → load step and scheme rotation. Hypertrophy → total-rep or volume ramp. Fat-loss/recomposition → rest compression. Time-poor → density.
- Make the mechanism's metric the headline number. A density user sees "reps in 20 minutes," not bar weight.
- When a user reports "I only have one pair of dumbbells," switch that exercise to total-rep or density, since load stepping is unavailable.
- Time-box every block. The reference's specialty blocks run about six weeks: long enough to force adaptation, short enough that the body doesn't habituate. After the block, change the scheme or the variant — not everything at once.

## 5. Deload and backing off

The reference rarely says "deload," but its recovery logic is explicit: stop sets a rep or two short of failure unless a protocol says otherwise; when reps can't be completed, rest briefly and finish rather than grind; ease into sprinting; keep running sessions short with recovery built in; and treat machines as the sensible choice for someone banged up.

**Product rules**

- Trigger a back-off week when any of these fire: two consecutive missed top sets on one lift; a joint-pain flag on two sessions in seven days; low sleep/soreness scores three sessions running; end of a six-week block.
- A back-off week keeps exercises and pattern coverage, drops load 10–20%, and removes the last set of everything. The session is not cancelled; the user still shows up.
- On "my knee/elbow/shoulder hurts," offer the joint-friendly variant first (§6) and a machine- or band-based session as a full alternative for the week.
- Baseline instruction everywhere: leave one or two reps in the tank. Failure is a labelled technique for intermediates on isolation work only.

## 6. Exercise selection and substitution

The reference's premise is that the *constraint* — equipment, space, time, joints — picks the exercise while the pattern stays fixed. Its substitution moves catalogue neatly:

**By equipment.** Same pattern, different tool: barbell → dumbbells → single dumbbell → band → suspension trainer → bodyweight → playground bar. Every pattern has a bodyweight fallback, even pulling.

**By joint tolerance.** A palms-facing grip for pressing when the shoulder complains, since it lets the upper arm clear the joint; a slight incline rather than flat; a curved bar instead of straight when wrists or elbows ache; machines when everything hurts, because they stabilise the load for you.

**By available load.** When weight is insufficient the book reaches for the same list: slow the tempo, work one limb at a time, shorten rest, run a circuit, raise reps, or change leverage (elevate feet, lengthen the body angle). Mismatched dumbbells are a feature: asymmetry makes the trunk work.

**By sequencing.** Heavy compound first, isolation last. A light activation move before a hard single-leg lift. Circuit pairings must be *non-competing* (upper with lower, push with pull) so fatigue doesn't carry over. In a fixed-load complex the weakest movement sets the load. When ability is unknown, prescribe reps for *time*, so strong and weak users both get a useful set.

**Product rules**

- Substitution is a lookup on (pattern, equipment, joint flags), in that priority. Never substitute across patterns; report "no pull available" rather than quietly swapping in a push.
- Each exercise record carries pattern, equipment, joint-stress tags (shoulder, elbow/wrist, knee, lower back), bilateral/unilateral, and a "leverage knob" describing how to make it harder without weight.
- On "the weight is too light," offer knobs in order: tempo → unilateral → rest compression → circuit → higher reps, and relabel progression to a non-load mechanism.
- On joint pain, filter out exercises with that joint's stress tag and surface the friendly variant with a one-line reason.
- Circuit generation rejects any adjacent pair sharing a primary muscle.

## 7. Warm-up structure

The reference tiers warm-ups by time available and injury history, and treats one component as non-negotiable.

- **Full tier** (an hour or more, or an injury history): soft-tissue work on habitual tight spots, a few minutes of easy pulse-raising, a dynamic sequence taking joints through the session's ranges, then static holds only for chronically tight areas.
- **Practical tier** (short on time): a few minutes on a cardio machine plus one or two mobility drills for hips and upper back.
- **Work-up sets** (mandatory before any heavy lift): start with an empty bar or trivial resistance, add weight in steps while cutting reps to save energy, arrive at the working load ready; rests stay short until loads get heavy. Two refinements: for a 4–8-rep working set, do a final single *slightly above* the working weight so the real set feels lighter; for a true max attempt, back off one set before climbing again, because loads feel heaviest near ninety percent and a lighter set restores confidence.
- Warm the whole body even on a split day. Interval sessions carry their own warm-up in the first easy rounds.

**Product rules**

- Ask *minutes available today* at session start. Under 45 → practical. 45–60 → practical plus dynamic sequence. Over 60 or injury flag → full.
- Generate work-up sets from the day's target load: four or five steps for a heavy top set, two for moderate, none for circuits. Apply the overshoot single only for 4–8-rep targets and intermediate users.
- A lower-body warm-up screen still includes one upper-body drill, and vice versa.

## 8. Strength, hypertrophy, conditioning: what changes

The reference's sessions differ by goal along four axes — reps, rest, pairing, and the thing you try to beat next time.

- **Strength**: low reps, heavy loads, sets whose reps sum to roughly two dozen on the main lift, long rests, straight sets, the first few sets treated as warm-ups so only the last couple are truly heavy. Progression is bar weight. Forced reps, dropsets and holds are explicitly demoted below "add weight."
- **Hypertrophy**: moderate reps (roughly eight to fifteen), three working sets as the sweet spot, deliberate tempo (slow lowering, a squeeze at the top), several angles per muscle, sets stopped shy of failure. Blood-flow tricks — stretching between sets, peak contractions — belong here.
- **Recomposition / fat loss**: same moderate reps, but paired upper-with-lower or push-with-pull with rests under a minute, on the reasoning that rising lactate drives the hormonal response. Progression is rest compression. The reference is blunt that long, slow cardio is *not* the efficient fat-loss tool; circuits and intervals are.
- **Conditioning**: intervals set as percentages of estimated max heart rate, work-to-rest ratios (2:1 for very short all-out efforts, 1:2 for longer), ladders that climb and descend, density blocks scored on work done in a window.
- **Power**: very few reps, maximum speed, implements that can be released (throws) so the body needn't decelerate. Light, fast barbell reps also clear sticking points.

**Product rules**

- The goal tag sets four defaults: rep range, rest range, pairing mode (straight / alternating / superset / circuit) and progression mechanism. Users may override one, but the app warns when the override contradicts the goal (a strength user cutting rest to 30 seconds).
- Heart-rate conditioning needs a max-HR estimate (220 minus age as fallback) and a no-monitor method: a six-second pulse count times ten.
- On "I want to lose fat, give me a running plan," offer a circuit or interval plan first with the trade-off explained, and still allow running for users who enjoy it.
- Power blocks are an intermediate-only add-on with an eased-in, hill-style progression.

## 9. Form-cue categories

The reference's exercise text uses a small repeating vocabulary. Grouped, it gives the app a taxonomy for coaching copy and pain triage:

1. **Spine position** — keep the natural lower-back arch; never round; don't go so deep the tailbone tucks or the lower back leaves the seat.
2. **Bracing** — abs braced, glutes squeezed, grip tight; this is how the trunk is trained on compounds.
3. **Joint alignment** — knees over feet, elbows in line with wrists, elbows tucked about forty-five degrees on presses, upper arms pinned on curls.
4. **Anti-movement** — hips level, shoulders square, no sway, twist or hip drop.
5. **Range-of-motion limits** — "as low as you can *without* losing X"; depth is always conditional on a spine or alignment cue.
6. **Tempo and pauses** — a one-second squeeze at the top, three-to-five-second lowering, a pause at the sticking point (the bottom of a squat is the book's favourite).
7. **Force direction** — drive the feet into the floor, explode through the hips.
8. **Stop rules** — end the set when form breaks; stop a rep or two before failure; rest briefly and finish rather than grind.

**Product rules**

- Each exercise carries at most three cues, one of which must be a stop rule or ROM limit.
- On a pain report, ask *where* and map the location to categories 1, 3 and 5 for that exercise before proposing a substitution.
- Form-feedback features classify user-reported issues into these eight buckets so coaching responses stay consistent across exercises.

## 10. Beginner versus intermediate

The reference's beginner prescription is unglamorous: three patterns, three sessions a week, straight sets, rotating rep ranges, machines allowed if they reduce risk. Pyramid sets (lighter and higher-rep first, heavier later) teach a movement while warming it up. Intermediates get the rest: upper/lower splits, body-part emphasis days that still obey the balance rule, max-effort work, supersets and trisets, dropsets ordered by mechanical advantage (hardest grip first), six-week specialty blocks, and "shock" protocols for a stale body part, used sparingly.

**Product rules**

- Classify a user as beginner until roughly twelve consecutive logged weeks *and* a load benchmark on the main lower-body lift (the reference's own "legs aren't growing" heuristic is a squat at one and a half times bodyweight; use a softer bar, but use one).
- Beginner mode hides supersets, dropsets, tempo beyond "control the lowering," max-effort days and specialty blocks. It shows full-body rotation, work-up sets, three cues per lift and one progression mechanism.
- Intermediate mode unlocks techniques one at a time, each with a block length and an exit condition.
- At any level, "same thing for months, stalled" gets a scheme rotation or a six-week block first, not a new exercise list.

---

### Summary for the product spec

Tag exercises by pattern, equipment, joint stress and leverage knob. Build weeks from patterns with a hard balance check. Let the goal tag set reps, rest, pairing and progression mechanism. Tier warm-ups by time and injury flags; always generate work-up sets for heavy lifts. Substitute on constraints, never across patterns. Time-box blocks at six weeks; back off on missed reps, pain flags or block end. Beginners get three patterns, three days, three cues; intermediates get one technique at a time with an exit condition.
