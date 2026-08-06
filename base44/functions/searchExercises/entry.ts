import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { search, name, limit = 20 } = await req.json();
        const searchTerm = search || name;

        const apiKey = Deno.env.get("EXERCISE_DB_API_KEY");
        
        if (!searchTerm) {
            return Response.json({ exercises: [] });
        }

        // Using ExerciseDB API via RapidAPI
        const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchTerm)}?limit=${limit}`;
        const headers = {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'exercisedb.p.rapidapi.com'
        };
        
        let response;
        try {
            response = await fetch(url, { headers });
        } catch (err) {
            console.error('Fetch error:', err);
        }
        
        if (!response || !response.ok) {
            if (response && !response.ok) {
                console.error('Exercise API error:', response.status);
            }
            // Fallback to wger API if ExerciseDB fails (e.g. quota exceeded)
            try {
                const wgerUrl = `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(searchTerm)}`;
                const wgerRes = await fetch(wgerUrl);
                if (wgerRes.ok) {
                    const wgerData = await wgerRes.json();
                    const wgerExercises = (wgerData.suggestions || []).map(s => ({
                        name: s.data.name,
                        bodyPart: s.data.category || 'General',
                        target: 'Muscle'
                    }));
                    if (wgerExercises.length > 0) {
                        return Response.json({ exercises: wgerExercises.slice(0, limit) });
                    }
                }
            } catch (wgerErr) {
                console.error('Wger fallback error:', wgerErr);
            }
            
            // Static fallback if both APIs fail or return 0 results
            const fallbackExercises = [
                { name: "Squat", bodyPart: "legs", target: "glutes" },
                { name: "Bench Press", bodyPart: "chest", target: "pectorals" },
                { name: "Deadlift", bodyPart: "back", target: "lower back" },
                { name: "Overhead Press", bodyPart: "shoulders", target: "delts" },
                { name: "Barbell Row", bodyPart: "back", target: "lats" },
                { name: "Pull-up", bodyPart: "back", target: "lats" },
                { name: "Push-up", bodyPart: "chest", target: "pectorals" },
                { name: "Dumbbell Curl", bodyPart: "arms", target: "biceps" },
                { name: "Tricep Extension", bodyPart: "arms", target: "triceps" },
                { name: "Leg Press", bodyPart: "legs", target: "quads" },
                { name: "Lat Pulldown", bodyPart: "back", target: "lats" },
                { name: "Plank", bodyPart: "core", target: "abs" },
                { name: "Crunch", bodyPart: "core", target: "abs" }
            ].filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return Response.json({ exercises: fallbackExercises.slice(0, limit) });
        }
        
        const exercises = await response.json();
        return Response.json({ exercises: Array.isArray(exercises) ? exercises.slice(0, limit) : [] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});