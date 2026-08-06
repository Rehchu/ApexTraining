import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ParQForm({ clientId, clientUserId, clientName, onComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    q1: false,
    q2: false,
    q3: false,
    q4: false,
    q5: false,
    q6: false,
    q7: false,
    agree: false
  });

  const questions = [
    "Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?",
    "Do you feel pain in your chest when you do physical activity?",
    "In the past month, have you had chest pain when you were not doing physical activity?",
    "Do you lose your balance because of dizziness or do you ever lose consciousness?",
    "Do you have a bone or joint problem (for example, back, knee or hip) that could be made worse by a change in your physical activity?",
    "Is your doctor currently prescribing drugs (for example, water pills) for your blood pressure or heart condition?",
    "Do you know of any other reason why you should not do physical activity?"
  ];

  const anyYes = Object.keys(formData).filter(k => k.startsWith('q')).some(k => formData[k]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree) {
      toast.error("Please read and agree to the PAR-Q statement");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await base44.entities.Contract.create({
        client_id: clientId,
        client_user_id: clientUserId,
        client_name: clientName || "Client",
        title: "PAR-Q Form",
        type: "waiver",
        content: JSON.stringify(formData, null, 2),
        status: "signed",
        signed_date: new Date().toLocaleDateString('sv-SE')
      });
      onComplete(formData);
      toast.success("PAR-Q form submitted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Physical Activity Readiness Questionnaire (PAR-Q)</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            The PAR-Q is designed to help identify individuals for whom physical activity might be inappropriate or those who should have medical advice.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {questions.map((question, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                <Checkbox
                  id={`q${idx + 1}`}
                  checked={formData[`q${idx + 1}`]}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, [`q${idx + 1}`]: checked })
                  }
                  className="mt-1"
                />
                <Label htmlFor={`q${idx + 1}`} className="text-sm font-normal cursor-pointer">
                  {question}
                </Label>
              </div>
            ))}
          </div>

          {anyYes && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-900 mb-1">⚠️ Medical Clearance Required (NASM/ISSA Scope of Practice)</p>
                <p className="text-red-800">
                  You answered "Yes" to one or more questions. <strong>You must obtain written physician clearance before beginning any exercise program.</strong> Bring this PAR-Q to your doctor. Your trainer cannot begin programming until clearance is received. This is required by NASM and ISSA professional standards.
                </p>
              </div>
            </div>
          )}

          {!anyYes && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                You answered "No" to all questions. You have reasonable assurance of your suitability for a graduated exercise program.
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <strong>HIPAA Notice:</strong> The health information you provide on this form is confidential and will only be used to design a safe and effective exercise program. It will not be shared with third parties without your written consent, except as required by law.
          </div>

          <div className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50">
            <Checkbox
              id="agree"
              checked={formData.agree}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, agree: checked })
              }
            />
            <Label htmlFor="agree" className="text-sm font-normal cursor-pointer">
              I have read, understood, and completed this questionnaire. I acknowledge that I understand the purpose and the recommendations of the PAR-Q. I confirm the information provided is accurate and I consent to my trainer using this information solely for fitness programming purposes.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit PAR-Q Form
        </Button>
      </div>
    </div>
  );
}