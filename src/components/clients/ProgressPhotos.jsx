import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProgressPhotos({ clientId }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ["progressLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }, "-date"),
    enabled: !!clientId,
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProgressLog.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progressLogs"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      // Find or create log for selected date
      let log = logs.find(l => l.date === selectedDate);
      
      if (log) {
        const currentPhotos = log.photo_urls || [];
        await updateLogMutation.mutateAsync({
          id: log.id,
          data: { photo_urls: [...currentPhotos, data.file_url] }
        });
      } else {
        await base44.entities.ProgressLog.create({
          client_id: clientId,
          date: selectedDate,
          photo_urls: [data.file_url]
        });
        queryClient.invalidateQueries({ queryKey: ["progressLogs"] });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (log, photoUrl) => {
    const updatedPhotos = (log.photo_urls || []).filter(url => url !== photoUrl);
    await updateLogMutation.mutateAsync({
      id: log.id,
      data: { photo_urls: updatedPhotos }
    });
  };

  const allPhotos = logs
    .filter(log => log.photo_urls && log.photo_urls.length > 0)
    .flatMap(log => 
      (log.photo_urls || []).map(url => ({
        url,
        date: log.date,
        logId: log.id
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Progress Photos
            </CardTitle>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
              <Button
                size="sm"
                disabled={isUploading}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
                onClick={() => document.getElementById('photo-upload').click()}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Upload Photo
              </Button>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {allPhotos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <div 
                    className="aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={`Progress ${photo.date}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="absolute inset-0 bg-secondary opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        const log = logs.find(l => l.id === photo.logId);
                        if (log) handleDeletePhoto(log, photo.url);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-center">
                    {new Date(photo.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-slate-500 mt-3">No progress photos yet</p>
              <p className="text-xs text-muted-foreground mt-1">Upload photos to track visual progress</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Progress Photo - {selectedPhoto && new Date(selectedPhoto.date).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto.url}
              alt="Progress"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}