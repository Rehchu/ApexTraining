import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DOCUSEAL_API_KEY = Deno.env.get("DOCUSEAL_API_KEY");
const DOCUSEAL_API_URL = "https://api.docuseal.com";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, contractId, contractTitle, contractContent, signerEmail, signerName, submissionId } = body;

    if (action === 'createSubmission') {
      const response = await fetch(`${DOCUSEAL_API_URL}/submissions/html`, {
        method: 'POST',
        headers: {
          'X-Auth-Token': DOCUSEAL_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          html: `
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                <h1 style="font-size: 24px; margin-bottom: 20px;">${contractTitle}</h1>
                <div style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">${contractContent}</div>
                <br/><br/>
                <p style="font-size: 14px; color: #555;">By signing below, I acknowledge that I have read and agree to the terms above.</p>
                <br/>
                <p>Signature: {{Signature}}</p>
                <p>Date: {{Date}}</p>
                <p>Full Name: {{Full Name}}</p>
              </body>
            </html>
          `,
          submitters: [
            {
              role: 'First Party',
              email: signerEmail,
              name: signerName || ''
            }
          ],
          send_email: false,
          name: contractTitle
        })
      });

      if (!response.ok) {
        const err = await response.text();
        return Response.json({ error: `DocuSeal error: ${err}` }, { status: 500 });
      }

      const data = await response.json();
      const submitter = data.submitters?.[0];

      if (contractId) {
        await base44.asServiceRole.entities.Contract.update(contractId, {
          status: 'sent',
          signature_data: JSON.stringify({
            docuseal_submission_id: data.id,
            docuseal_submitter_slug: submitter?.slug
          })
        });
      }

      return Response.json({
        success: true,
        submissionId: data.id,
        submitterSlug: submitter?.slug
      });
    }

    if (action === 'getSubmission') {
      const response = await fetch(`${DOCUSEAL_API_URL}/submissions/${submissionId}`, {
        headers: { 'X-Auth-Token': DOCUSEAL_API_KEY }
      });
      const data = await response.json();
      return Response.json(data);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});