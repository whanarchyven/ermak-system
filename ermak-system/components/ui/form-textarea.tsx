import React from "react";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  className,
  disabled = false,
}: FormTextareaProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")} className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Textarea
        id={label.toLowerCase().replace(/\s+/g, "-")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full resize-none"
      />
    </div>
  );
} 