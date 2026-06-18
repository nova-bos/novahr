import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/components/layout/page-transition";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Topbar />
          <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <WhatsAppButton />
    </AuthGuard>
  );
}
