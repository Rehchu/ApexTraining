import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipes, source_url, source_name } = await req.json();
        
        if (!recipes || !Array.isArray(recipes)) {
            return Response.json({ error: 'recipes array is required' }, { status: 400 });
        }

        // Import selected recipes into database
        const importedRecipes = [];
        for (const recipe of recipes) {
            const created = await base44.asServiceRole.entities.Recipe.create({
                ...recipe,
                trainer_id: user.id,
                source_url: source_url || null,
                source_name: source_name || null
            });
            importedRecipes.push(created);
        }

        return Response.json({ 
            success: true,
            imported_count: importedRecipes.length,
            recipes: importedRecipes
        });
    } catch (error) {
        console.error('❌ Failed to import recipes:', error);
        return Response.json({ 
            error: error.message,
            details: 'Failed to import selected recipes.'
        }, { status: 500 });
    }
});