import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const url = "https://raw.githubusercontent.com/Rehchu/3d-models/main/Green%20dragon%20egg.glb";
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        
        return Response.json({ 
            size: buffer.byteLength,
            text: new TextDecoder().decode(buffer.slice(0, 100))
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});