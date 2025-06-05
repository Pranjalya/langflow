import useFlowStore from "../stores/flowStore";
import useFlowsManagerStore from "../stores/flowsManagerStore";
import { customStringify } from "../utils/reactflowUtils";

export function useUnsavedChanges() {
  const currentFlow = useFlowStore((state) => state.currentFlow);
  const savedFlow = useFlowsManagerStore((state) => state.currentFlow);

  if (!currentFlow || !savedFlow) {
    return false;
  }

  // Check if user has edit permission
  const canEdit = currentFlow.permissions?.can_edit || currentFlow.user_id === currentFlow.current_user_id;
  
  // Only report unsaved changes if user has edit permission
  return canEdit && customStringify(currentFlow) !== customStringify(savedFlow);
}
