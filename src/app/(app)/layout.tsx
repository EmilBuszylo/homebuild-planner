export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-svh bg-background">{children}</div>;
}
