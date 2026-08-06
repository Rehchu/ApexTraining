import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ResourceFolderView({ resources }) {
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Group resources by folder
  const folders = {};
  resources.forEach(resource => {
    const folder = resource.folder || "General";
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(resource);
  });

  const displayResources = selectedFolder ? folders[selectedFolder] : [];

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Folder List */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Folders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(folders).map(([folder, items]) => (
            <Button
              key={folder}
              variant={selectedFolder === folder ? "default" : "ghost"}
              className="w-full justify-between"
              onClick={() => setSelectedFolder(selectedFolder === folder ? null : folder)}
            >
              <span className="text-sm">{folder}</span>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {selectedFolder ? `${selectedFolder} (${displayResources.length})` : "Select a folder"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayResources.map(resource => (
            <div key={resource.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-slate-900">{resource.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{resource.description}</p>
                  <Badge className="mt-2 text-xs" variant="outline">{resource.category}</Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}