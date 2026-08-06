import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { action, entityType, databaseId, dataToExport } = payload;
    
    const connectorId = "6a0e1cf33504602a4eab84c9";
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
    
    const notionHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
    };

    if (action === 'import') {
        const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: notionHeaders,
            body: JSON.stringify({ page_size: 50 })
        });
        const dbData = await queryRes.json();
        
        if (!dbData.results || dbData.results.length === 0) {
            return Response.json({ success: true, count: 0, message: "No records found in Notion." });
        }

        const simplifiedRows = dbData.results.map(r => r.properties);

        const prompt = `You are an intelligent data mapper. I have rows from a Notion database and I need to map them to an array of objects for the "${entityType}" entity.
        
        Here are the Notion rows (properties only):
        ${JSON.stringify(simplifiedRows.slice(0, 10))}
        
        Extract the relevant fields and return a JSON array of parsed objects that fit a standard fitness app schema for ${entityType}. 
        Return ONLY valid JSON format. Provide sensible defaults if mapping isn't exact.`;

        const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    records: { type: "array", items: { type: "object", additionalProperties: true } }
                }
            }
        });

        const records = aiRes.records || [];
        
        if (records.length > 0) {
            const formattedRecords = records.map(r => ({
               ...r,
               trainer_id: user.id
            }));
            
            await base44.asServiceRole.entities[entityType].bulkCreate(formattedRecords);
            return Response.json({ success: true, count: formattedRecords.length });
        }
        
        return Response.json({ success: true, count: 0 });
        
    } else if (action === 'export') {
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            headers: notionHeaders
        });
        const dbSchema = await dbRes.json();
        
        const prompt = `You are a data mapper. I have an array of ${entityType} records from a fitness app. I need to map them to the properties of a Notion database.
        
        Notion Database Schema (Properties):
        ${JSON.stringify(dbSchema.properties)}
        
        Records to export:
        ${JSON.stringify((dataToExport || []).slice(0, 10))}
        
        Return a JSON array of objects. Each object represents a Notion page. The keys MUST exactly match the names of the Notion properties from the schema.
        The values should be raw strings or numbers.`;

        const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    mapped_pages: { type: "array", items: { type: "object", additionalProperties: true } }
                }
            }
        });

        const mappedPages = aiRes.mapped_pages || [];
        let successCount = 0;

        for (const page of mappedPages) {
            const notionProperties = {};
            for (const [key, val] of Object.entries(page)) {
                const schemaProp = dbSchema.properties[key];
                if (!schemaProp || val === null || val === undefined) continue;
                
                if (schemaProp.type === 'title') {
                    notionProperties[key] = { title: [{ text: { content: String(val) } }] };
                } else if (schemaProp.type === 'rich_text') {
                    notionProperties[key] = { rich_text: [{ text: { content: String(val) } }] };
                } else if (schemaProp.type === 'number') {
                    notionProperties[key] = { number: Number(val) || 0 };
                } else if (schemaProp.type === 'select') {
                    notionProperties[key] = { select: { name: String(val).substring(0, 100) } };
                } else if (schemaProp.type === 'multi_select') {
                    const arr = Array.isArray(val) ? val : [val];
                    notionProperties[key] = { multi_select: arr.map(v => ({name: String(v).substring(0, 100)})) };
                } else if (schemaProp.type === 'checkbox') {
                    notionProperties[key] = { checkbox: Boolean(val) };
                } else if (schemaProp.type === 'email') {
                    notionProperties[key] = { email: String(val) };
                } else if (schemaProp.type === 'phone_number') {
                    notionProperties[key] = { phone_number: String(val) };
                }
            }
            
            const titleProp = Object.values(dbSchema.properties).find(p => p.type === 'title');
            if (titleProp && !notionProperties[titleProp.name]) {
                notionProperties[titleProp.name] = { title: [{ text: { content: `Exported ${entityType}` } }] };
            }

            const createRes = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: notionHeaders,
                body: JSON.stringify({
                    parent: { database_id: databaseId },
                    properties: notionProperties
                })
            });
            if (createRes.ok) successCount++;
        }
        
        return Response.json({ success: true, count: successCount });
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});