import { Briefcase, Calendar, Hash, MapPin, Phone, Shield, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { employmentTypeLabel, formatDate } from "@/lib/format";
import { useEmployee } from "@/lib/store/hooks";
import type { Employee } from "@/lib/types";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function ProfileOverview({ employee }: { employee: Employee }) {
  const manager = useEmployee(employee.managerId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Employment details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoRow icon={Hash} label="Employee number" value={employee.employeeNumber} />
            <InfoRow icon={Briefcase} label="Job title" value={employee.jobTitle} />
            <InfoRow icon={Calendar} label="Start date" value={formatDate(employee.startDate)} />
            <InfoRow
              icon={User}
              label="Employment type"
              value={employmentTypeLabel(employee.employmentType)}
            />
            <InfoRow icon={MapPin} label="Location" value={employee.location} />
            <InfoRow
              icon={Shield}
              label="Reports to"
              value={
                manager ? `${manager.firstName} ${manager.lastName}` : "No manager assigned"
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoRow icon={Hash} label="ID number" value={employee.idNumber} />
            <InfoRow icon={Hash} label="Tax number" value={employee.taxNumber} />
          </div>
          <Separator className="my-5" />
          <div className="grid gap-5 sm:grid-cols-2">
            <InfoRow icon={MapPin} label="Residential address" value={employee.address} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-3">
            <InfoRow icon={User} label="Name" value={employee.emergencyContact.name} />
            <InfoRow
              icon={Shield}
              label="Relationship"
              value={employee.emergencyContact.relationship}
            />
            <InfoRow icon={Phone} label="Phone" value={employee.emergencyContact.phone} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
