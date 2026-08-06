import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export default function MedicalReleaseFormPrintable({ clientName, trainerName, businessName }) {
  const printRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end no-print">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          Print Form
        </Button>
      </div>

      <div
        ref={printRef}
        className="bg-white p-8 print:p-4 text-sm leading-relaxed space-y-4"
        style={{ fontSize: "11pt" }}
      >
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold">MEDICAL RELEASE FORM</h1>
          <p className="text-xs mt-2">Physical Activity Readiness Assessment</p>
        </div>

        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="font-bold mb-3">SECTION I: TRAINER INFORMATION</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold">Trainer Name:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {trainerName || "_________________________________"}
                </div>
              </div>
              <div>
                <div className="font-semibold">Business Name:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {businessName || "_________________________________"}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h2 className="font-bold mb-3">SECTION II: CLIENT INFORMATION</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold">Client Name:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {clientName || "_________________________________"}
                </div>
              </div>
              <div>
                <div className="font-semibold">Date:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {"_" + "___".repeat(8)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="font-semibold">Physician Name:</div>
              <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                {"_________________________________"}
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h2 className="font-bold mb-3">SECTION III: ACTIVITY PLAN</h2>
            <div className="mb-3">
              <div className="font-semibold text-xs mb-2">Type of Activity (check all that apply):</div>
              <div className="space-y-1 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Cardiovascular Exercise</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Resistance Training</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Flexibility Training</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Other: ___________________________</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold">Duration/Frequency:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {"_" + "___".repeat(8)}
                </div>
              </div>
              <div>
                <div className="font-semibold">Intensity Level:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {"_" + "___".repeat(8)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="font-semibold text-xs mb-2">Additional Notes:</div>
              <div className="border border-black p-2" style={{ minHeight: "60px" }}>
                {""}
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h2 className="font-bold mb-3">SECTION IV: PHYSICIAN ASSESSMENT</h2>
            <p className="text-xs mb-3 italic">
              To be completed by the client's physician after reviewing the activity plan above.
            </p>

            <div className="mb-3">
              <div className="font-semibold text-xs mb-2">Medication Effect on Heart Rate:</div>
              <div className="space-y-1 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>No effect on heart rate response</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Raises heart rate response</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Lowers heart rate response</span>
                </label>
              </div>
            </div>

            <div className="mb-3">
              <div className="font-semibold text-xs mb-2">Recommendations or Restrictions:</div>
              <div className="border border-black p-2" style={{ minHeight: "60px" }}>
                {""}
              </div>
            </div>

            <div className="mb-3">
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" className="w-4 h-4 mt-1" />
                <span>The patient has my approval to begin an exercise program with the recommendations or restrictions stated above.</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mt-3">
              <div>
                <div className="font-semibold">Physician Name (Print):</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {"_________________________________"}
                </div>
              </div>
              <div>
                <div className="font-semibold">Date:</div>
                <div className="border-b border-black mt-1" style={{ minHeight: "20px" }}>
                  {"_" + "___".repeat(8)}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <div className="font-semibold text-xs">Physician Signature:</div>
              <div className="border-b border-black mt-1" style={{ minHeight: "25px" }}>
                {""}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-xs font-semibold mb-2">IMPORTANT - CLIENT TO COMPLETE:</p>
            <p className="text-xs">
              This form must be completed by your physician before beginning your exercise program. 
              Please take this form to your physician, have it completed, and return the signed form to your trainer.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .bg-white {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}