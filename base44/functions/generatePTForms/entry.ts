import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forms = [
      {
        title: "Personal Training Consultation & Intake Form",
        category: "general",
        description: "Standard client intake form to gather background information, lifestyle habits, and initial goals.",
        content: `Client Name: \nDate of Birth: \nPhone: \nEmail: \n\n1. What are your primary health and fitness goals?\n[  ]\n\n2. Have you ever worked with a personal trainer before?\n[  ]\n\n3. Describe your current exercise routine (frequency, intensity, type):\n[  ]\n\n4. How many hours of sleep do you get per night?\n[  ]\n\n5. Rate your daily stress levels on a scale of 1-10:\n[  ]\n\n6. Are you currently following any specific diet or nutrition plan?\n[  ]\n\n7. How much water do you drink daily?\n[  ]\n\nSignature: ______________________ Date: ___________`
      },
      {
        title: "PAR-Q (Physical Activity Readiness Questionnaire)",
        category: "medical",
        description: "Required screening form to ensure the client is physically ready for an exercise program.",
        content: `Please read each question carefully and answer YES or NO:\n\n1. Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor? [  ]\n2. Do you feel pain in your chest when you do physical activity? [  ]\n3. In the past month, have you had chest pain when you were not doing physical activity? [  ]\n4. Do you lose your balance because of dizziness or do you ever lose consciousness? [  ]\n5. Do you have a bone or joint problem that could be made worse by a change in your physical activity? [  ]\n6. Is your doctor currently prescribing drugs for your blood pressure or heart condition? [  ]\n7. Do you know of any other reason why you should not do physical activity? [  ]\n\nIf you answered YES to one or more questions, talk with your doctor before you start becoming much more physically active.\n\nClient Signature: ______________________ Date: ___________`
      },
      {
        title: "Medical Release Form",
        category: "medical",
        description: "Clearance form for clients who answered YES on their PAR-Q or have existing conditions.",
        content: `Dear Doctor,\n\nYour patient, ___________________________, wishes to start a personalized fitness program. They have indicated a medical condition or answered YES to a PAR-Q question that requires your clearance.\n\nProgram Details:\nThe fitness program may include cardiovascular training, resistance training, flexibility exercises, and high-intensity interval training (HIIT) depending on their capabilities.\n\nPhysician's Recommendations/Restrictions:\n[  ]\n\nPhysician's Clearance:\n[ ] I know of no medical reason why this patient should not participate in a fitness program.\n[ ] I believe this patient can participate but with the restrictions noted above.\n[ ] I DO NOT recommend that this patient participate in a fitness program at this time.\n\nPhysician Name: __________________________\nPhysician Signature: ______________________ Date: ___________`
      },
      {
        title: "Liability Waiver & Informed Consent",
        category: "general",
        description: "Legal protection form acknowledging the risks of physical exercise.",
        content: `I, ___________________________, acknowledge that I have voluntarily chosen to participate in a program of physical exercise under the direction of my Personal Trainer.\n\nI understand that there are inherent risks in participating in a program of strenuous exercise. I have been informed of the possible risks, including but not limited to, muscle strains, joint sprains, cardiovascular complications, and in rare instances, heart attack or death.\n\nI assume all risk for my health and well-being and hold harmless my Personal Trainer and their affiliated facility from any and all responsibility for claims or causes of action arising from my participation.\n\nClient Signature: ______________________ Date: ___________`
      },
      {
        title: "Fitness Goal Setting Template",
        category: "motivation",
        description: "A structured worksheet to help clients set SMART goals.",
        content: `SMART Goal Setting\n\nSpecific: What exactly do I want to achieve?\n[  ]\n\nMeasurable: How will I track my progress? What is the metric?\n[  ]\n\nAchievable: Is this goal realistic given my current lifestyle and constraints?\n[  ]\n\nRelevant: Why is this goal important to me? How does it align with my broader life objectives?\n[  ]\n\nTime-bound: When do I want to achieve this by? (Target Date)\n[  ]\n\nMilestones (What needs to happen along the way):\n1. [  ]\n2. [  ]\n3. [  ]\n\nClient Signature: ______________________ Date: ___________`
      },
      {
        title: "Personal Training Session Feedback Form",
        category: "general",
        description: "A quick feedback form to gather insights on client satisfaction.",
        content: `Client Name: ______________________ Date: ___________\n\n1. How would you rate today's session overall? (1 = Poor, 5 = Excellent)\n[  ]\n\n2. Did the workout feel too easy, too hard, or just right?\n[  ]\n\n3. Was there any exercise that caused pain or extreme discomfort?\n[  ]\n\n4. Do you feel you are progressing toward your goals?\n[  ]\n\n5. What could your trainer do to improve your experience?\n[  ]\n\nThank you for your feedback!`
      }
    ];

    const records = forms.map(f => ({ ...f, trainer_id: user.id }));
    await base44.asServiceRole.entities.Resource.bulkCreate(records);

    return Response.json({ success: true, count: records.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});