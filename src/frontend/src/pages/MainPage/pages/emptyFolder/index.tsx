import ForwardedIconComponent from "@/components/common/genericIconComponent";
import { Button } from "@/components/ui/button";
import { useFolderStore } from "@/stores/foldersStore";
import { useParams } from "react-router-dom";
import { useGetProjectPermissions } from "@/controllers/API/queries/projects/use-get-project-permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";

type EmptyFolderProps = {
  setOpenModal: (open: boolean) => void;
};

export const EmptyFolder = ({ setOpenModal }: EmptyFolderProps) => {
  const folders = useFolderStore((state) => state.folders);
  const { folderId } = useParams();
  const { data: projectPermissions } = useGetProjectPermissions(folderId || "");
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleNewFlowClick = () => {
    if (folderId) {
      // Check if user has edit permission
      if (!projectPermissions?.can_edit) {
        setShowPermissionModal(true);
        return;
      }
    }
    setOpenModal(true);
  };

  return (
    <div className="m-0 flex w-full justify-center">
      <div className="absolute top-1/2 flex w-full -translate-y-1/2 flex-col items-center justify-center gap-2">
        <h3
          className="pt-5 font-chivo text-2xl font-semibold"
          data-testid="mainpage_title"
        >
          {folders?.length > 1 ? "Empty project" : "Start building"}
        </h3>
        <p className="pb-5 text-sm text-secondary-foreground">
          Begin with a template, or start from scratch.
        </p>
        <Button
          variant="default"
          onClick={handleNewFlowClick}
          id="new-project-btn"
        >
          <ForwardedIconComponent
            name="plus"
            aria-hidden="true"
            className="h-4 w-4"
          />
          <span className="whitespace-nowrap font-semibold">New Flow</span>
        </Button>
      </div>

      {/* Permission Modal */}
      <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permission Required</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>You do not have the necessary permissions to create a new flow in this project.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPermissionModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmptyFolder;
