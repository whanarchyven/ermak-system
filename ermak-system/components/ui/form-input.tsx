import React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "number";
  step?: string;
  className?: string;
  disabled?: boolean;
  onKeyPress?: (e: React.KeyboardEvent) => void;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  step,
  className,
  disabled = false,
  onKeyPress,
}: FormInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, "-")} className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={label.toLowerCase().replace(/\s+/g, "-")}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        disabled={disabled}
        onKeyPress={onKeyPress}
        className="w-full"
      />
    </div>
  );
} 