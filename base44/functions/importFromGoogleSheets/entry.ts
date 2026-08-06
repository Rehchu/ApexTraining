import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId, sheetName, dataType } = await req.json();
    
    if (!spreadsheetId || !dataType) {
      return Response.json({ error: 'Missing spreadsheetId or dataType' }, { status: 400 });
    }

    // Get Google Sheets access token for the authenticated trainer
    const connection = await base44.connectors.getConnection('googlesheets');
    if (!connection?.accessToken) {
      return Response.json({ error: 'Google Sheets not connected. Please authorize first.' }, { status: 401 });
    }
    const { accessToken } = connection;
    
    // Fetch sheet data
    const range = sheetName ? `${sheetName}!A1:ZZ` : 'A1:ZZ';
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const response = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: 'Failed to fetch sheet data', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    const rows = data.values || [];
    
    if (rows.length === 0) {
      return Response.json({ error: 'No data found in sheet' }, { status: 400 });
    }

    // First row is headers
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    let imported = 0;
    let errors = [];

    if (dataType === 'exercises') {
      // Import exercises to FitnessTemplate entity
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (row.length === 0 || !row[0]) continue;

        try {
          const exerciseData = {};
          headers.forEach((header, idx) => {
            if (row[idx]) {
              exerciseData[header] = row[idx];
            }
          });

          // Map common column names to FitnessTemplate fields
          const template = {
            name: exerciseData.name || exerciseData.exercise_name || exerciseData.exercise || row[0],
            description: exerciseData.description || exerciseData.notes || '',
            category: exerciseData.category || 'strength',
            difficulty: exerciseData.difficulty || exerciseData.level || 'intermediate',
            duration_weeks: parseInt(exerciseData.duration_weeks || exerciseData.weeks || 4),
            days_per_week: parseInt(exerciseData.days_per_week || exerciseData.days || 3),
            exercises: []
          };

          // If there's sets/reps data in the row, create an exercise entry
          if (exerciseData.sets || exerciseData.reps) {
            template.exercises.push({
              day: 1,
              name: template.name,
              sets: parseInt(exerciseData.sets || 3),
              reps: exerciseData.reps || '10',
              rest_seconds: parseInt(exerciseData.rest || exerciseData.rest_seconds || 60),
              notes: exerciseData.notes || ''
            });
          }

          await base44.entities.FitnessTemplate.create(template);
          imported++;
        } catch (err) {
          errors.push({ row: i + 2, error: err.message });
        }
      }
    } else if (dataType === 'clients') {
      // Import/update client data
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (row.length === 0 || !row[0]) continue;

        try {
          const clientData = {};
          headers.forEach((header, idx) => {
            if (row[idx]) {
              clientData[header] = row[idx];
            }
          });

          // Map common column names to Client fields
          const clientUpdate = {
            full_name: clientData.name || clientData.full_name || clientData.client_name || row[0],
            email: clientData.email || clientData.email_address || '',
            phone: clientData.phone || clientData.phone_number || '',
            age: clientData.age ? parseInt(clientData.age) : undefined,
            gender: clientData.gender || clientData.sex || undefined,
            goals: clientData.goals || clientData.fitness_goals || '',
            medical_notes: clientData.medical_notes || clientData.notes || clientData.health_notes || '',
            weight_kg: clientData.weight ? parseFloat(clientData.weight) : undefined,
            height_cm: clientData.height ? parseFloat(clientData.height) : undefined,
            trainer_id: user.id
          };

          // Remove undefined fields
          Object.keys(clientUpdate).forEach(key => {
            if (clientUpdate[key] === undefined || clientUpdate[key] === '') {
              delete clientUpdate[key];
            }
          });

          // Check if client exists by email
          if (clientUpdate.email) {
            const existing = await base44.entities.Client.filter({ 
              email: clientUpdate.email, 
              trainer_id: user.id 
            });

            if (existing.length > 0) {
              // Update existing client
              await base44.entities.Client.update(existing[0].id, clientUpdate);
            } else {
              // Create new client
              await base44.entities.Client.create(clientUpdate);
            }
          } else {
            // No email, just create
            await base44.entities.Client.create(clientUpdate);
          }
          
          imported++;
        } catch (err) {
          errors.push({ row: i + 2, error: err.message });
        }
      }
    } else {
      return Response.json({ error: 'Invalid dataType. Must be "exercises" or "clients"' }, { status: 400 });
    }

    return Response.json({
      success: true,
      imported,
      total: dataRows.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});