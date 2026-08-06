import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type } = await req.json();

        if (!type || !['equipments', 'exercisetypes', 'muscles', 'bodyparts'].includes(type)) {
            return Response.json({ error: 'Invalid type. Must be: equipments, exercisetypes, muscles, or bodyparts' }, { status: 400 });
        }

        const apiKey = Deno.env.get("EXERCISE_DB_API_KEY");
        const url = `https://exercise-db-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1/${type}`;

        const response = await fetch(url, {
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'exercise-db-with-videos-and-images-by-ascendapi.p.rapidapi.com'
            }
        });

        const data = await response.json();

        return Response.json({ data });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});