import { AppHeader } from "@/components/app/app-header";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      {children}
    </div>
  );
}
