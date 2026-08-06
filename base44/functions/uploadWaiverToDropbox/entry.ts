import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, clientName, fileUrl, fileName } = await req.json();

    if (!clientId || !fileUrl || !fileName) {
      return Response.json({ error: 'Missing required fields: clientId, fileUrl, fileName' }, { status: 400 });
    }

    // Get Dropbox access token for the authenticated trainer (not service role)
    const { accessToken } = await base44.connectors.getConnection('dropbox');

    // Fetch the file content from the URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from URL');
    }
    const fileBlob = await fileResponse.blob();
    const fileBuffer = await fileBlob.arrayBuffer();

    // Create folder path: /ApexCoach Clients/{Client Name}/Waivers
    const folderPath = `/ApexCoach Clients/${clientName}/Waivers`;
    const filePath = `${folderPath}/${fileName}`;

    // Upload file to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath,
          mode: 'add',
          autorename: true,
          mute: false
        })
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Dropbox upload failed: ${errorText}`);
    }

    const result = await uploadResponse.json();

    return Response.json({
      success: true,
      dropboxPath: result.path_display,
      message: 'Waiver uploaded to Dropbox successfully'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});