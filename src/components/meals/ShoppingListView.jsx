import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Download, Printer, Plus, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ShoppingListView({ mealPlanId, mealPlanName, onOpenChange }) {
  const [shoppingList, setShoppingList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [customItem, setCustomItem] = useState("");
  const [customItems, setCustomItems] = useState([]);

  React.useEffect(() => {
    if (mealPlanId) {
      fetchShoppingList();
    }
  }, [mealPlanId]);

  const fetchShoppingList = async () => {
    setIsLoading(true);
    try {
      const mealPlans = await base44.entities.MealPlan.filter({ id: mealPlanId });
      if (!mealPlans || mealPlans.length === 0 || !mealPlans[0].meals) {
        setShoppingList([]);
        return;
      }
      
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a shopping list based on the following meals from a meal plan:\n${JSON.stringify(mealPlans[0].meals)}\n\nAggregate identical ingredients and convert units appropriately to make shopping easy. Return a JSON array of items with 'name', 'amount' (number), and 'unit' (string).`,
        response_json_schema: {
          type: "object",
          properties: {
            shoppingList: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  amount: { type: "number" },
                  unit: { type: "string" }
                }
              }
            }
          },
          required: ["shoppingList"]
        }
      });
      setShoppingList(res.shoppingList || []);
      setCheckedItems({});
    } catch (error) {
      console.error('Error generating shopping list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (itemKey) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  const addCustomItem = () => {
    if (customItem.trim()) {
      setCustomItems([...customItems, customItem]);
      setCustomItem("");
    }
  };

  const removeCustomItem = (index) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const listText = [
      `Shopping List - ${mealPlanName}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
      "ITEMS:",
      ...shoppingList.map(item => {
        const checked = checkedItems[`${item.fdc_id || item.name}`] ? "✓" : " ";
        return `[${checked}] ${item.name} - ${item.amount} ${item.unit}`;
      }),
      ...(customItems.length > 0 ? ["", "CUSTOM ITEMS:", ...customItems.map(item => `[ ] ${item}`)] : [])
    ].join("\n");

    const blob = new Blob([listText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopping-list-${mealPlanName}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping List - {mealPlanName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                {checkedCount} of {shoppingList.length + customItems.length} items
              </Badge>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Meal Plan Items</CardTitle>
                <CardDescription>{shoppingList.length} items from meal plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {shoppingList.length === 0 ? (
                  <p className="text-sm text-slate-500">No items in meal plan</p>
                ) : (
                  shoppingList.map((item, idx) => {
                    const itemKey = `${item.fdc_id || item.name}`;
                    const isChecked = checkedItems[itemKey];
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleItem(itemKey)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${isChecked ? "line-through text-slate-500" : "text-slate-900"}`}>
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.amount} {item.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Custom Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom item..."
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomItem}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {customItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50">
                      <Checkbox
                        checked={checkedItems[`custom-${idx}`]}
                        onCheckedChange={() => toggleItem(`custom-${idx}`)}
                      />
                      <div className="flex-1">
                        <div className={`text-sm ${checkedItems[`custom-${idx}`] ? "line-through text-slate-500" : "text-slate-900"}`}>
                          {item}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomItem(idx)}
                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}