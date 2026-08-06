import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientEmail, clientName, amount, description, dueDate, paymentNotes } = await req.json();

    if (!clientEmail || !amount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const trainerName = user.data?.full_name || user.full_name || "Your Trainer";

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080808; color: #ffffff; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background-color: #111111; border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 12px; padding: 32px; text-align: left; }
  .logo { font-size: 24px; font-weight: 900; color: #ffffff; text-align: center; margin-bottom: 24px; letter-spacing: 2px; }
  .logo span { color: #d4a017; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #ffffff; }
  .text { font-size: 16px; line-height: 1.6; color: #d1d5db; margin-bottom: 24px; }
  .highlight { color: #d4a017; font-weight: 600; }
  .notes { font-size: 14px; color: #9ca3af; background-color: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-style: italic; }
  .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 32px; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">APEX <span>COACH</span></div>
    <div class="card">
      <div class="title">New Invoice Available</div>
      <div class="text">
        Hello ${clientName || 'there'},<br><br>
        You have received a new invoice from <span class="highlight">${trainerName}</span>.
      </div>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-left: 4px solid #d4a017; border-radius: 4px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color: #9ca3af; font-size: 15px; padding-bottom: 12px;">Description:</td>
                <td align="right" style="color: #ffffff; font-weight: 600; font-size: 15px; padding-bottom: 12px;">${description || 'Training Services'}</td>
              </tr>
              ${dueDate ? `
              <tr>
                <td style="color: #9ca3af; font-size: 15px; padding-bottom: 12px;">Due Date:</td>
                <td align="right" style="color: #ffffff; font-weight: 600; font-size: 15px; padding-bottom: 12px;">${new Date(dueDate).toLocaleDateString()}</td>
              </tr>` : ''}
              <tr>
                <td style="color: #9ca3af; font-size: 18px; padding-top: 12px; border-top: 1px solid #333;">Amount Due:</td>
                <td align="right" style="color: #22c55e; font-weight: 700; font-size: 20px; padding-top: 12px; border-top: 1px solid #333;">$${parseFloat(amount).toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${paymentNotes ? `
      <div class="text" style="font-size: 14px; margin-bottom: 8px;">Notes from your trainer:</div>
      <div class="notes">${paymentNotes}</div>
      ` : ''}

      <div class="text" style="font-size: 15px;">
        Please contact <strong style="color: #ffffff;">${trainerName}</strong> to arrange payment.
      </div>
      <div class="text" style="font-size: 14px; margin-bottom: 0;">
        Thank you,<br/><strong style="color: #ffffff;">Apex Coach</strong>
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
      subject: `Invoice from ${trainerName}`,
      body: emailBody,
      from_name: `Apex Coach ${trainerName} Invoice`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});