import React, { useState } from "react";
import { FolderType } from "../../entities";
import FolderSettingsModal from "@/modals/folderSettingsModal";

interface FolderListProps {
  folder: FolderType;
  onSelect: (folder: FolderType) => void;
}

const FolderList: React.FC<FolderListProps> = ({ folder, onSelect }) => {
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <>
      <div
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
        onClick={() => onSelect(folder)}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 text-lg">📁</span>
          </div>
          <div>
            <h3 className="font-medium">{folder.name}</h3>
            <p className="text-sm text-gray-500">{folder.description}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenSettings(true);
          }}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          ⚙️
        </button>
      </div>

      <FolderSettingsModal
        open={openSettings}
        setOpen={setOpenSettings}
        folderData={folder}
      />
    </>
  );
};

export default FolderList; 