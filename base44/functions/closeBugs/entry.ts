import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all open and in_progress bugs
    const openBugs = await base44.entities.BugReport.filter({ status: 'open' });
    const inProgressBugs = await base44.entities.BugReport.filter({ status: 'in_progress' });
    const allBugsToClose = [...openBugs, ...inProgressBugs];

    // Mark all as resolved
    for (const bug of allBugsToClose) {
      await base44.entities.BugReport.update(bug.id, { status: 'resolved' });
    }

    return Response.json({ 
      success: true, 
      closed_count: allBugsToClose.length,
      message: `${allBugsToClose.length} bugs marked as resolved`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});