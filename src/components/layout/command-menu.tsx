"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarRange, Search, UserPlus, Wallet } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-provider";
import { useScopedEmployees } from "@/lib/auth/scope";
import { useTenants } from "@/lib/store/hooks";
import { getInitials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { getNavItems } from "./nav-config";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const navItems = getNavItems(user);
  const employees = useScopedEmployees();
  const tenants = useTenants();

  const showQuickActions = user?.role === "hr";
  const showEmployees = (user?.role === "hr" || user?.role === "manager") && employees.length > 0;
  const showWorkspaces = user?.role === "hr" || user?.role === "exco";
  const searchLabel =
    user?.role === "manager"
      ? "Search team, pages..."
      : showEmployees
        ? "Search employees, pages..."
        : "Search pages...";

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const runCommand = React.useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-9 w-52 justify-between gap-2 border-border/70 bg-background px-3 font-normal text-muted-foreground shadow-none lg:flex xl:w-64"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          <span className="text-sm">{searchLabel}</span>
        </span>
        <CommandShortcut className="hidden sm:inline-flex">⌘K</CommandShortcut>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="size-9 border-border/70 bg-background text-muted-foreground shadow-none lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="size-[18px]" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem
                key={item.href}
                value={item.title}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {showQuickActions && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick actions">
                <CommandItem
                  value="add employee"
                  onSelect={() => runCommand(() => router.push("/employees/new"))}
                >
                  <UserPlus />
                  <span>Add new employee</span>
                </CommandItem>
                <CommandItem
                  value="run payroll"
                  onSelect={() => runCommand(() => router.push("/payroll"))}
                >
                  <Wallet />
                  <span>Run payroll</span>
                </CommandItem>
                <CommandItem
                  value="leave requests"
                  onSelect={() => runCommand(() => router.push("/leave"))}
                >
                  <CalendarRange />
                  <span>Review leave requests</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
          {showEmployees && (
            <>
              <CommandSeparator />
              <CommandGroup heading={user?.role === "manager" ? "My team" : "Employees"}>
                {employees.slice(0, 8).map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={`${employee.firstName} ${employee.lastName} ${employee.jobTitle}`}
                    onSelect={() => runCommand(() => router.push(`/employees/${employee.id}`))}
                  >
                    {employee.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={employee.photoUrl}
                        alt=""
                        className="size-5 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: employee.avatarColor }}
                      >
                        {getInitials(employee.firstName, employee.lastName)}
                      </span>
                    )}
                    <span>
                      {employee.firstName} {employee.lastName}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {employee.jobTitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {showWorkspaces && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Workspaces">
                {tenants.map((tenant) => (
                  <CommandItem
                    key={tenant.id}
                    value={tenant.name}
                    onSelect={() => runCommand(() => router.push("/tenants"))}
                  >
                    <Building2 />
                    <span>{tenant.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
