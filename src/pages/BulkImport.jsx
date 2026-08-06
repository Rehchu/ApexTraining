import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Users, Dumbbell } from "lucide-react";
import { toast } from "sonner";

export default function BulkImport() {
  const [importType, setImportType] = useState("clients");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    
    // Read and preview first 5 rows
    const text = await selectedFile.text();
    const rows = text.split('\n').filter(r => r.trim());
    const previewRows = rows.slice(0, 6).map(row => {
      return row.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
    setPreview(previewRows);
    setImportResults(null);
  };

  const parseCSV = (text) => {
    const rows = text.split('\n').filter(r => r.trim());
    const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    return rows.slice(1).map(row => {
      const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!file || !user?.id) return;

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      let success = 0;
      let failed = 0;
      const errors = [];

      if (importType === "clients") {
        for (const row of data) {
          try {
            // Map common CSV headers to client fields
            const clientData = {
              full_name: row.name || row.full_name || row['client name'] || '',
              email: row.email || row['email address'] || '',
              phone: row.phone || row['phone number'] || row.mobile || '',
              age: row.age ? parseInt(row.age) : undefined,
              gender: row.gender?.toLowerCase(),
              goals: row.goals || row.notes || '',
              trainer_id: user.id
            };

            // Check for existing client by email
            if (clientData.email) {
              const existing = await base44.entities.Client.filter({ 
                email: clientData.email,
                trainer_id: user.id 
              });

              if (existing.length > 0) {
                // Update existing client
                await base44.entities.Client.update(existing[0].id, clientData);
              } else {
                // Create new client
                await base44.entities.Client.create(clientData);
              }
              success++;
            } else {
              failed++;
              errors.push(`Row missing email: ${clientData.full_name || 'Unknown'}`);
            }
          } catch (err) {
            failed++;
            errors.push(`Error processing ${row.name || row.email}: ${err.message}`);
          }
        }

        queryClient.invalidateQueries(['clients']);
      } else if (importType === "exercises") {
        for (const row of data) {
          try {
            const exerciseData = {
              name: row.name || row.exercise || row['exercise name'] || '',
              description: row.description || row.instructions || '',
              body_part: row.body_part || row.bodypart || row.muscle || '',
              equipment: row.equipment || row.gear || 'bodyweight',
              difficulty: row.difficulty || row.level || 'intermediate',
              category: row.category || row.type || 'strength'
            };

            if (exerciseData.name) {
              // Check if exercise already exists
              const existing = await base44.entities.Resource.filter({ 
                title: exerciseData.name,
                category: 'workout',
                trainer_id: user.id
              });

              if (existing.length === 0) {
                await base44.entities.Resource.create({
                  title: exerciseData.name,
                  content: exerciseData.description,
                  category: 'workout',
                  trainer_id: user.id,
                  folder: 'Imported Exercises'
                });
              }
              success++;
            } else {
              failed++;
              errors.push('Row missing exercise name');
            }
          } catch (err) {
            failed++;
            errors.push(`Error processing exercise: ${err.message}`);
          }
        }

        queryClient.invalidateQueries(['resources']);
      }

      setImportResults({ success, failed, errors, total: data.length });
      
      if (failed === 0) {
        toast.success(`Successfully imported ${success} ${importType}`);
      } else {
        toast.warning(`Imported ${success} of ${data.length} ${importType}`);
      }
    } catch (err) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (type) => {
    let csvContent = '';
    
    if (type === 'clients') {
      csvContent = 'Name,Email,Phone,Age,Gender,Goals\n';
      csvContent += 'John Doe,john@example.com,555-0100,35,male,Weight loss and muscle gain\n';
      csvContent += 'Jane Smith,jane@example.com,555-0101,28,female,Marathon training';
    } else {
      csvContent = 'Name,Description,Body Part,Equipment,Difficulty\n';
      csvContent += 'Barbell Squat,Lower body compound exercise,legs,barbell,intermediate\n';
      csvContent += 'Push-ups,Upper body bodyweight exercise,chest,bodyweight,beginner';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Bulk Import</h1>
        <p className="text-muted-foreground">Import client data and exercises from CSV files</p>
      </div>

      <Tabs value={importType} onValueChange={setImportType} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clients" className="gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="exercises" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            Exercises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2CD49F]" />
                Import Clients
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Upload a CSV file with client information. Existing clients (matched by email) will be updated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <FileSpreadsheet className="w-4 h-4" />
                <AlertDescription>
                  <strong>Required columns:</strong> Name, Email<br />
                  <strong>Optional columns:</strong> Phone, Age, Gender, Goals
                </AlertDescription>
              </Alert>

              <Button 
                variant="outline" 
                onClick={() => downloadTemplate('clients')}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#2CD49F]" />
                Import Exercises
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Upload a CSV file with exercise library data. Exercises will be added to your Resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <FileSpreadsheet className="w-4 h-4" />
                <AlertDescription>
                  <strong>Required columns:</strong> Name<br />
                  <strong>Optional columns:</strong> Description, Body Part, Equipment, Difficulty
                </AlertDescription>
              </Alert>

              <Button 
                variant="outline" 
                onClick={() => downloadTemplate('exercises')}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-foreground">Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-2"
            />
          </div>

          {preview.length > 0 && (
            <div>
              <Label className="mb-2 block">Preview (first 5 rows)</Label>
              <div className="border border-slate-700 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview[0]?.map((header, idx) => (
                        <TableHead key={idx} className="text-foreground">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(1).map((row, idx) => (
                      <TableRow key={idx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {importResults && (
            <Alert className={importResults.failed === 0 ? "border-green-500" : "border-yellow-500"}>
              {importResults.failed === 0 ? 
                <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              }
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    Import Complete: {importResults.success} successful, {importResults.failed} failed
                  </p>
                  {importResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold mb-1">Errors:</p>
                      <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                        {importResults.errors.map((error, idx) => (
                          <li key={idx} className="text-red-400">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full sm:w-auto"
            style={{ background: 'linear-gradient(135deg, #2CD49F, #10b981)' }}
          >
            {importing ? (
              <>Processing...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {importType}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}