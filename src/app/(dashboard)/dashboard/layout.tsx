export default function DashboardHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-home-layout min-w-0">
      {children}
    </div>
  );
}
