import { useQuery } from "@tanstack/react-query";
import { getFlowUsers } from "../../endpoints/flows";

export const useGetFlowUsers = (flowId: string) => {
  return useQuery({
    queryKey: ["flowUsers", flowId],
    queryFn: () => getFlowUsers(flowId),
    enabled: !!flowId,
  });
}; 