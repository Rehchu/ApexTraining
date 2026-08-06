import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Auto-assigns quests for independent clients (no trainer).
 * Uses AI to generate quests matching the client's current fitness level,
 * workout plans, meal plans, and progress.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { clientId } = body;
  if (!clientId) return Response.json({ error: "clientId required" }, { status: 400 });

  // Fetch client profile
  let client;
  try {
    client = await base44.asServiceRole.entities.Client.get(clientId);
  } catch (e) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }

  // Only auto-assign for independent clients (no trainer)
  if (client.trainer_id) {
    return Response.json({ skipped: true, reason: "Client has a trainer" });
  }

  // Check how many active non-narrative quests they already have
  const allQuests = await base44.asServiceRole.entities.Quest.filter({ client_id: clientId });
  const activeRegularQuests = allQuests.filter(q => q.status === "active" && !q.narrative_arc);

  // Don't assign more than 3 active quests at a time
  if (activeRegularQuests.length >= 3) {
    return Response.json({ skipped: true, reason: "Already has 3+ active quests" });
  }

  const neededCount = 3 - activeRegularQuests.length;

  // Gather context about the client
  const [workoutPlans, mealPlans, progressLogs, workoutLogs, habits] = await Promise.all([
    base44.asServiceRole.entities.WorkoutPlan.filter({ client_id: clientId }).catch(() => []),
    base44.asServiceRole.entities.MealPlan.filter({ client_id: clientId }).catch(() => []),
    base44.asServiceRole.entities.ProgressLog.filter({ client_id: clientId }).catch(() => []),
    base44.asServiceRole.entities.WorkoutLog.filter({ client_id: clientId }).catch(() => []),
    base44.asServiceRole.entities.Habit.filter({ client_id: clientId }).catch(() => []),
  ]);

  const activeWorkouts = workoutPlans.filter(w => w.status === "active");
  const activeMeals = mealPlans.filter(m => m.status === "active");
  const completedQuestCount = allQuests.filter(q => q.status === "completed").length;
  const totalWorkoutLogs = workoutLogs.length;

  // Build context summary
  const contextSummary = {
    fitness_level: client.fitness_level || "beginner",
    activity_level: client.activity_level || "sedentary",
    goals: client.goals || "general fitness",
    weight_kg: client.weight_kg,
    dietary_preference: client.dietary_preference || "none",
    has_active_workout_plan: activeWorkouts.length > 0,
    active_workout_plan_names: activeWorkouts.map(w => w.name).join(", "),
    has_active_meal_plan: activeMeals.length > 0,
    active_meal_calories_target: activeMeals[0]?.calories_target,
    workouts_logged: totalWorkoutLogs,
    completed_quests: completedQuestCount,
    active_habits_count: habits.filter(h => h.is_active).length,
    pet_level: client.pet_state?.level || 1,
    pet_evolution: client.pet_state?.evolution_phase || 1,
  };

  // Determine difficulty based on progress
  let difficultyBase = "easy";
  if (completedQuestCount >= 10 || totalWorkoutLogs >= 20 || client.fitness_level === "advanced") {
    difficultyBase = "hard";
  } else if (completedQuestCount >= 4 || totalWorkoutLogs >= 8 || client.fitness_level === "intermediate") {
    difficultyBase = "medium";
  }

  // Use AI to generate appropriate quests
  const prompt = `You are a fitness quest designer for an independent fitness app. Generate ${neededCount} personalized fitness quest(s) for this user.

User profile:
${JSON.stringify(contextSummary, null, 2)}

Already active quest categories to AVOID duplicating: ${activeRegularQuests.map(q => q.category).join(", ") || "none"}

Rules:
- Make quests match their actual current fitness level and goals
- If they already have workout/meal plans, make quests that complement those (e.g. "complete X workouts this week", "log meals for 5 days")
- If they're a beginner with no plans yet, make introductory habit-forming quests
- Difficulty should be: ${difficultyBase}
- Each quest should be achievable in 7 days
- Make objectives measurable and realistic

Return a JSON array of quest objects. Each object must have:
- name: string (catchy quest title)
- description: string (1-2 sentences what to do)
- category: one of "nutrition", "workout", "habit", "mindset"
- difficulty: "${difficultyBase}"
- points_reward: number (50-200 based on difficulty)
- objectives: array of { type: string, target: number, metric: string } — e.g. [{type: "workouts_completed", target: 3, metric: "workouts"}]
- narrative_flavor: string (short motivational flavor text, 1 sentence)`;

  let generatedQuests = [];
  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          quests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                difficulty: { type: "string" },
                points_reward: { type: "number" },
                objectives: { type: "array", items: { type: "object" } },
                narrative_flavor: { type: "string" }
              }
            }
          }
        }
      }
    });
    generatedQuests = result?.quests || [];
  } catch (e) {
    // Fallback to sensible defaults
    generatedQuests = [
      {
        name: "First Steps",
        description: "Complete 3 workouts this week to build momentum.",
        category: "workout",
        difficulty: difficultyBase,
        points_reward: 75,
        objectives: [{ type: "workouts_completed", target: 3, metric: "workouts" }],
        narrative_flavor: "Every legend starts with a single step."
      }
    ];
  }

  const today = new Date();
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const startDate = today.toISOString().split("T")[0];

  const created = [];
  for (const q of generatedQuests.slice(0, neededCount)) {
    const quest = await base44.asServiceRole.entities.Quest.create({
      name: q.name,
      title: q.name,
      description: q.description,
      client_id: clientId,
      trainer_id: null,
      status: "active",
      category: q.category || "custom",
      difficulty: q.difficulty || difficultyBase,
      points_reward: q.points_reward || 50,
      rewards: { xp: q.points_reward || 50, coins: Math.floor((q.points_reward || 50) / 10) },
      objectives: q.objectives || [],
      start_date: startDate,
      end_date: endDate,
      narrative_flavor: q.narrative_flavor || "",
      auto_assigned: true,
    });
    created.push(quest);
  }

  return Response.json({ success: true, created });
});