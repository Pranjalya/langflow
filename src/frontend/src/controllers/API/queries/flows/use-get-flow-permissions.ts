import { useQuery } from "@tanstack/react-query";
import { getFlowPermissions } from "../flows";

export const useGetFlowPermissions = (flowId: string) => {
  return useQuery({
    queryKey: ["flowPermissions", flowId],
    queryFn: () => getFlowPermissions(flowId),
    enabled: !!flowId,
  });
}; 