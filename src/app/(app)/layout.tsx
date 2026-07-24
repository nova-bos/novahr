import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/components/layout/page-transition";
import { TrialGate } from "@/components/layout/trial-gate";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Topbar />
          <main className="flex min-w-0 max-w-full flex-1 flex-col gap-6 overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-6">
            <TrialGate>
              <PageTransition>{children}</PageTransition>
            </TrialGate>
          </main>
        </SidebarInset>
        <BottomNav />
      </SidebarProvider>
    </AuthGuard>
  );
}
