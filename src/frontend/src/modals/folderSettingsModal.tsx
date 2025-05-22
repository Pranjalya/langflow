import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderType } from "@/pages/MainPage/entities";
import PermissionList from "@/components/PermissionList";
import { ResourceType } from "@/types/permission";

interface FolderSettingsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  folderData?: FolderType;
}

const FolderSettingsModal: React.FC<FolderSettingsModalProps> = ({
  open,
  setOpen,
  folderData,
}) => {
  const [activeTab, setActiveTab] = useState("general");

  if (!open || !folderData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Folder Settings</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            {/* Existing general settings content */}
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionList
              resourceId={folderData.id!}
              resourceType={ResourceType.FOLDER}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FolderSettingsModal; 