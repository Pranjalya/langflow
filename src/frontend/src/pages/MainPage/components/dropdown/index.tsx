import ForwardedIconComponent from "@/components/common/genericIconComponent";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import useAlertStore from "@/stores/alertStore";
import { FlowType } from "@/types/flow";
import useDuplicateFlow from "../../hooks/use-handle-duplicate";
import useSelectOptionsChange from "../../hooks/use-select-options-change";
import useAuthStore from "@/stores/authStore";
import { useGetProjectUsers } from "@/controllers/API/queries/projects/use-get-project-users";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import FlowUsersModal from "@/modals/flowUsersModal";

type DropdownComponentProps = {
  flowData: FlowType;
  setOpenDelete: (open: boolean) => void;
  handleExport: () => void;
  handleEdit: () => void;
};

const DropdownComponent = ({
  flowData,
  setOpenDelete,
  handleExport,
  handleEdit,
}: DropdownComponentProps) => {
  const setSuccessData = useAlertStore((state) => state.setSuccessData);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const { handleDuplicate } = useDuplicateFlow({ flow: flowData });
  const { folderId } = useParams();
  const userData = useAuthStore((state) => state.userData);
  const currentUserId = userData?.id;
  const userLevel = userData?.user_level;
  const [openUsersModal, setOpenUsersModal] = useState(false);

  // Get project users to check permissions if we're in a project folder
  const { data: projectUsersData } = useGetProjectUsers(folderId || "");

  // Check if user can delete (must be SUPER_ADMIN or PROJECT_ADMIN)
  const canDelete = userLevel === "SUPER_ADMIN" || 
    (folderId && projectUsersData?.users?.some(user => 
      user.user_id === currentUserId && user.is_project_admin
    ));

  // Check if user can manage users (same as delete permission)
  const canManageUsers = canDelete;

  useEffect(() => {
    console.log("Dropdown Component State:", {
      openUsersModal,
      canManageUsers,
      userLevel,
      currentUserId,
      projectUsersData,
      flowData
    });
  }, [openUsersModal, canManageUsers, userLevel, currentUserId, projectUsersData, flowData]);

  const duplicateFlow = () => {
    handleDuplicate().then(() =>
      setSuccessData({
        title: `${flowData.is_component ? "Component" : "Flow"} duplicated successfully`,
      }),
    );
  };

  const { handleSelectOptionsChange } = useSelectOptionsChange(
    [flowData.id],
    setErrorData,
    setOpenDelete,
    handleExport,
    duplicateFlow,
    handleEdit,
  );

  const handleEditUsers = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Edit Users clicked, setting modal to open");
    setOpenUsersModal(true);
  };

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleSelectOptionsChange("edit");
        }}
        className="cursor-pointer"
        data-testid="btn-edit-flow"
      >
        <ForwardedIconComponent
          name="SquarePen"
          aria-hidden="true"
          className="mr-2 h-4 w-4"
        />
        Edit details
      </DropdownMenuItem>
      {canManageUsers && (
        <DropdownMenuItem
          onClick={handleEditUsers}
          className="cursor-pointer"
          data-testid="btn-edit-users"
        >
          <ForwardedIconComponent
            name="Users"
            aria-hidden="true"
            className="mr-2 h-4 w-4"
          />
          Edit users
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleSelectOptionsChange("export");
        }}
        className="cursor-pointer"
        data-testid="btn-download-json"
      >
        <ForwardedIconComponent
          name="Download"
          aria-hidden="true"
          className="mr-2 h-4 w-4"
        />
        Export
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleSelectOptionsChange("duplicate");
        }}
        className="cursor-pointer"
        data-testid="btn-duplicate-flow"
      >
        <ForwardedIconComponent
          name="CopyPlus"
          aria-hidden="true"
          className="mr-2 h-4 w-4"
        />
        Duplicate
      </DropdownMenuItem>
      {canDelete && (
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setOpenDelete(true);
          }}
          className="cursor-pointer text-destructive"
          data-testid="btn_delete_dropdown_menu"
        >
          <ForwardedIconComponent
            name="Trash2"
            aria-hidden="true"
            className="mr-2 h-4 w-4"
          />
          Delete
        </DropdownMenuItem>
      )}
      <FlowUsersModal
        open={openUsersModal}
        setOpen={setOpenUsersModal}
        flowData={flowData}
      />
    </>
  );
};

export default DropdownComponent;
