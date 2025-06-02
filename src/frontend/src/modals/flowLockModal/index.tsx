import { format } from "date-fns";
import { Lock } from "lucide-react";
import BaseModal from "../baseModal";
import { Button } from "@/components/ui/button";
import { FlowType } from "@/types/flow";

interface FlowLockModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  flow: FlowType;
  onUnlock: () => Promise<void>;
}

export default function FlowLockModal({
  open,
  setOpen,
  flow,
  onUnlock,
}: FlowLockModalProps): JSX.Element {
  if (!open) return <></>;

  return (
    <BaseModal open={open} setOpen={setOpen} size="small-update">
      <BaseModal.Header>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <span className="text-base font-semibold">Flow Lock Information</span>
        </div>
      </BaseModal.Header>
      <BaseModal.Content>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Lock Status</span>
            <span className="text-sm text-muted-foreground">
              {flow.locked ? "Locked" : "Unlocked"}
            </span>
          </div>
          {flow.locked && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Locked By</span>
                <span className="text-sm text-muted-foreground">
                  {flow.locked_by_user?.username || "Unknown"}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Last Lock Activity</span>
                <span className="text-sm text-muted-foreground">
                  {flow.lock_updated_at
                    ? format(new Date(flow.lock_updated_at), "PPpp")
                    : "Unknown"}
                </span>
              </div>
            </>
          )}
        </div>
      </BaseModal.Content>
      <BaseModal.Footer>
        <div className="flex w-full gap-2">
          {flow.locked && (
            <Button
              variant="destructive"
              onClick={onUnlock}
              className="flex-1"
            >
              Unlock Flow
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </BaseModal.Footer>
    </BaseModal>
  );
} 