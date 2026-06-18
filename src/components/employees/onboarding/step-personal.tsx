import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldErrors } from "@/lib/schemas/employee";
import type { NewEmployeeForm } from "./types";

interface StepProps {
  form: NewEmployeeForm;
  setForm: React.Dispatch<React.SetStateAction<NewEmployeeForm>>;
  errors: FieldErrors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function StepPersonal({ form, setForm, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Thandiwe"
              />
              <FieldError message={errors.firstName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Nkosi"
              />
              <FieldError message={errors.lastName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferredName">Preferred name (optional)</Label>
              <Input
                id="preferredName"
                value={form.preferredName}
                onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))}
                placeholder="Thandi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idNumber">ID number</Label>
              <Input
                id="idNumber"
                value={form.idNumber}
                onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))}
                placeholder="9203155012089"
              />
              <FieldError message={errors.idNumber} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="thandiwe.nkosi@company.co.za"
              />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="071 234 5678"
              />
              <FieldError message={errors.phone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxNumber">Tax number (optional)</Label>
              <Input
                id="taxNumber"
                value={form.taxNumber}
                onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
                placeholder="9012345678"
              />
              <FieldError message={errors.taxNumber} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Residential address</Label>
              <Textarea
                id="address"
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="12 Long Street, Cape Town, 8001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyName">Full name</Label>
              <Input
                id="emergencyName"
                value={form.emergencyName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))}
                placeholder="Nomsa Nkosi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyRelationship">Relationship</Label>
              <Input
                id="emergencyRelationship"
                value={form.emergencyRelationship}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emergencyRelationship: e.target.value }))
                }
                placeholder="Spouse"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyPhone">Phone number</Label>
              <Input
                id="emergencyPhone"
                value={form.emergencyPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                placeholder="082 345 6789"
              />
              <FieldError message={errors.emergencyPhone} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
