import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ARCS = [
  {
    arc: "Dragon's Awakening",
    icon: "🐉",
    theme: "A client awakens their inner dragon through physical training. The story follows the dragon companion growing from egg to legend alongside the client.",
  },
  {
    arc: "The Warrior's Path",
    icon: "⚔️",
    theme: "A warrior's origin story — the client is a raw recruit who trains, suffers, and is forged into something unbreakable through fitness discipline.",
  },
  {
    arc: "The Phoenix Rising",
    icon: "🔥",
    theme: "Rising from the ashes of an unhealthy past. The client reclaims their body and identity, transforming through habits, nutrition, and consistency.",
  },
];

async function generateQuests(prompt, base44) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        quests: {
          type: "array",
          items: { type: "object" },
        },
      },
    },
  });
  return res.quests || [];
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const arc = body.arc || null; // optional: generate for one arc only
  const count = Math.min(body.count || 50, 50); // max 50 per call

  const results = [];

  const arcsToGenerate = arc ? ARCS.filter(a => a.arc === arc) : ARCS;

  for (const arcDef of arcsToGenerate) {
    // Check how many already exist for this arc
    const existing = await base44.asServiceRole.entities.QuestTemplate.filter({ narrative_arc: arcDef.arc });
    const alreadyHas = existing.length;
    if (alreadyHas >= count) {
      results.push({ arc: arcDef.arc, skipped: true, existing: alreadyHas });
      continue;
    }

    const toGenerate = count - alreadyHas;

    const prompt = `You are a game narrative designer for a fitness app with RPG quest mechanics.

Arc: "${arcDef.arc}"
Theme: ${arcDef.theme}

Generate exactly ${toGenerate} weekly narrative quests for this arc. Each quest is one chapter in an ongoing fitness story.
Chapters should escalate in difficulty and story intensity (chapters 1-10 easy, 11-25 medium, 26-40 hard, 41-50 legendary).

Each quest MUST:
- Feel like a chapter in an unfolding story (reference the arc theme)
- Have a short cinematic flavor text (2-3 sentences, immersive lore)
- Have a practical fitness objective the client actually does (workouts, nutrition, habits, sleep)
- Have a completion text that advances the story (2 sentences)
- Be a WEEKLY challenge (7 days)

Return a JSON array of exactly ${toGenerate} objects with these fields:
[
  {
    "title": "Chapter title",
    "description": "What the client must actually do (practical fitness task)",
    "points_reward": <number 60-300 scaling with difficulty>,
    "difficulty": "easy|medium|hard|legendary",
    "duration_days": 7,
    "narrative_arc": "${arcDef.arc}",
    "narrative_chapter": <chapter number starting from ${alreadyHas + 1}>,
    "narrative_flavor": "Cinematic story intro text (2-3 sentences)",
    "narrative_completion_text": "Story advancement text shown on completion (2 sentences)",
    "category": "narrative",
    "is_system": true,
    "is_shared": true
  }
]

Only output valid JSON. No markdown. No explanation.`;

    const quests = await generateQuests(prompt, base44);

    // Bulk insert into QuestTemplate
    const created = await base44.asServiceRole.entities.QuestTemplate.bulkCreate(quests);
    results.push({ arc: arcDef.arc, generated: quests.length, created: created.length });
  }

  return Response.json({ success: true, results });
});