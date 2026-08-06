import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Assigns the next narrative quest chapter to a client for a given arc.
 * - Figures out which chapter they're on
 * - Picks the next QuestTemplate from the arc
 * - If none exist yet (arc not generated), skips gracefully
 * - Creates a Quest record assigned to the client for that week
 * Called by the client frontend or by a scheduled automation.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { clientId, arc } = body;

  if (!clientId || !arc) {
    return Response.json({ error: "clientId and arc required" }, { status: 400 });
  }

  // Get the client record
  let client;
  try {
    client = await base44.asServiceRole.entities.Client.get(clientId);
  } catch(e) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  // Find all quests already assigned to this client for this arc
  const allClientQuests = await base44.asServiceRole.entities.Quest.filter({ client_id: clientId });
  const existingArcQuests = allClientQuests.filter(q => q.narrative_arc === arc);

  const completedChapters = existingArcQuests.filter(q => q.status === "completed").length;
  const activeChapters = existingArcQuests.filter(q => q.status === "active");

  // If there's already an active chapter for this arc, don't assign another
  if (activeChapters.length > 0) {
    return Response.json({ alreadyActive: true, quest: activeChapters[0] });
  }

  // Next chapter number
  const nextChapter = completedChapters + 1;

  // Find the template for the next chapter
  const allTemplates = await base44.asServiceRole.entities.QuestTemplate.filter({ narrative_arc: arc });
  // Sort by chapter number
  allTemplates.sort((a, b) => (a.narrative_chapter || 0) - (b.narrative_chapter || 0));

  const template = allTemplates.find(t => (t.narrative_chapter || 0) >= nextChapter) || allTemplates[allTemplates.length - 1];

  if (!template) {
    return Response.json({ noTemplates: true, message: "No quest templates found for this arc. Generate them first." });
  }

  // Create start/end dates (this week)
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const quest = await base44.asServiceRole.entities.Quest.create({
    name: template.title,
    title: template.title,
    description: template.description,
    client_id: clientId,
    trainer_id: client.trainer_id,
    status: "active",
    category: "narrative",
    difficulty: template.difficulty,
    points_reward: template.points_reward,
    rewards: { xp: template.points_reward, coins: Math.floor(template.points_reward / 10) },
    start_date: startDate,
    end_date: endDate,
    narrative_arc: arc,
    narrative_chapter: template.narrative_chapter || nextChapter,
    narrative_flavor: template.narrative_flavor,
    narrative_completion_text: template.narrative_completion_text,
  });

  return Response.json({ success: true, quest });
});