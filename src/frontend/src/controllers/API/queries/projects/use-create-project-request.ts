import { useMutationFunctionType } from "@/types/api";
import { UseMutationResult } from "@tanstack/react-query";
import { api } from "../../api";
import { getURL } from "../../helpers/constants";
import { UseRequestProcessor } from "../../services/request-processor";

interface ICreateProjectRequest {
  project_name: string;
  justification: string;
  requested_users: string[];
}

export const useCreateProjectRequest: useMutationFunctionType<
  undefined,
  ICreateProjectRequest
> = (options?) => {
  const { mutate, queryClient } = UseRequestProcessor();

  const createProjectRequestFn = async (data: ICreateProjectRequest) => {
    const response = await api.post(`${getURL("PROJECT_REQUESTS")}/`, data);
    return response.data;
  };

  const mutation: UseMutationResult<any, any, ICreateProjectRequest> = mutate(
    ["useCreateProjectRequest"],
    createProjectRequestFn,
    {
      onSettled: () => {
        queryClient.refetchQueries({ queryKey: ["useGetProjectRequests"] });
      },
      ...options,
    }
  );

  return mutation;
}; 