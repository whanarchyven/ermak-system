import React, { useRef } from "react";
import { Button } from "./button";
import { Label } from "./label";
import { cn } from "@/lib/utils";

interface FormMultiFileUploadProps {
  label: string;
  onFileSelect: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
  isUploading?: boolean;
  previewUrls?: string[];
  onRemove?: (index: number) => void;
  className?: string;
}

export function FormMultiFileUpload({
  label,
  onFileSelect,
  accept = "image/*",
  disabled = false,
  isUploading = false,
  previewUrls,
  onRemove,
  className,
}: FormMultiFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileSelect(Array.from(files));
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Выбрать файлы
            </>
          )}
        </Button>
      </div>
      {previewUrls && previewUrls.length > 0 && (
          <div className="flex items-center mt-2 gap-2 overflow-x-auto">
            {previewUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-1">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                {onRemove && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemove(index)}
                    disabled={disabled}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
