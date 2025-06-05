import { useEffect, useState } from "react";
import BaseModal from "../baseModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetFlowUsers } from "@/controllers/API/queries/flows/use-get-flow-users";
import { useUpdateFlowUserPermissions } from "@/controllers/API/queries/flows/use-update-flow-user-permissions";
import useAlertStore from "@/stores/alertStore";
import { FlowType } from "@/types/flow";

interface FlowUsersModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  flowData?: FlowType;
}

export default function FlowUsersModal({
  open,
  setOpen,
  flowData,
}: FlowUsersModalProps): JSX.Element {
  const [users, setUsers] = useState<any[]>([]);
  const { data: flowUsersData, isLoading } = useGetFlowUsers(flowData?.id || "");
  const { mutateAsync: updateUserPermissions } = useUpdateFlowUserPermissions();
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);

  useEffect(() => {
    console.log("FlowUsersModal State:", {
      open,
      flowData,
      flowUsersData,
      isLoading,
      users
    });
  }, [open, flowData, flowUsersData, isLoading, users]);

  useEffect(() => {
    if (flowUsersData?.users) {
      console.log("Setting users from flowUsersData:", flowUsersData.users);
      setUsers(flowUsersData.users);
    }
  }, [flowUsersData]);

  const handlePermissionChange = async (userId: string, permission: string, value: boolean) => {
    try {
      console.log("Updating permission:", { userId, permission, value });
      await updateUserPermissions({
        flowId: flowData?.id || "",
        userId,
        permissions: {
          [permission]: value
        }
      });
      setSuccessData({
        title: "Permissions updated successfully"
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      setErrorData({
        title: "Error updating permissions",
        list: ["Please try again"]
      });
    }
  };

  if (!open) {
    console.log("Modal not open, returning empty fragment");
    return <></>;
  }

  console.log("Rendering FlowUsersModal");

  return (
    <BaseModal
      open={open}
      setOpen={setOpen}
      size="small-update"
      className="p-4"
    >
      <BaseModal.Header description="Manage user permissions for this flow">
        <span className="text-base font-semibold">Flow Users</span>
      </BaseModal.Header>
      <BaseModal.Content>
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {users.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{user.username}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`read-${user.user_id}`}
                        checked={user.can_read}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(user.user_id, "can_read", checked as boolean)
                        }
                      />
                      <label htmlFor={`read-${user.user_id}`}>Read</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`run-${user.user_id}`}
                        checked={user.can_run}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(user.user_id, "can_run", checked as boolean)
                        }
                      />
                      <label htmlFor={`run-${user.user_id}`}>Run</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${user.user_id}`}
                        checked={user.can_edit}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(user.user_id, "can_edit", checked as boolean)
                        }
                      />
                      <label htmlFor={`edit-${user.user_id}`}>Edit</label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </BaseModal.Content>
    </BaseModal>
  );
} 