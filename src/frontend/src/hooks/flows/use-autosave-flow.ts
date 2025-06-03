import useFlowsManagerStore from "@/stores/flowsManagerStore";
import { FlowType } from "@/types/flow";
import { useDebounce } from "../use-debounce";
import useSaveFlow from "./use-save-flow";
import useFlowStore from "@/stores/flowStore";

const useAutoSaveFlow = () => {
  const saveFlow = useSaveFlow();
  const autoSaving = useFlowsManagerStore((state) => state.autoSaving);
  const autoSavingInterval = useFlowsManagerStore(
    (state) => state.autoSavingInterval,
  );

  const autoSaveFlow = useDebounce((flow?: FlowType) => {
    if (autoSaving) {
      // Check if flow is locked
      const currentFlow = useFlowStore.getState().currentFlow;
      if (currentFlow?.locked) {
        return;
      }
      saveFlow(flow);
    }
  }, autoSavingInterval);

  return autoSaveFlow;
};

export default useAutoSaveFlow;
