import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || event.entity_name !== 'Client') {
      return Response.json({ success: true, message: 'Ignored' });
    }

    if (!data.email || !data.trainer_id) {
      return Response.json({ success: true, message: 'Missing email or trainer_id' });
    }

    const trainer = await base44.asServiceRole.entities.User.get(data.trainer_id);
    const trainerName = trainer?.full_name || 'Your Trainer';

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Inter', sans-serif; background-color: #080808; color: #ffffff; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background-color: #111111; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 32px; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #ffffff; }
  .text { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 24px; }
</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="title">Welcome to Apex Coach!</div>
      <div class="text">
        Hi ${data.full_name},<br/><br/>
        We are thrilled to welcome you to Apex Coach. Your trainer, <strong>${trainerName}</strong>, is ready to help you hit your fitness goals!
        <br/><br/>
        You can now log in to the Client Portal to access your personalized workout and meal plans, track your progress, and message your trainer.
        <br/><br/>
        Let's get started!<br/>
        <strong>Apex Coach Team</strong>
      </div>
    </div>
  </div>
</body>
</html>
`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: data.email,
      from_name: `Apex Coach - ${trainerName}`,
      subject: `Welcome to Apex Coach, ${data.full_name}!`,
      body: emailBody
    });

    return Response.json({ success: true, message: 'Onboarding email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});