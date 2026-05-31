import React from 'react';
import { Upload, MousePointer2, Monitor, Undo2, Redo2, Trash2 } from 'lucide-react';

interface SidebarProps {
  onMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onMediaUpload, onClearAll, undo, redo, canUndo, canRedo }) => {
  return (
    <div className="w-full h-16 lg:w-20 lg:h-full bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-row lg:flex-col items-center justify-between lg:justify-start px-4 lg:px-0 lg:py-6 z-20 shrink-0 order-1 lg:order-none">
      
      <div className="flex items-center gap-4 lg:flex-col lg:gap-0 lg:w-full">
        {/* Brand Icon */}
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center lg:mb-8 shadow-lg shadow-indigo-900/20 shrink-0">
          <Monitor className="text-white" size={20} />
        </div>

        {/* Upload Action */}
        <label className="group flex flex-col items-center gap-1 cursor-pointer lg:mb-6">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border border-zinc-800 hover:border-zinc-700 flex items-center justify-center transition-all group-hover:scale-105">
            <Upload size={18} className="text-zinc-400 group-hover:text-indigo-400" />
            <input type="file" accept="image/*,video/*" onChange={onMediaUpload} className="hidden" />
          </div>
          <span className="hidden lg:block text-[10px] text-zinc-500 font-medium group-hover:text-zinc-300">Upload</span>
        </label>
      </div>

      {/* Tools Divider */}
      <div className="hidden lg:block w-8 h-[1px] bg-zinc-800 mb-6"></div>
      <div className="lg:hidden h-8 w-[1px] bg-zinc-800 mx-2"></div>

      {/* Tools List */}
      <div className="flex flex-row lg:flex-col gap-2 lg:gap-4 lg:w-full lg:px-2 overflow-x-auto custom-scrollbar no-scrollbar items-center">
        <ToolIcon icon={MousePointer2} isActive={true} label="Select" />
        
        <div className="hidden lg:block w-8 h-[1px] bg-zinc-800 mx-auto my-2"></div>
        
        <button 
          onClick={undo}
          disabled={!canUndo}
          className={`w-10 h-10 lg:w-full lg:aspect-square rounded-xl flex items-center justify-center transition-all relative group ${
            !canUndo ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Undo2 size={20} />
          <span className="hidden lg:block absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-zinc-700">
            Undo (Ctrl+Z)
          </span>
        </button>
        
        <button 
          onClick={redo}
          disabled={!canRedo}
          className={`w-10 h-10 lg:w-full lg:aspect-square rounded-xl flex items-center justify-center transition-all relative group ${
            !canRedo ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Redo2 size={20} />
          <span className="hidden lg:block absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-zinc-700">
            Redo (Ctrl+Shift+Z)
          </span>
        </button>

        <div className="hidden lg:block w-8 h-[1px] bg-zinc-800 mx-auto my-2"></div>

        <button 
          onClick={onClearAll}
          className="w-10 h-10 lg:w-full lg:aspect-square rounded-xl flex items-center justify-center transition-all relative group text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <Trash2 size={20} />
          <span className="hidden lg:block absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-zinc-700">
            Clear All Layers
          </span>
        </button>
      </div>

    </div>
  );
};

const ToolIcon = ({ icon: Icon, isActive = false, disabled = false, label }: any) => (
  <button 
    className={`w-10 h-10 lg:w-full lg:aspect-square rounded-xl flex items-center justify-center transition-all relative group ${
      isActive 
        ? 'bg-white text-zinc-950 shadow-lg' 
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
    } ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
  >
    <Icon size={20} />
    {/* Tooltip - Desktop only position */}
    <span className="hidden lg:block absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-zinc-700">
      {label}
    </span>
  </button>
);