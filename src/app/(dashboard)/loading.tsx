import {
  PageSkeleton,
} from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="ls-page py-2">
      <PageSkeleton />
    </div>
  );
}
