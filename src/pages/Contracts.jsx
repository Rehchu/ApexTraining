import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Send, CheckCircle, Clock, Edit, Upload } from "lucide-react";
import UploadContractDialog from "@/components/contracts/UploadContractDialog";
import ESignDialog from "@/components/contracts/ESignDialog";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Contracts() {
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [eSignOpen, setESignOpen] = useState(false);
  const [contractToSign, setContractToSign] = useState(null);
  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    type: "service_agreement",
    content: "",
    expiry_date: ""
  });

  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Client.filter({ trainer_id: user.id });
    },
    enabled: !!user
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Contract.filter({ trainer_id: user.id }, '-created_date');
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const client = clients.find(c => c.id === data.client_id);
      return base44.entities.Contract.create({
        ...data,
        client_name: client?.full_name,
        trainer_id: user.id,
        status: 'draft'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      setFormOpen(false);
      resetForm();
      toast.success("Contract created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['contracts']);
      setFormOpen(false);
      setEditingContract(null);
      resetForm();
      toast.success("Contract updated");
    }
  });

  const sendMutation = useMutation({
    mutationFn: (contract) => {
      setContractToSign(contract);
      setESignOpen(true);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success("Opening e-signature");
    }
  });

  const resetForm = () => {
    setFormData({
      client_id: "",
      title: "",
      type: "service_agreement",
      content: "",
      expiry_date: ""
    });
  };

  const handleEdit = (contract) => {
    setEditingContract(contract);
    setFormData({
      client_id: contract.client_id,
      title: contract.title,
      type: contract.type,
      content: contract.content,
      expiry_date: contract.expiry_date || ""
    });
    setFormOpen(true);
  };

  const statusBadge = (status) => {
    const variants = {
      draft: { variant: 'secondary', icon: Edit, color: 'text-slate-600' },
      sent: { variant: 'default', icon: Send, color: 'text-blue-600' },
      signed: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      expired: { variant: 'destructive', icon: Clock, color: 'text-red-600' }
    };
    const config = variants[status] || variants.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const contractTemplates = {
    service_agreement: `PERSONAL TRAINING CONTRACT/AGREEMENT

Trainer Information:
Name: ___________________________________
Business Name: ___________________________________
Address: ___________________________________
Phone: ___________________________________ Email: ___________________________________

Client Information:
Name: ___________________________________
Address: ___________________________________
Phone: ___________________________________ Email: ___________________________________

This Agreement is made and entered into on _________________ ("Date"), by and between the above-named Trainer and Client.

Congratulations on your decision to participate in an exercise program! With the help of your personal trainer, you will greatly improve your ability to accomplish your training goals faster, safer, and with maximum benefits.

In order to maximize progress, it is necessary for you to follow program guidelines during supervised and (if applicable) unsupervised training days. Remember, exercise and healthy eating are EQUALLY important!

ASSUMPTION OF RISK:
During your exercise program, every effort will be made to assure your safety. However, as with any exercise program, there are risks, including increased heart stress and the chance of musculoskeletal injuries. In volunteering for this program, you agree to assume responsibility for these risks and waive any possibility for personal damage. You also agree that, to your knowledge, you have no limiting physical conditions or disability that would preclude an exercise program.

By signing below, you accept full responsibility for your own health and well-being AND you acknowledge an understanding that no responsibility is assumed by the leaders of the program.

PERSONAL TRAINING TERMS AND CONDITIONS:

1. SESSIONS: It is recommended that all program participants work with their personal trainer three (3) times per week. However, due to scheduling conflicts and financial considerations, a combination of supervised and unsupervised workouts is possible.

2. CANCELLATION POLICY: Personal training sessions that are not rescheduled or canceled 24 hours in advance will result in forfeiture of the session and a loss of the financial investment at the rate of one session.

3. PUNCTUALITY: Clients arriving late will receive the remaining scheduled session time, unless other arrangements have been previously made with the trainer.

4. EXPIRATION: The expiration policy requires completion of all personal training sessions within 120 days from the date of the contract. Personal training sessions are void after this time period.

5. REFUNDS: No personal training refunds will be issued for any reason, including but not limited to relocation, illness, and unused sessions.

6. ATTIRE: Client must wear comfortable workout attire, including clean t-shirts, shorts, tights, sweats, and/or tracksuits. Athletic shoes must be supportive and functional.

7. STOPPING EXERCISES: Client may refuse or stop any exercise for any reason. It is Client's responsibility to notify Trainer of any discomfort or pain arising from or during exercise.

DESCRIPTION OF PROGRAM: 
___________________________________
___________________________________
___________________________________

TOTAL INVESTMENT: $___________________
METHOD OF PAYMENT: ___________________

LIABILITY DISCLAIMER:
ApexCoaching and its trainers shall not be held liable for any injuries, damages, or losses sustained by Client during or after participation in the personal training program. Client acknowledges that participation in fitness activities is at Client's own risk.

WE WISH YOU THE BEST OF LUCK ON YOUR NEW PERSONAL TRAINING PROGRAM!

Participant's Name (Print): _________________________________
Participant's Signature: _________________________________  Date: __________

Parent/Guardian's Signature (if needed): _________________________________  Date: __________

Trainer's Signature: _________________________________  Date: __________`,

    purchase_agreement: `PERSONAL TRAINING PURCHASE AGREEMENT/CONTRACT

Trainer Information:
Name: ___________________________________
Business Name: ___________________________________
Address: ___________________________________
Phone: ___________________________________ Email: ___________________________________

Client Information:
Name: ___________________________________
Address: ___________________________________
Phone: ___________________________________ Email: ___________________________________

Welcome!

Congratulations on beginning your personal training program! We are delighted you chose us as a part of your commitment to health and fitness. With the help of your personal trainer, you will improve your ability to accomplish your training goals faster, safer, and with maximum benefits.

In order to maximize progress, it is important to follow program guidelines during supervised and (if applicable) unsupervised training days. Remember, exercise and healthy eating are EQUALLY important!

This Agreement is made and entered into on [DATE], by and between [CLIENT_NAME] ("Client") and [TRAINER_NAME] ("Trainer").

PERSONAL TRAINING INFORMATION AND POLICIES:

1. COMMITMENT: By purchasing Sessions, Client is making a commitment to his/her health. Clients should follow the program and instructions of Trainer to the best of their ability to maximize their results and better achieve their goals.

2. SPECIFICS: Trainer and Client shall agree upon the time, program type, content, and location of personal training sessions ("Sessions") at the rate set forth below.

Program Type: ___________________________________
Program Content: ___________________________________
Training Location & Time: ___________________________________

3. LENGTH OF SESSIONS: Sessions will last approximately fifty-five (55) minutes. Trainer may opt to vary the length of sessions at his discretion.

4. PUNCTUALITY: Client shall be ready to train at the specified time. Failure to be prepared to train may result in a shortened workout or possible cancellation if Client is more than fifteen (15) minutes late.

5. ATTIRE: Client must wear comfortable workout attire and supportive athletic shoes. Workout gloves are optional.

6. STOPPING EXERCISES: Client may refuse or stop any exercise for any reason. It is Client's responsibility to notify Trainer of any discomfort or pain.

7. PAYMENT: Payment may be made in advance in one lump sum or may be financed through equal monthly payments over the course of up to four months. Payment is due on or before the 15th calendar day of the month. Trainer accepts cash or check only.

8. CANCELLATION OF INDIVIDUAL SESSIONS: Twenty-four (24) hour cancellation notice, by phone, is required for rescheduling or cancelling any Sessions. Any cancellations with less than 24 hours notice will result in forfeiture of the Session without refund.

9. CANCELLATION AND REFUND OF ALL SESSIONS: Client may cancel this contract within four (4) business days after signing for a full refund of any and all monies paid.

10. RELOCATION: Should Client relocate more than 25 miles outside Trainer's service area, Client may cancel this contract and shall be liable only for that portion of charges allocable to the time before relocation, plus a contract termination fee of 10% of the unused balance or $50, whichever is less.

11. DEATH OR DISABILITY: Should Client become unable to use services under this contract due to death or disability, Client shall be liable only for that portion of charges prior to death or onset of disability. Reasonable evidence (death certificate or doctor's note) must be presented.

12. CANCELLATIONS IN WRITING: Notice of cancellation must be made in writing and delivered to Trainer by certified or registered mail. All refunds will be made within thirty (30) days of receipt.

PROGRAM DESCRIPTION: 
___________________________________
___________________________________
___________________________________

Number of Sessions: ___________________
Rate: $_________________ per session
Total Training Fees: $_________________
Registration Fee: $_________________

TOTAL AMOUNT DUE: $_________________

Payment Options:
☐ Payment in Full - Amount: $_________________ Date: __________________
☐ Two months - Amount: $_________________ Date: __________________
☐ Three months - Amount: $_________________ Date: __________________
☐ Four months - Amount: $_________________ Date: __________________

LIABILITY DISCLAIMER:
ApexCoaching and its trainers shall not be held liable for any injuries, damages, or losses sustained by Client during or after participation in the personal training program. Client acknowledges that participation in fitness activities is at Client's own risk.

We wish you best of luck on your new personal training program!

Participant Name (Print): _________________________________
Participant Signature: _________________________________  Date: __________

Parent/Guardian Signature (if needed): _________________________________  Date: __________

Trainer Signature: _________________________________  Date: __________`,

    waiver: `ASSUMPTION OF RISK, WAIVER AND RELEASE OF LIABILITY, AND INDEMNITY AGREEMENT

Trainer Information:
Name: ___________________________________
Business Name: ___________________________________

Client Information:
Name: ___________________________________
Address: ___________________________________

This Agreement is entered into between the above-named Trainer and Client.

DECLARATIONS:
The provision of personal training services by Trainer to Client, and Client's use of any premises, facilities or equipment are contingent upon this Agreement.

ASSUMPTION OF RISK:
You agree that if you engage in any physical exercise or activity, including personal training, or enter our premises or use any facility or equipment on our premises for any purpose, you do so at your own risk and assume the risk of any and all injury and/or damage you may suffer.

This includes injury or damage sustained while and/or resulting from using any premises or facility, or using any equipment, whether provided to you by Trainer or otherwise, including injuries or damages arising out of the negligence of Trainer, whether active or passive.

Your assumption of risk includes, but is not limited to:
- Use of any exercise equipment (mechanical or otherwise)
- Sports fields, courts, or other areas
- Locker rooms, sidewalks, parking lots, stairs
- Pools, whirlpools, saunas, steam rooms
- Any activity, class, program, instruction, or event
- Weightlifting, walking, jogging, running, aerobic activities
- Aquatic activities, tennis, basketball, volleyball, racquetball
- Any other sporting or recreational endeavor

You agree that you are voluntarily participating in the aforementioned activities and assume all risk of injury, illness, damage, or loss to you or your property that might result, including any loss or theft of personal property, whether arising out of the negligence of Trainer or otherwise.

Initials: _____

RELEASE:
You agree on behalf of yourself (and all your personal representatives, heirs, executors, administrators, agents, and assigns) to release and discharge Trainer (and Trainer's affiliates, related entities, employees, agents, representatives, successors, and assigns) from any and all claims or causes of action (known or unknown) arising out of the negligence of Trainer.

This waiver and release of liability includes, without limitation, injuries which may occur as a result of:
(a) Your use of any exercise equipment or facilities which may malfunction or break
(b) Improper maintenance of any exercise equipment, premises or facilities
(c) Negligent instruction or supervision, including personal training
(d) Negligent hiring or retention of employees
(e) Slipping or tripping and falling while on any portion of a premises or while traveling to or from personal training

Initials: _____

INDEMNIFICATION:
By execution of this agreement, you hereby agree to indemnify and hold harmless Trainer from any loss, liability, damage, or cost Trainer may incur due to the provision of personal training by Trainer to you.

Initials: _____

ACKNOWLEDGMENTS:
You expressly agree that the foregoing release, waiver, assumption of risk and indemnity agreement is intended to be as broad and inclusive as permitted by law. You acknowledge that Trainer offers a service encompassing the entire recreational and/or fitness spectrum.

You acknowledge that you have carefully read this waiver and release and fully understand that it is a release of liability, express assumption of risk and indemnity agreement. You are aware and agree that by executing this waiver and release, you are giving up your right to bring a legal action or assert a claim against Trainer for Trainer's negligence.

This release is not intended as an attempted release of claims of gross negligence or intentional acts.

LIABILITY DISCLAIMER:
ApexCoaching and its trainers shall not be held liable for any injuries, damages, or losses sustained by Client during or after participation in the personal training program. Client acknowledges that participation in fitness activities is at Client's own risk.

I have read and voluntarily signed this waiver and release and further agree that no oral representations, statements, or inducement apart from the foregoing written agreement have been made.

Client Name (Print): _________________________________
Client Signature: _________________________________  Date: __________

Parent/Guardian Signature (if needed): _________________________________  Date: __________

Witness Signature: _________________________________  Date: __________`,

    intake_form: `PERSONAL TRAINING CONSULTATION & INTAKE FORM

Client Name: ___________________________________
Date of Birth: ___________________________________
Phone: ___________________________________
Email: ___________________________________

1. What are your primary health and fitness goals?
____________________________________________________________________________________

2. Have you ever worked with a personal trainer before?
____________________________________________________________________________________

3. Describe your current exercise routine (frequency, intensity, type):
____________________________________________________________________________________

4. How many hours of sleep do you get per night?
____________________________________________________________________________________

5. Rate your daily stress levels on a scale of 1-10:
____________________________________________________________________________________

6. Are you currently following any specific diet or nutrition plan?
____________________________________________________________________________________

7. How much water do you drink daily?
____________________________________________________________________________________

Signature: ______________________ Date: ___________`,

    par_q: `PHYSICAL ACTIVITY READINESS QUESTIONNAIRE (PAR-Q)

Please read each question carefully and answer YES or NO:

1. Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor? [  ]
2. Do you feel pain in your chest when you do physical activity? [  ]
3. In the past month, have you had chest pain when you were not doing physical activity? [  ]
4. Do you lose your balance because of dizziness or do you ever lose consciousness? [  ]
5. Do you have a bone or joint problem that could be made worse by a change in your physical activity? [  ]
6. Is your doctor currently prescribing drugs for your blood pressure or heart condition? [  ]
7. Do you know of any other reason why you should not do physical activity? [  ]

If you answered YES to one or more questions, talk with your doctor before you start becoming much more physically active.

Client Signature: ______________________ Date: ___________`,

    medical_release: `MEDICAL RELEASE FORM

Dear Doctor,

Your patient, ___________________________, wishes to start a personalized fitness program. They have indicated a medical condition or answered YES to a PAR-Q question that requires your clearance.

Program Details:
The fitness program may include cardiovascular training, resistance training, flexibility exercises, and high-intensity interval training (HIIT) depending on their capabilities.

Physician's Recommendations/Restrictions:
____________________________________________________________________________________
____________________________________________________________________________________

Physician's Clearance:
[ ] I know of no medical reason why this patient should not participate in a fitness program.
[ ] I believe this patient can participate but with the restrictions noted above.
[ ] I DO NOT recommend that this patient participate in a fitness program at this time.

Physician Name: __________________________
Physician Signature: ______________________ Date: ___________`,

    goal_setting: `FITNESS GOAL SETTING TEMPLATE

Specific: What exactly do I want to achieve?
____________________________________________________________________________________

Measurable: How will I track my progress? What is the metric?
____________________________________________________________________________________

Achievable: Is this goal realistic given my current lifestyle and constraints?
____________________________________________________________________________________

Relevant: Why is this goal important to me? How does it align with my broader life objectives?
____________________________________________________________________________________

Time-bound: When do I want to achieve this by? (Target Date)
____________________________________________________________________________________

Milestones (What needs to happen along the way):
1. _________________________________________________________________________________
2. _________________________________________________________________________________
3. _________________________________________________________________________________

Client Signature: ______________________ Date: ___________`,

    feedback_form: `PERSONAL TRAINING SESSION FEEDBACK FORM

Client Name: ______________________ Date: ___________

1. How would you rate today's session overall? (1 = Poor, 5 = Excellent)
____________________________________________________________________________________

2. Did the workout feel too easy, too hard, or just right?
____________________________________________________________________________________

3. Was there any exercise that caused pain or extreme discomfort?
____________________________________________________________________________________

4. Do you feel you are progressing toward your goals?
____________________________________________________________________________________

5. What could your trainer do to improve your experience?
____________________________________________________________________________________

Thank you for your feedback!`
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Contracts & Waivers</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage client agreements and liability waivers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setUploadOpen(true)} variant="outline" className="border-[#8b5cf6]/40 text-[#a78bfa] hover:bg-[#8b5cf6]/10 flex-1 sm:flex-none">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button onClick={() => { resetForm(); setFormOpen(true); }} className="flex-1 sm:flex-none" style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)', color: 'black', fontWeight: 700 }}>
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="block sm:hidden space-y-3">
        {contracts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground rounded-2xl glass-card">No contracts yet</div>
        )}
        {contracts.map((contract) => (
          <div key={contract.id} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{contract.title}</p>
                {contract.client_name && <p className="text-xs text-muted-foreground mt-0.5">{contract.client_name}</p>}
              </div>
              {statusBadge(contract.status)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{contract.type?.replace(/_/g, ' ')}</span>
              <span>{format(new Date(contract.created_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(contract)}>Edit</Button>
              {contract.status === 'draft' && (
                <Button size="sm" className="flex-1" onClick={() => sendMutation.mutate(contract.id)}>
                  <Send className="w-3.5 h-3.5 mr-1" /> Send
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="glass-card hidden sm:block">
        <CardHeader>
          <CardTitle className="text-foreground">All Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    {contract.title}
                  </TableCell>
                  <TableCell>{contract.client_name}</TableCell>
                  <TableCell className="capitalize">{(contract.type || 'agreement').replace('_', ' ')}</TableCell>
                  <TableCell>{statusBadge(contract.status)}</TableCell>
                  <TableCell>{format(new Date(contract.created_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(contract)}>Edit</Button>
                      {contract.status === 'draft' && (
                        <Button size="sm" onClick={() => sendMutation.mutate(contract.id)}>
                          <Send className="w-4 h-4 mr-1" /> Send
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UploadContractDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clients={clients}
        trainerId={user?.id}
        onCreated={() => queryClient.invalidateQueries(['contracts'])}
      />

      <ESignDialog
        open={eSignOpen}
        onOpenChange={setESignOpen}
        contract={contractToSign}
        client={clients.find(c => c.id === contractToSign?.client_id)}
        onComplete={() => {
          queryClient.invalidateQueries(['contracts']);
          setESignOpen(false);
          setContractToSign(null);
        }}
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Edit Contract' : 'Create Contract'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingContract) {
              updateMutation.mutate({ id: editingContract.id, data: formData });
            } else {
              createMutation.mutate(formData);
            }
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={formData.client_id} onValueChange={(val) => setFormData({ ...formData, client_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contract Type</Label>
                <Select value={formData.type} onValueChange={(val) => {
                  setFormData({ 
                    ...formData, 
                    type: val,
                    content: contractTemplates[val] || formData.content
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="purchase_agreement">Purchase Agreement</SelectItem>
                    <SelectItem value="waiver">Liability Waiver</SelectItem>
                    <SelectItem value="intake_form">Consultation & Intake Form</SelectItem>
                    <SelectItem value="par_q">PAR-Q</SelectItem>
                    <SelectItem value="medical_release">Medical Release</SelectItem>
                    <SelectItem value="goal_setting">Goal Setting</SelectItem>
                    <SelectItem value="feedback_form">Session Feedback</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Contract Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Contract Content</Label>
              <div className="border border-slate-300 rounded-lg p-6 bg-white font-mono text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                {formData.content.split(/(_+[A-Z_]+_+)/g).map((segment, idx) => {
                  if (segment.match(/^_+[A-Z_]+_+$/)) {
                    const placeholder = segment.replace(/_/g, '');
                    return (
                      <input
                        key={idx}
                        type="text"
                        className="border-b-2 border-emerald-500 bg-emerald-50 px-2 py-1 font-medium"
                        placeholder={placeholder}
                        onChange={(e) => {
                          const newContent = formData.content.replace(segment, e.target.value || segment);
                          setFormData({ ...formData, content: newContent });
                        }}
                      />
                    );
                  }
                  return <span key={idx}>{segment}</span>;
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editingContract ? 'Update' : 'Create'} Contract</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}