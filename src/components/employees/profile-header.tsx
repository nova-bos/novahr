"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { employmentTypeLabel, formatDate, getInitials } from "@/lib/format";
import type { Employee } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function ProfileHeader({
  employee,
  onEdit,
}: {
  employee: Employee;
  onEdit: () => void;
}) {
  const { user } = useAuth();
  const isSelf = user?.employeeId === employee.id;
  const canEdit = user?.role === "hr";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={isSelf ? "/dashboard" : "/employees"}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {isSelf ? "Back to dashboard" : "Back to employees"}
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar size="lg" className="size-16">
            <AvatarFallback
              className="text-lg text-white"
              style={{ backgroundColor: employee.avatarColor }}
            >
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {employee.firstName} {employee.lastName}
              </h2>
              <StatusBadge status={employee.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.jobTitle} · {employee.department}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                {employee.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {employee.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {employee.location}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="secondary">{employmentTypeLabel(employee.employmentType)}</Badge>
              <Badge variant="secondary">Employee #{employee.employeeNumber}</Badge>
              <Badge variant="secondary">Joined {formatDate(employee.startDate)}</Badge>
            </div>
          </div>
        </div>
        {canEdit && (
          <Button onClick={onEdit} variant="outline" className="shrink-0">
            <Pencil />
            Edit profile
          </Button>
        )}
      </div>
    </div>
  );
}
