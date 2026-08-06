import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sheet, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function GoogleSheetsImporter({ open, onOpenChange, onImported }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [dataType, setDataType] = useState('clients');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!spreadsheetId) {
      toast.error('Please enter a spreadsheet ID or URL');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // Extract spreadsheet ID from URL if full URL was pasted
      let id = spreadsheetId;
      const urlMatch = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch) {
        id = urlMatch[1];
      }

      const response = await base44.functions.invoke('importFromGoogleSheets', {
        spreadsheetId: id,
        sheetName: sheetName || undefined,
        dataType
      });

      if (response.data?.success) {
        setResult(response.data);
        toast.success(`Imported ${response.data.imported} ${dataType}!`);
        onImported?.();
      } else {
        toast.error(response.data?.error || 'Import failed');
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="w-5 h-5 text-green-500" />
            Import from Google Sheets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sharing requirement */}
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-700">
                In Google Sheets, click <strong>Share</strong> and set the link to{' '}
                <strong>"Anyone with the link — Viewer"</strong>. No sign-in needed — we read the sheet directly.
              </p>
            </div>
          </Card>

          {/* Data Type Selection */}
          <div>
            <Label>Import Type</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clients">Client Data</SelectItem>
                <SelectItem value="exercises">Exercise Templates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spreadsheet ID */}
          <div>
            <Label>Google Sheets URL or ID</Label>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/... or spreadsheet ID"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste the full URL or just the spreadsheet ID
            </p>
          </div>

          {/* Sheet Name (Optional) */}
          <div>
            <Label>Sheet Name (optional)</Label>
            <Input
              placeholder="Leave blank for first sheet"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            />
          </div>

          {/* Expected Format Guide */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-sm mb-2">Expected Format:</h4>
            {dataType === 'clients' ? (
              <div className="text-xs text-gray-700 space-y-1">
                <p><strong>First row:</strong> Headers (name, email, phone, age, gender, goals, medical_notes, weight, height)</p>
                <p><strong>Following rows:</strong> Client data</p>
                <p className="text-blue-600 mt-2">Tip: Existing clients (matched by email) will be updated, new ones will be created</p>
              </div>
            ) : (
              <div className="text-xs text-gray-700 space-y-1">
                <p><strong>First row:</strong> Headers (name, description, category, difficulty, sets, reps, rest)</p>
                <p><strong>Following rows:</strong> Exercise data</p>
                <p className="text-blue-600 mt-2">Tip: Each row creates a new exercise template</p>
              </div>
            )}
          </Card>

          {/* Import Results */}
          {result && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Import Complete</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Successfully imported {result.imported} of {result.total} rows
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-red-600">Errors:</p>
                      {result.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} className="text-xs text-red-600">
                          Row {err.row}: {err.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={importing}
              className="bg-green-600 hover:bg-green-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}