import IconComponent from "@/components/common/genericIconComponent";
import ShadTooltip from "@/components/common/shadTooltipComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select-custom";
import { DEFAULT_FOLDER_DEPRECATED } from "@/constants/constants";
import { FolderType } from "@/pages/MainPage/entities";
import { cn } from "@/utils/utils";
import { handleSelectChange } from "../helpers/handle-select-change";
import { FolderSelectItem } from "./folder-select-item";
import useAuthStore from "@/stores/authStore";
import { useState } from "react";
import { EditProjectDialog } from "./edit-project-dialog";
import { useGetProjectUsers } from "@/controllers/API/queries/projects/use-get-project-users";

export const SelectOptions = ({
  item,
  index,
  handleDeleteFolder,
  handleDownloadFolder,
  handleSelectFolderToRename,
  checkPathName,
}: {
  item: FolderType;
  index: number;
  handleDeleteFolder: ((folder: FolderType) => void) | undefined;
  handleDownloadFolder: (folderId: string) => void;
  handleSelectFolderToRename: (folder: FolderType) => void;
  checkPathName: (folderId: string) => boolean;
}) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const userData = useAuthStore((state) => state.userData);
  const currentUserId = userData?.id;
  const userLevel = userData?.user_level;

  // Get project users to check permissions
  const { data: projectUsersData } = useGetProjectUsers(item.id!);

  // Check if user is a project admin or super admin
  const canEditDetails = userLevel === "SUPER_ADMIN" || 
    (projectUsersData?.users?.some(user => 
      user.user_id === currentUserId && user.is_project_admin
    ));

  // Check if user can delete (same conditions as edit details)
  const canDelete = canEditDetails;

  return (
    <div>
      <Select
        onValueChange={(value) => {
          if (value === "edit-details") {
            setShowEditDialog(true);
          } else {
            handleSelectChange(
              value,
              item,
              handleDeleteFolder,
              handleDownloadFolder,
              handleSelectFolderToRename,
            );
          }
        }}
        value=""
      >
        <ShadTooltip content="Options" side="right" styleClasses="z-50">
          <SelectTrigger
            className="w-fit"
            id={`options-trigger-${item.name}`}
            data-testid="more-options-button"
          >
            <IconComponent
              name={"MoreHorizontal"}
              className={cn(
                `w-4 stroke-[1.5] px-0 text-muted-foreground group-hover/menu-button:block group-hover/menu-button:text-foreground`,
                checkPathName(item.id!) ? "block" : "hidden",
              )}
            />
          </SelectTrigger>
        </ShadTooltip>
        <SelectContent align="end" alignOffset={-16} position="popper">
          {item.name !== DEFAULT_FOLDER_DEPRECATED && (
            <SelectItem
              id="rename-button"
              value="rename"
              data-testid="btn-rename-project"
              className="text-xs"
            >
              <FolderSelectItem name="Rename" iconName="SquarePen" />
            </SelectItem>
          )}
          <SelectItem
            value="download"
            data-testid="btn-download-project"
            className="text-xs"
          >
            <FolderSelectItem name="Download" iconName="Download" />
          </SelectItem>
          {canEditDetails && (
            <SelectItem
              value="edit-details"
              data-testid="btn-edit-project-details"
              className="text-xs"
            >
              <FolderSelectItem name="Edit Details" iconName="Users" />
            </SelectItem>
          )}
          {index > 0 && canDelete && (
            <SelectItem
              value="delete"
              data-testid="btn-delete-project"
              className="text-xs"
            >
              <FolderSelectItem name="Delete" iconName="Trash2" />
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {canEditDetails && (
        <EditProjectDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          projectId={item.id!}
          projectName={item.name}
          onSuccess={() => {
            // Refresh the project list or update the current project data
            // window.location.reload();
          }}
        />
      )}
    </div>
  );
};
