import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save to database
    await base44.asServiceRole.entities.ContactMessage.create({
      name,
      email,
      subject: subject || 'No Subject',
      message,
      status: 'new'
    });

    // Send email to admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'dyerbradly2@gmail.com',
      subject: `New Contact Form Submission: ${subject || 'No Subject'}`,
      body: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      from_name: 'Apex Coach System'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});