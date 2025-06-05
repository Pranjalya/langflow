import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFlowUserPermissions } from "../../endpoints/flows";

interface UpdateFlowUserPermissionsParams {
  flowId: string;
  userId: string;
  permissions: {
    can_read?: boolean;
    can_run?: boolean;
    can_edit?: boolean;
  };
}

export const useUpdateFlowUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flowId, userId, permissions }: UpdateFlowUserPermissionsParams) =>
      updateFlowUserPermissions(flowId, userId, permissions),
    onSuccess: (_, { flowId }) => {
      queryClient.invalidateQueries({ queryKey: ["flowUsers", flowId] });
    },
  });
}; 