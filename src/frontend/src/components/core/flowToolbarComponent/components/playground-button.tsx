import ForwardedIconComponent from "@/components/common/genericIconComponent";
import ShadTooltip from "@/components/common/shadTooltipComponent";
import { PLAYGROUND_BUTTON_NAME } from "@/constants/constants";
import { CustomIOModal } from "@/customization/components/custom-new-modal";
import { ENABLE_PUBLISH } from "@/customization/feature-flags";
import { getFlowPermissions } from "@/controllers/API/flows";
import useAlertStore from "@/stores/alertStore";
import useFlowsManagerStore from "@/stores/flowsManagerStore";
import { useState } from "react";

interface PlaygroundButtonProps {
  hasIO: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  canvasOpen: boolean;
}

const PlayIcon = () => (
  <ForwardedIconComponent
    name="Play"
    className="h-4 w-4 transition-all"
    strokeWidth={ENABLE_PUBLISH ? 2 : 1.5}
  />
);

const ButtonLabel = () => (
  <span className="hidden md:block">{PLAYGROUND_BUTTON_NAME}</span>
);

const ActiveButton = () => (
  <div
    data-testid="playground-btn-flow-io"
    className="playground-btn-flow-toolbar hover:bg-accent"
  >
    <PlayIcon />
    <ButtonLabel />
  </div>
);

const DisabledButton = () => (
  <div
    className="playground-btn-flow-toolbar cursor-not-allowed text-muted-foreground duration-150"
    data-testid="playground-btn-flow"
  >
    <PlayIcon />
    <ButtonLabel />
  </div>
);

const PlaygroundButton = ({
  hasIO,
  open,
  setOpen,
  canvasOpen,
}: PlaygroundButtonProps) => {
  const { setErrorData } = useAlertStore();
  const { currentFlow } = useFlowsManagerStore();
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  const handlePlaygroundClick = async () => {
    if (!currentFlow?.id || isCheckingPermissions) return;

    setIsCheckingPermissions(true);
    try {
      const permissions = await getFlowPermissions(currentFlow.id);
      if (!permissions.can_run) {
        setErrorData({
          title: "Access Denied",
          list: ["You don't have run access to this flow."],
        });
        return;
      }
      setOpen(true);
    } catch (error) {
      setErrorData({
        title: "Error",
        list: ["Failed to check flow permissions."],
      });
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleModalOpen = (newOpen: boolean) => {
    if (newOpen) {
      handlePlaygroundClick();
    } else {
      setOpen(false);
    }
  };

  return hasIO ? (
    <CustomIOModal
      open={open}
      setOpen={handleModalOpen}
      disable={!hasIO}
      canvasOpen={canvasOpen}
    >
      <ActiveButton />
    </CustomIOModal>
  ) : (
    <ShadTooltip content="Add a Chat Input or Chat Output to use the playground">
      <div>
        <DisabledButton />
      </div>
    </ShadTooltip>
  );
};

export default PlaygroundButton;
