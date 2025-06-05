import { useGetConfig } from "@/controllers/API/queries/config/use-get-config";
import { useGetFlow } from "@/controllers/API/queries/flows/use-get-flow";
import { CustomIOModal } from "@/customization/components/custom-new-modal";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import { track } from "@/customization/utils/analytics";
import useFlowStore from "@/stores/flowStore";
import { useUtilityStore } from "@/stores/utilityStore";
import { CookieOptions, getCookie, setCookie } from "@/utils/utils";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import useFlowsManagerStore from "../../stores/flowsManagerStore";
import { getInputsAndOutputs } from "../../utils/storeUtils";

export default function PlaygroundPage() {
  useGetConfig();
  const setCurrentFlow = useFlowsManagerStore((state) => state.setCurrentFlow);
  const currentSavedFlow = useFlowsManagerStore((state) => state.currentFlow);
  const setClientId = useUtilityStore((state) => state.setClientId);
  const [hasRunPermission, setHasRunPermission] = useState(false);

  const { id } = useParams();
  const { mutateAsync: getFlow } = useGetFlow();

  const navigate = useCustomNavigate();

  const currentFlowId = useFlowsManagerStore((state) => state.currentFlowId);
  const setIsLoading = useFlowsManagerStore((state) => state.setIsLoading);
  const setPlaygroundPage = useFlowStore((state) => state.setPlaygroundPage);

  async function getFlowData() {
    try {
      const flow = await getFlow({ id: id!, public: true });
      return flow;
    } catch (error: any) {
      console.log(error);
      if (error.response?.status === 403) {
        // Handle 403 error - user doesn't have permission
        navigate("/");
        return null;
      }
      navigate("/");
      return null;
    }
  }

  useEffect(() => {
    const initializeFlow = async () => {
      setIsLoading(true);
      if (currentFlowId === "") {
        const flow = await getFlowData();
        if (flow) {
          setCurrentFlow(flow);
          // Check if user has run permission
          const hasPermission = flow.permissions?.can_run || flow.user_id === flow.current_user_id;
          setHasRunPermission(hasPermission);
          
          if (!hasPermission) {
            // If no run permission, redirect to home
            navigate("/");
          }
        } else {
          navigate("/");
        }
      }
    };

    initializeFlow();
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) track("Playground Page Loaded", { flowId: id });
    setPlaygroundPage(true);
  }, []);

  useEffect(() => {
    document.title = currentSavedFlow?.name || "Langflow";
    if (currentSavedFlow?.data) {
      const { inputs, outputs } = getInputsAndOutputs(
        currentSavedFlow?.data?.nodes || [],
      );
      if (
        (inputs.length === 0 && outputs.length === 0) ||
        currentSavedFlow?.access_type !== "PUBLIC" ||
        !hasRunPermission
      ) {
        // redirect to the home page
        navigate("/");
      }
    }
  }, [currentSavedFlow, hasRunPermission]);

  useEffect(() => {
    // Get client ID from cookie or create new one
    const clientId = getCookie("client_id");
    if (!clientId) {
      const newClientId = uuid();
      const cookieOptions: CookieOptions = {
        secure: window.location.protocol === "https:",
        sameSite: "Strict",
      };
      setCookie("client_id", newClientId, cookieOptions);
      setClientId(newClientId);
    } else {
      setClientId(clientId);
    }
  }, []);

  if (!hasRunPermission) {
    return null; // Don't render anything if no permission
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center align-middle">
      {currentSavedFlow && (
        <CustomIOModal
          open={true}
          setOpen={() => {}}
          isPlayground
          playgroundPage
        >
          <></>
        </CustomIOModal>
      )}
    </div>
  );
}
