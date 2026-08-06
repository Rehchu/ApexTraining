import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { clientEmail, clientName, trainerName, packageName, amount, dueDate, paymentLink } = await req.json();

    if (!clientEmail || !trainerName || !amount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const formattedAmount = parseFloat(amount).toFixed(2);
    const dueDateFormatted = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'As soon as possible';

    const emailBody = `Hello ${clientName || 'there'},

${trainerName} has sent you an invoice for your training.

Invoice Details:
${packageName ? `Package: ${packageName}\n` : ''}Amount Due: $${formattedAmount}
Due Date: ${dueDateFormatted}

${paymentLink ? `To make a payment, click here: ${paymentLink}\n\n` : ''}Please arrange payment to continue training. You can reply to this email or contact ${trainerName} directly if you have any questions.

Thanks!`;

    await base44.integrations.Core.SendEmail({
      to: clientEmail,
      subject: `Invoice from ${trainerName} - $${formattedAmount} due`,
      body: emailBody,
      from_name: 'Apex Coach'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});