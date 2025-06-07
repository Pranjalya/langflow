import { useQuery } from "@tanstack/react-query";
import { getFlowPermissions } from "@/controllers/API/flows";

export const useGetFlowPermissions = (flowId: string) => {
  return useQuery({
    queryKey: ["flowPermissions", flowId],
    queryFn: () => getFlowPermissions(flowId),
    enabled: !!flowId,
  });
}; 