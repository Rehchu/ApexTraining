import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientEmail, clientName, trainerName, signupLink } = await req.json();

    if (!clientEmail || !trainerName || !signupLink) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Automatically assign client status
    try {
      const users = await base44.asServiceRole.entities.User.filter({ email: clientEmail });
      if (users && users.length > 0) {
        const targetUser = users[0];
        const currentData = targetUser.data || {};
        const cleanData = { 
            ...currentData,
            user_type: "client",
            data: undefined
        };
        Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key]);
        
        await base44.asServiceRole.entities.User.update(targetUser.id, {
            data: cleanData
        });
      }
    } catch (err) {
      console.error("Could not set user_type:", err);
    }

    const appFeatures = [
      'Personalized workout plans',
      'Meal planning and nutrition tracking',
      'Real-time progress monitoring',
      'Session scheduling and reminders',
      'Achievement badges and milestones',
      'Direct messaging with your trainer'
    ];

    const featuresList = appFeatures.map(f => `• ${f}`).join('\n');

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080808; color: #ffffff; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background-color: #111111; border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 32px; text-align: left; }
  .logo { font-size: 24px; font-weight: 900; color: #ffffff; text-align: center; margin-bottom: 24px; letter-spacing: 2px; }
  .logo span { color: #22c55e; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #ffffff; }
  .text { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 24px; }
  .highlight { color: #22c55e; font-weight: 600; }
  .btn { display: inline-block; background-color: #22c55e; color: #000000; font-weight: 700; font-size: 16px; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin-bottom: 24px; text-align: center; }
  .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 32px; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">APEX <span>COACH</span></div>
    <div class="card">
      <div class="title">Welcome to Apex Coach!</div>
      <div class="text">
        Your trainer, <span class="highlight">${trainerName}</span>, has invited you to join their exclusive coaching platform.
      </div>
      <div style="text-align: center;">
        <a href="${signupLink}" class="btn">Accept Invitation & Get Started</a>
      </div>
      <div class="text" style="font-size: 14px; margin-bottom: 12px;">With Apex Coach, you'll have access to:</div>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            ${appFeatures.map(f => `<div style="font-size: 14px; color: #d1d5db; margin-bottom: 10px;"><span style="color:#22c55e; margin-right:8px;">✔</span> ${f}</div>`).join('')}
          </td>
        </tr>
      </table>

      <div class="text" style="font-size: 14px;">
        We're excited to have you on board! If you have any questions, feel free to reply to this email.
      </div>
      <div class="text" style="font-size: 14px; margin-bottom: 0;">
        Best regards,<br/><strong style="color: #ffffff;">Apex Coach & ${trainerName}</strong>
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Apex Coach. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      subject: `You're invited by ${trainerName} to join Apex Coach!`,
      body: emailBody,
      from_name: `Apex Coach ${trainerName}`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});