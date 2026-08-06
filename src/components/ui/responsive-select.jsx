import * as React from "react"
import { useMediaQuery } from "@/components/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ResponsiveSelect({ value, onValueChange, options, placeholder, className, title }) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  if (isDesktop) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className={`w-full justify-start font-normal text-left px-3 h-9 ${className || ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        {title && <DrawerTitle className="sr-only">{title}</DrawerTitle>}
        <div className="max-h-[50vh] overflow-y-auto mt-4 border-t">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`p-4 border-b text-center cursor-pointer transition-colors hover:bg-muted ${value === opt.value ? 'bg-muted font-bold' : ''}`}
              onClick={() => {
                onValueChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}