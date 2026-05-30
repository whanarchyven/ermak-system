import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Выберите опцию",
  required = false,
  className,
  disabled = false,
}: FormSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")} className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 