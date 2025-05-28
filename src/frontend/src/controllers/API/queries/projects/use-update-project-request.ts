import { useMutationFunctionType } from "@/types/api";
import { UseMutationResult } from "@tanstack/react-query";
import { api } from "../../api";
import { getURL } from "../../helpers/constants";
import { UseRequestProcessor } from "../../services/request-processor";

interface IUpdateProjectRequest {
  id: string;
  status: string;
}

export const useUpdateProjectRequest: useMutationFunctionType<
  undefined,
  IUpdateProjectRequest
> = (options?) => {
  const { mutate, queryClient } = UseRequestProcessor();

  const updateProjectRequestFn = async ({ id, status }: IUpdateProjectRequest) => {
    const response = await api.patch(`${getURL("PROJECT_REQUESTS")}/${id}`, { status });
    return response.data;
  };

  const mutation: UseMutationResult<any, any, IUpdateProjectRequest> = mutate(
    ["useUpdateProjectRequest"],
    updateProjectRequestFn,
    {
      onSettled: () => {
        queryClient.refetchQueries({ queryKey: ["useGetProjectRequests"] });
      },
      ...options,
    }
  );

  return mutation;
}; 