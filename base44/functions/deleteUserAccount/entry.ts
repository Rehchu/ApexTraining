import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all user-related data as service role
    const userId = user.id;
    const userEmail = user.email;

    console.log(`Starting account deletion for user: ${userEmail} (${userId})`);

    // Delete all entities associated with this user
    // Using service role to bypass RLS restrictions during cleanup
    
    await base44.asServiceRole.entities.Client.bulkDelete({ user_id: userId });
    await base44.asServiceRole.entities.Client.bulkDelete({ trainer_id: userId });
    
    await base44.asServiceRole.entities.Message.bulkDelete({ sender_id: userId });
    await base44.asServiceRole.entities.Message.bulkDelete({ receiver_id: userId });
    
    await base44.asServiceRole.entities.WorkoutPlan.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.WorkoutPlan.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.MealPlan.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.MealPlan.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.Session.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.Session.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.ProgressLog.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.ProgressLog.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.Payment.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.Payment.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.Package.bulkDelete({ trainer_id: userId });
    
    await base44.asServiceRole.entities.Resource.bulkDelete({ trainer_id: userId });
    
    await base44.asServiceRole.entities.Notification.bulkDelete({ user_id: userId });
    
    await base44.asServiceRole.entities.ClientNote.bulkDelete({ trainer_id: userId });
    
    await base44.asServiceRole.entities.Contract.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.Contract.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.Goal.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.Goal.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.Achievement.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.Achievement.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.WorkoutLog.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.WorkoutLog.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.MealLog.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.MealLog.bulkDelete({ client_id: userId });
    
    await base44.asServiceRole.entities.ClientActivity.bulkDelete({ trainer_id: userId });
    await base44.asServiceRole.entities.ClientActivity.bulkDelete({ client_id: userId });

    // Finally, delete the user record itself
    await base44.asServiceRole.entities.User.delete(userId);

    console.log(`Account deletion completed for: ${userEmail}`);

    return Response.json({ 
      success: true,
      message: 'Account and all associated data have been deleted'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return Response.json({ 
      error: error.message || 'Failed to delete account'
    }, { status: 500 });
  }
});