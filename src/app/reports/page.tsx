import ReportsTabsClient from "./ui/ReportsTabsClient";

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <ReportsTabsClient />
        </div>
      </div>
    </div>
  );
}
