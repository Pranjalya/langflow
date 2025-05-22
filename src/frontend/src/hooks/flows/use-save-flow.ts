import { useGetFlow } from "@/controllers/API/queries/flows/use-get-flow";
import { usePatchUpdateFlow } from "@/controllers/API/queries/flows/use-patch-update-flow";
import { usePostAddFlow } from "@/controllers/API/queries/flows/use-post-add-flow";
import useAlertStore from "@/stores/alertStore";
import useFlowsManagerStore from "@/stores/flowsManagerStore";
import useFlowStore from "@/stores/flowStore";
import { AllNodeType, EdgeType, FlowType } from "@/types/flow";
import { customStringify } from "@/utils/reactflowUtils";
import { ReactFlowJsonObject } from "@xyflow/react";

const useSaveFlow = () => {
  const setFlows = useFlowsManagerStore((state) => state.setFlows);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const setSaveLoading = useFlowsManagerStore((state) => state.setSaveLoading);
  const setCurrentFlow = useFlowStore((state) => state.setCurrentFlow);

  const { mutate: getFlow } = useGetFlow();
  const { mutate: updateFlow } = usePatchUpdateFlow();
  const { mutate: createFlow } = usePostAddFlow();

  const saveFlow = async (flow?: FlowType): Promise<void> => {
    const currentFlow = useFlowStore.getState().currentFlow;
    const currentSavedFlow = useFlowsManagerStore.getState().currentFlow;
    if (
      customStringify(flow || currentFlow) !== customStringify(currentSavedFlow)
    ) {
      setSaveLoading(true);

      const flowData = currentFlow?.data;
      const nodes = useFlowStore.getState().nodes;
      const edges = useFlowStore.getState().edges;
      const reactFlowInstance = useFlowStore.getState().reactFlowInstance;

      return new Promise<void>((resolve, reject) => {
        if (currentFlow) {
          flow = flow || {
            ...currentFlow,
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
        }

        if (flow) {
          if (!flow?.data) {
            getFlow(
              { id: flow!.id },
              {
                onSuccess: (flowResponse) => {
                  flow!.data = flowResponse.data as ReactFlowJsonObject<
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
          } = flow;

          // If this is a new flow (no id or empty id), create it first
          if (!id || id === "") {
            createFlow(
              {
                name,
                data: data!,
                description,
                folder_id,
                endpoint_name,
                is_component: false,
                tags: [],
              },
              {
                onSuccess: (createdFlow) => {
                  const flows = useFlowsManagerStore.getState().flows;
                  setSaveLoading(false);
                  if (flows) {
                    setFlows([...flows, createdFlow]);
                    setCurrentFlow(createdFlow);
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
                    title: "Failed to create flow",
                    list: [e.message],
                  });
                  setSaveLoading(false);
                  reject(e);
                },
              },
            );
          } else {
            // Update existing flow
            if (!currentSavedFlow?.data?.nodes.length || data!.nodes.length > 0) {
              updateFlow(
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
          }
        } else {
          setErrorData({
            title: "Failed to save flow",
            list: ["Flow not found"],
          });
          reject(new Error("Flow not found"));
        }
      });
    }
  };

  return saveFlow;
};

export default useSaveFlow;
