import { useGetFlow } from "@/controllers/API/queries/flows/use-get-flow";
import { usePatchUpdateFlow } from "@/controllers/API/queries/flows/use-patch-update-flow";
import { useGetFlowPermissions } from "@/controllers/API/queries/flows/use-get-flow-permissions";
import { getFlowPermissions } from "@/controllers/API/flows";
import useAlertStore from "@/stores/alertStore";
import useFlowsManagerStore from "@/stores/flowsManagerStore";
import useFlowStore from "@/stores/flowStore";
import useAuthStore from "@/stores/authStore";
import { AllNodeType, EdgeType, FlowType } from "@/types/flow";
import { customStringify } from "@/utils/reactflowUtils";
import { ReactFlowJsonObject } from "@xyflow/react";

const useSaveFlow = () => {
  const setFlows = useFlowsManagerStore((state) => state.setFlows);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const setSaveLoading = useFlowsManagerStore((state) => state.setSaveLoading);
  const setCurrentFlow = useFlowStore((state) => state.setCurrentFlow);
  const userData = useAuthStore((state) => state.userData);
  const currentUserId = userData?.id;

  const { mutate: getFlow } = useGetFlow();
  const { mutate } = usePatchUpdateFlow();

  const saveFlow = async (flow?: FlowType): Promise<void> => {
    const currentFlow = useFlowStore.getState().currentFlow;
    const currentSavedFlow = useFlowsManagerStore.getState().currentFlow;
    const flowToSave = flow || currentFlow;

    if (!flowToSave) {
      setErrorData({
        title: "Failed to save flow",
        list: ["Flow not found"],
      });
      return Promise.reject(new Error("Flow not found"));
    }

    // Fetch flow permissions
    try {
      const permissions = await getFlowPermissions(flowToSave.id);
      console.log('Flow Permissions:', permissions);

      // Check if flow is locked by someone else
      const isLockedByCurrentUser = flowToSave.locked && flowToSave.locked_by === currentUserId;
      const isLockedByOther = flowToSave.locked && !isLockedByCurrentUser;

      console.log('Lock Status:', {
        isLocked: flowToSave.locked,
        lockedBy: flowToSave.locked_by,
        currentUserId,
        isLockedByCurrentUser,
        isLockedByOther,
        permissions
      });

      // Only block saving if locked by someone else
      if (isLockedByOther) {
        setErrorData({
          title: "Cannot save flow",
          list: ["This flow is locked and cannot be modified"],
        });
        return Promise.reject(new Error("Flow is locked"));
      }

      // Check if user has edit permission
      if (!permissions.can_edit) {
        setErrorData({
          title: "Cannot save flow",
          list: ["You don't have permission to edit this flow"],
        });
        return Promise.reject(new Error("No edit permission"));
      }

      if (
        customStringify(flowToSave) !== customStringify(currentSavedFlow)
      ) {
        setSaveLoading(true);

        const flowData = flowToSave?.data;
        const nodes = useFlowStore.getState().nodes;
        const edges = useFlowStore.getState().edges;
        const reactFlowInstance = useFlowStore.getState().reactFlowInstance;

        return new Promise<void>((resolve, reject) => {
          const flowWithData = {
            ...flowToSave,
            data: {
              ...flowData,
              nodes,
              edges,
              viewport: reactFlowInstance?.getViewport() ?? {
                zoom: 1,
                x: 0,
                y: 0,
              },
            },
          };

          if (!flowWithData?.data) {
            getFlow(
              { id: flowWithData.id },
              {
                onSuccess: (flowResponse) => {
                  flowWithData.data = flowResponse.data as ReactFlowJsonObject<
                    AllNodeType,
                    EdgeType
                  >;
                },
              },
            );
          }

          const {
            id,
            name,
            data,
            description,
            folder_id,
            endpoint_name,
            locked,
          } = flowWithData;

          if (!currentSavedFlow?.data?.nodes.length || data!.nodes.length > 0) {
            mutate(
              {
                id,
                name,
                data: data!,
                description,
                folder_id,
                endpoint_name,
                locked,
              },
              {
                onSuccess: (updatedFlow) => {
                  const flows = useFlowsManagerStore.getState().flows;
                  setSaveLoading(false);
                  if (flows) {
                    // updates flow in state
                    setFlows(
                      flows.map((flow) => {
                        if (flow.id === updatedFlow.id) {
                          return updatedFlow;
                        }
                        return flow;
                      }),
                    );
                    setCurrentFlow(updatedFlow);
                    resolve();
                  } else {
                    setErrorData({
                      title: "Failed to save flow",
                      list: ["Flows variable undefined"],
                    });
                    reject(new Error("Flows variable undefined"));
                  }
                },
                onError: (e) => {
                  setErrorData({
                    title: "Failed to save flow",
                    list: [e.message],
                  });
                  setSaveLoading(false);
                  reject(e);
                },
              },
            );
          } else {
            setSaveLoading(false);
          }
        });
      }
    } catch (error) {
      setErrorData({
        title: "Failed to fetch permissions",
        list: [error instanceof Error ? error.message : "Failed to fetch flow permissions"],
      });
      return Promise.reject(error);
    }
  };

  return saveFlow;
};

export default useSaveFlow;
