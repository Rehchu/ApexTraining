import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const COMMON_TAGS = ["beginner", "athlete", "weight loss", "strength", "endurance", "flexibility", "nutrition", "injury recovery", "senior", "youth"];

export default function ClientTagsFilter({ selectedTags, onTagsChange }) {
  const [showMore, setShowMore] = useState(false);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => onTagsChange([]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Filter by tags</h3>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700">
            Clear all
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {COMMON_TAGS.map(tag => (
          <Badge
            key={tag}
            onClick={() => toggleTag(tag)}
            className={cn(
              "cursor-pointer transition-all",
              selectedTags.includes(tag)
                ? "bg-emerald-600 text-foreground"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}