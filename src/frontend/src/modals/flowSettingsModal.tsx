import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlowType } from "@/types/flow";
import PermissionList from "@/components/PermissionList";
import { ResourceType } from "@/types/permission";

interface FlowSettingsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  details?: boolean;
  flowData?: FlowType;
}

const FlowSettingsModal: React.FC<FlowSettingsModalProps> = ({
  open,
  setOpen,
  details,
  flowData,
}) => {
  const [activeTab, setActiveTab] = useState("general");

  if (!open || !flowData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Flow Settings</h2>
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
              resourceId={flowData.id}
              resourceType={ResourceType.FLOW}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FlowSettingsModal; 