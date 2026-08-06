import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        let ingredients = "";
        if (req.method === 'POST') {
            const body = await req.json();
            ingredients = body.ingredients;
        }

        if (!ingredients) {
            return Response.json({ error: "Missing ingredients" }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        const promptText = `
        You are an expert fitness nutritionist and chef. 
        I have the following ingredients in my pantry: ${ingredients}.
        
        Please create a healthy, high-protein recipe using mostly (or only) these ingredients.
        Format the response in Markdown with:
        - A catchy title
        - Estimated macros (Calories, Protein, Carbs, Fat)
        - Ingredients list (you can assume basic staples like salt, pepper, oil are available)
        - Step-by-step instructions
        `;

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: promptText });

        return Response.json({ success: true, recipe: result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});