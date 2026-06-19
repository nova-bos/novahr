"use client";

import * as React from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store/app-provider";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const BUCKET = "employee-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPT = "image/jpeg,image/png,image/webp";

interface AvatarUploadProps {
  employee: Employee;
  size?: number;
}

export function AvatarUpload({ employee, size = 64 }: AvatarUploadProps) {
  const { updateEmployeePhoto } = useApp();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error("Photo too large", { description: "Please choose an image under 5 MB." });
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${employee.tenantId}/${employee.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Bust any CDN cache with a timestamp query param
      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateEmployeePhoto(employee.id, photoUrl);
      toast.success("Photo updated");
    } catch (err) {
      console.error("[AvatarUpload]", err);
      toast.error("Upload failed", { description: "Please try again." });
    } finally {
      setUploading(false);
    }
  }

  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();

  return (
    <button
      type="button"
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        uploading && "cursor-wait"
      )}
      style={{ width: size, height: size }}
      onClick={() => !uploading && inputRef.current?.click()}
      aria-label="Upload profile photo"
    >
      {employee.photoUrl ? (
        <Image
          src={employee.photoUrl}
          alt={`${employee.firstName} ${employee.lastName}`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-lg font-semibold text-white"
          style={{ backgroundColor: employee.avatarColor }}
        >
          {initials}
        </span>
      )}

      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-white" />
        ) : (
          <Camera className="size-5 text-white" />
        )}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  );
}
