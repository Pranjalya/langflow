import { Button } from "@/components/ui/button";
import useSaveFlow from "@/hooks/flows/use-save-flow";
import useAlertStore from "@/stores/alertStore";
import useFlowsManagerStore from "@/stores/flowsManagerStore";
import useFlowStore from "@/stores/flowStore";
import { FlowType } from "@/types/flow";
import { cloneDeep } from "lodash";
import { useEffect, useState } from "react";
import EditFlowSettings from "../editFlowSettingsComponent";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetFlowUsers } from "@/controllers/API/queries/flows/use-get-flow-users";
import { useUpdateFlowUserPermissions } from "@/controllers/API/queries/flows/use-update-flow-user-permissions";
import useAuthStore from "@/stores/authStore";
import { useGetProjectUsers } from "@/controllers/API/queries/projects/use-get-project-users";
import { useParams } from "react-router-dom";

export default function FlowSettingsComponent({
  flowData,
  close,
}: {
  flowData?: FlowType;
  close: () => void;
}): JSX.Element {
  const saveFlow = useSaveFlow();
  const currentFlow = useFlowStore((state) =>
    flowData ? undefined : state.currentFlow,
  );
  const setCurrentFlow = useFlowStore((state) => state.setCurrentFlow);
  const { setSuccessData, setErrorData } = useAlertStore((state) => ({
    setSuccessData: state.setSuccessData,
    setErrorData: state.setErrorData
  }));
  const flows = useFlowsManagerStore((state) => state.flows);
  const flow = flowData ?? currentFlow;
  const [name, setName] = useState(flow?.name ?? "");
  const [description, setDescription] = useState(flow?.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [disableSave, setDisableSave] = useState(true);
  const autoSaving = useFlowsManagerStore((state) => state.autoSaving);

  // User management state and hooks
  const { folderId } = useParams();
  const userData = useAuthStore((state) => state.userData);
  const currentUserId = userData?.id;
  const userLevel = userData?.user_level;
  const { data: projectUsersData } = useGetProjectUsers(folderId || "");
  const { data: flowUsersData, isLoading: isLoadingFlowUsers } = useGetFlowUsers(flow?.id || "");
  const { mutateAsync: updateUserPermissions } = useUpdateFlowUserPermissions();
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, any>>({});
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  // Check if user can manage users (must be SUPER_ADMIN or PROJECT_ADMIN)
  const canManageUsers = userLevel === "SUPER_ADMIN" || 
    (folderId && projectUsersData?.users?.some(user => 
      user.user_id === currentUserId && user.is_project_admin
    ));

  useEffect(() => {
    setName(flow?.name ?? "");
    setDescription(flow?.description ?? "");
  }, [flow?.name, flow?.description, flow?.endpoint_name, open]);

  function handleClick(): void {
    setIsSaving(true);
    if (!flow) return;
    const newFlow = cloneDeep(flow);
    newFlow.name = name;
    newFlow.description = description;

    saveFlow(newFlow)
      ?.then(() => {
        setIsSaving(false);
        setSuccessData({ title: "Changes saved successfully" });
        close();
      })
      .catch(() => {
        setIsSaving(false);
      });
  }

  const [nameLists, setNameList] = useState<string[]>([]);

  useEffect(() => {
    if (flows) {
      const tempNameList: string[] = [];
      flows.forEach((flow: FlowType) => {
        tempNameList.push(flow?.name ?? "");
      });
      setNameList(tempNameList.filter((name) => name !== (flow?.name ?? "")));
    }
  }, [flows]);

  useEffect(() => {
    if (
      (!nameLists.includes(name) && flow?.name !== name) ||
      flow?.description !== description
    ) {
      setDisableSave(false);
    } else {
      setDisableSave(true);
    }
  }, [nameLists, flow, description, name]);

  const handlePermissionChange = (userId: string, permission: string, value: boolean) => {
    setPendingPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [permission]: value
      }
    }));
  };

  const handleUpdatePermissions = async () => {
    setIsUpdatingPermissions(true);
    try {
      const updates = Object.entries(pendingPermissions).map(([userId, permissions]) => ({
        flowId: flow?.id || "",
        userId,
        permissions
      }));

      await Promise.all(updates.map(update => updateUserPermissions(update)));
      setSuccessData({ title: "Permissions updated successfully" });
      setPendingPermissions({});
    } catch (error) {
      console.error("Error updating permissions:", error);
      setErrorData({
        title: "Error updating permissions",
        list: ["Please try again"]
      });
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const hasPendingPermissionChanges = Object.keys(pendingPermissions).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <EditFlowSettings
          invalidNameList={nameLists}
          name={name}
          description={description}
          setName={setName}
          setDescription={setDescription}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          data-testid="cancel-flow-settings"
          onClick={() => close()}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          size="sm"
          data-testid="save-flow-settings"
          onClick={handleClick}
          loading={isSaving}
          disabled={disableSave}
        >
          Save
        </Button>
      </div>

      {canManageUsers && (
        <div className="flex flex-col gap-4 mt-4 border-t pt-4">
          <h3 className="text-sm font-medium">User Permissions</h3>
          {isLoadingFlowUsers ? (
            <div>Loading users...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {flowUsersData?.users?.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{user.username}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`read-${user.user_id}`}
                        checked={pendingPermissions[user.user_id]?.can_read ?? user.can_read}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(user.user_id, "can_read", checked as boolean)
                        }
                      />
                      <label htmlFor={`read-${user.user_id}`}>Read</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`run-${user.user_id}`}
                        checked={pendingPermissions[user.user_id]?.can_run ?? user.can_run}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(user.user_id, "can_run", checked as boolean)
                        }
                      />
                      <label htmlFor={`run-${user.user_id}`}>Run</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${user.user_id}`}
                        checked={pendingPermissions[user.user_id]?.can_edit ?? user.can_edit}
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
              onClick={() => setPendingPermissions({})}
              disabled={!hasPendingPermissionChanges}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleUpdatePermissions}
              loading={isUpdatingPermissions}
              disabled={!hasPendingPermissionChanges}
            >
              Update Permissions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
