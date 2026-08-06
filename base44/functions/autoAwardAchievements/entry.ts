import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;
    
    if (event.type === 'create' && event.entity_name === 'WorkoutLog') {
      const { client_id, trainer_id } = data;
      
      const logs = await base44.asServiceRole.entities.WorkoutLog.filter({ client_id });
      
      if (logs.length === 1) {
        await base44.asServiceRole.entities.Achievement.create({
          client_id, trainer_id, title: "First Step", description: "Completed your first workout!", badge_icon: "Flame", badge_color: "text-orange-500", category: "milestone", points: 50, earned_date: new Date().toISOString()
        });
      } else if (logs.length === 10) {
        await base44.asServiceRole.entities.Achievement.create({
          client_id, trainer_id, title: "Consistency is Key", description: "Completed 10 workouts!", badge_icon: "Dumbbell", badge_color: "text-blue-500", category: "milestone", points: 150, earned_date: new Date().toISOString()
        });
      }

      // Check habits for streak multiplier
      let multiplier = 1;
      const habits = await base44.asServiceRole.entities.Habit.filter({ client_id });
      if (habits.some(h => h.current_streak >= 7)) {
        multiplier = 1.5;
      }

      const baseXp = 25;
      const earnedXp = Math.floor(baseXp * multiplier);
      const earnedCoins = earnedXp;

      // Add XP to the client's pet
      const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
      if (clients.length > 0) {
        const clientRec = clients[0];
        let pet = clientRec.pet_state || { type: "dragon", level: 1, xp: 0, stage: "egg" };
        let coins = clientRec.coins || 0;
        
        pet.xp += earnedXp;
        coins += earnedCoins;

        if (pet.xp >= pet.level * 100) {
          pet.level += 1;
          pet.xp -= (pet.level - 1) * 100;
          if (pet.level >= 10) pet.stage = "mythic";
          else if (pet.level >= 7) pet.stage = "adult";
          else if (pet.level >= 4) pet.stage = "teen";
          else if (pet.level >= 2) pet.stage = "baby";
        }
        
        await base44.asServiceRole.entities.Client.update(client_id, { pet_state: pet, coins });
      }

      // Add XP to Trainer
      if (trainer_id) {
        const tStats = await base44.asServiceRole.entities.TrainerStats.filter({ trainer_id });
        let tRec = tStats.length > 0 ? tStats[0] : null;
        if (!tRec) {
          tRec = await base44.asServiceRole.entities.TrainerStats.create({ trainer_id, xp: 0, level: 1, coins: 0, pet_state: { type: "eagle", level: 1, xp: 0, stage: "egg" } });
        }
        
        let tPet = tRec.pet_state;
        tPet.xp += 10;
        let tCoins = tRec.coins + 10;
        
        if (tPet.xp >= tPet.level * 100) {
          tPet.level += 1;
          tPet.xp -= (tPet.level - 1) * 100;
          if (tPet.level >= 10) tPet.stage = "mythic";
          else if (tPet.level >= 7) tPet.stage = "adult";
          else if (tPet.level >= 4) tPet.stage = "teen";
          else if (tPet.level >= 2) tPet.stage = "baby";
        }
        await base44.asServiceRole.entities.TrainerStats.update(tRec.id, { pet_state: tPet, coins: tCoins });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});