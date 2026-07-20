"use client";

import * as React from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store/app-provider";
import { uploadEmployeePhotoAction } from "@/lib/employees/actions";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_DIMENSION = 1024;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

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
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", compressed);
      const result = await uploadEmployeePhotoAction(employee.id, fd);
      if (result.error) {
        toast.error("Upload failed", { description: result.error });
        return;
      }
      await updateEmployeePhoto(employee.id, result.photoUrl!);
      toast.success("Photo updated");
    } catch {
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
