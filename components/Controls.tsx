import React, { useState } from 'react';
import { AnimationSettings, Layer } from '../types';
import { ANIMATION_TYPES, PRESET_COLORS } from '../constants';
import { Trash2, Plus, Layers, Settings2, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

interface ControlsProps {
  settings: AnimationSettings;
  updateSettings: (partial: Partial<AnimationSettings>) => void;
  onExport: (resolutionMultiplier: number) => void;
  onClearSelection: () => void;
  isRecording: boolean;
  progress: number;
  hasSelection: boolean;
  canExport: boolean;
  layers: Layer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayer: (id: string, direction: 'up' | 'down') => void;
  onUpdateLayerName: (id: string, name: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  settings,
  updateSettings,
  onExport,
  onClearSelection,
  isRecording,
  progress,
  hasSelection,
  canExport,
  layers,
  activeLayerId,
  onSelectLayer,
  onDeleteLayer,
  onReorderLayer,
  onUpdateLayerName
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');
  const [resolutionMultiplier, setResolutionMultiplier] = useState<number>(1);

  return (
    <div className="w-full lg:w-[340px] bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col h-[45vh] lg:h-full shrink-0 order-3 lg:order-none z-10 shadow-xl lg:shadow-none">
      <div className="p-4 lg:p-5 border-b border-zinc-800 shrink-0 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
              <h2 className="text-base lg:text-lg font-semibold text-white">
                  {hasSelection ? 'Layer Properties' : 'Global Settings'}
              </h2>
              <p className="text-zinc-500 text-[10px] lg:text-xs mt-0.5">
                  {hasSelection ? 'Editing selected layer' : 'Defaults for new layers'}
              </p>
          </div>
          
          {hasSelection && (
              <button 
                  onClick={onClearSelection}
                  className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-zinc-500 transition-colors"
                  title="Delete active layer"
              >
                  <Trash2 size={16} />
              </button>
          )}
        </div>

        <div className="flex bg-zinc-900 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'properties' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings2 size={14} />
            Properties
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'layers' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers size={14} />
            Layers ({layers.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-5 space-y-6 lg:space-y-8">
        {activeTab === 'properties' ? (
          <>
            {/* Animation Style Grid */}
        <section>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">
            Animation Style
          </label>
          <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
            {ANIMATION_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = settings.type === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => updateSettings({ type: type.id })}
                  className={`flex flex-col items-center justify-center p-2 lg:p-3 rounded-xl border transition-all h-16 lg:h-20 gap-1 lg:gap-2 ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_-3px_rgba(79,70,229,0.3)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <Icon size={18} className="lg:w-5 lg:h-5" />
                  <span className="text-[9px] lg:text-[10px] font-medium truncate w-full text-center">{type.label}</span>
                </button>
              );
            })}
          </div>
          {(settings.type === 'reading' || settings.type === 'underline') && (
              <div className="mt-3 text-[10px] text-green-400 flex items-center gap-1.5 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  Smart text detection active
              </div>
          )}
        </section>

        {/* Parameters Section */}
        <section className="space-y-4 lg:space-y-5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
            Parameters
          </label>
          
          {/* Color Picker */}
          <div>
            <div className="flex justify-between items-center mb-2">
               <span className="text-sm text-zinc-300">Color</span>
               <span className="text-xs text-zinc-500 font-mono uppercase">{settings.color}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateSettings({ color })}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    settings.color === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-950' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="relative w-6 h-6 rounded-full overflow-hidden ml-1 border border-zinc-700 hover:border-zinc-500 transition-colors">
                 <input 
                    type="color" 
                    value={settings.color}
                    onChange={(e) => updateSettings({ color: e.target.value })}
                    className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-none opacity-0"
                 />
                 <div className="w-full h-full" style={{backgroundColor: settings.color}}></div>
              </div>
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5">
            <SliderControl 
                label="Animation Speed" 
                value={settings.speed} 
                onChange={(v) => updateSettings({ speed: v })} 
                min={0.1} max={3} step={0.1} format={(v) => `${v}x`}
            />
            <SliderControl 
                label="Intensity" 
                value={settings.intensity} 
                onChange={(v) => updateSettings({ intensity: v })} 
                min={0} max={1} step={0.1} format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderControl 
                label="Duration" 
                value={settings.duration} 
                onChange={(v) => updateSettings({ duration: v })} 
                min={1} max={5} step={0.5} format={(v) => `${v}s`}
            />
            <SliderControl 
                label="Delay" 
                value={settings.delay} 
                onChange={(v) => updateSettings({ delay: v })} 
                min={0} max={2} step={0.1} format={(v) => `${v}s`}
            />
          </div>
        </section>

        {/* Background Section */}
        <section className="space-y-4 lg:space-y-5 border-t border-zinc-800 pt-5">
           <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
            Background <span className="text-[10px] text-zinc-600 font-normal lowercase">(applies globally)</span>
          </label>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5">
            <SliderControl 
                label="Dim Opacity" 
                value={settings.backgroundDim} 
                onChange={(v) => updateSettings({ backgroundDim: v })} 
                min={0} max={0.9} step={0.1} format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderControl 
                label="Vignette" 
                value={settings.vignette} 
                onChange={(v) => updateSettings({ vignette: v })} 
                min={0} max={1} step={0.1} format={(v) => `${Math.round(v * 100)}%`}
            />
           </div>
        </section>
          </>
        ) : (
          <div className="space-y-3">
            {layers.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">
                No layers yet. Click and drag on the canvas to create one.
              </div>
            ) : (
              layers.map((layer, index) => {
                const typeInfo = ANIMATION_TYPES.find(t => t.id === layer.settings.type);
                const Icon = typeInfo?.icon || Layers;
                const isActive = layer.id === activeLayerId;

                return (
                  <div 
                    key={layer.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-600/10 border-indigo-500/50' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                    onClick={() => onSelectLayer(layer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${layer.settings.color}20`, color: layer.settings.color }}
                      >
                        <Icon size={16} />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={layer.name || `Layer ${index + 1}`}
                          onChange={(e) => onUpdateLayerName(layer.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-sm font-medium bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 ${isActive ? 'text-indigo-400' : 'text-zinc-300'}`}
                        />
                        <p className="text-[10px] text-zinc-500 px-1">
                          {typeInfo?.label} • {layer.settings.duration}s
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-1 mr-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderLayer(layer.id, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderLayer(layer.id, 'down');
                          }}
                          disabled={index === layers.length - 1}
                          className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 lg:p-5 border-t border-zinc-800 bg-zinc-950 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Resolution</label>
          <select 
            value={resolutionMultiplier}
            onChange={(e) => setResolutionMultiplier(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
          >
            <option value={1}>1x (Original)</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x (High Quality)</option>
            <option value={3}>3x (Ultra)</option>
          </select>
        </div>
        <button
          onClick={() => onExport(resolutionMultiplier)}
          disabled={!canExport || isRecording}
          className={`w-full py-3 lg:py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
            !canExport
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : isRecording
              ? 'bg-zinc-800 text-zinc-300 cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 hover:shadow-indigo-900/60'
          }`}
        >
          {isRecording ? (
            <>
               <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
               <span>Exporting {progress}%</span>
            </>
          ) : (
             'Export Video'
          )}
        </button>
      </div>
    </div>
  );
};

const SliderControl = ({ label, value, onChange, min, max, step, format }: any) => (
  <div className="group w-full">
    <div className="flex justify-between items-center mb-2">
       <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">{label}</span>
       <span className="text-xs text-zinc-500">{format ? format(value) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
    />
  </div>
);