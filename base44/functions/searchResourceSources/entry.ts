import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, category } = await req.json();

        if (!query || query.length < 3) {
            return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
        }

        // Build search queries for different sources
        const searchQueries = [];
        
        if (!category || category === 'workout') {
            searchQueries.push(`site:github.com/exercemus ${query} exercise form technique`);
            searchQueries.push(`site:blog.nasm.org ${query} workout training`);
            searchQueries.push(`site:mmfit.github.io ${query} training methodology`);
        }
        
        if (!category || category === 'medical') {
            searchQueries.push(`site:medlineplus.gov ${query} medical health condition`);
        }
        
        if (!category || category === 'nutrition') {
            searchQueries.push(`${query} nutrition meal planning protein carbs diet`);
        }
        
        if (!category || category === 'general') {
            searchQueries.push(`site:blog.nasm.org ${query} fitness training`);
            searchQueries.push(`site:mmfit.github.io ${query} training`);
        }

        // Use LLM to search and extract relevant information
        const prompt = `Search for fitness/health information about: "${query}"
        
Focus on these trusted sources:
- Exercemus (exercise database)
- MedlinePlus Medical Encyclopedia
- NASM Blog (fitness training)
- MMFit (training methodology)
- Evidence-based nutrition resources

Extract 3-5 relevant resources that would be useful for a fitness trainer to share with clients. For each resource:
1. Give it a clear, descriptive title
2. Write 2-3 paragraphs of educational content (200-300 words)
3. Include practical, actionable advice
4. Cite the source if available

Categories: workout, nutrition, medical, general, motivation`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    resources: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                content: { type: "string" },
                                category: { 
                                    type: "string",
                                    enum: ["workout", "nutrition", "medical", "general", "motivation"]
                                },
                                source_url: { type: "string" },
                                source_name: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json(result);
    } catch (error) {
        console.error('Search error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});