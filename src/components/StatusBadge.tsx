import {
  StatusBadge as AppStatusBadge,
} from "@/components/ui/status-badge";

export default function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <AppStatusBadge
      status={status}
    />
  );
}
