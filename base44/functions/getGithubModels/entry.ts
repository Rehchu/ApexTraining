import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const repoUrl = "https://api.github.com/repos/Rehchu/3d-models/contents/";
        
        const response = await fetch(repoUrl);
        
        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        // Return all models including .obj, .mtl, .glb, .gltf, or even files without extensions
        let models = [];
        if (Array.isArray(data)) {
            models = data.map(file => {
                return {
                    name: file.name,
                    url: file.download_url
                };
            });
        }

        return Response.json({ models });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});