import React from 'react'
import { DrawingMode } from '../types/drawing'

interface DrawingToolbarProps {
  activeTool: DrawingMode
  color: string
  width: number
  onToolChange: (tool: DrawingMode) => void
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onSave: () => void
  onExit: () => void
}

export function DrawingToolbar({
  activeTool,
  color,
  width,
  onToolChange,
  onColorChange,
  onWidthChange,
  onSave,
  onExit
}: DrawingToolbarProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2.5 w-48">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h3 className="text-xs font-medium text-gray-800">Drawing Tools</h3>
          <button
            onClick={onExit}
            className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18"></path>
              <path d="M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Drawing Tools - Two Column Grid Layout */}
        <div className="grid grid-cols-2 gap-1">
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'pen' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('pen')}
          >
            <span className="flex items-center text-xs">✏️ Pen</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'highlighter' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('highlighter')}
          >
            <span className="flex items-center text-xs">🌟 High</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'rectangle' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('rectangle')}
          >
            <span className="flex items-center text-xs">□ Rect</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'circle' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('circle')}
          >
            <span className="flex items-center text-xs">○ Circle</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'arrow' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('arrow')}
          >
            <span className="flex items-center text-xs">→ Arrow</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'text' 
                ? 'bg-blue-100 text-blue-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('text')}
          >
            <span className="flex items-center text-xs">T Text</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'sticky-note' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('sticky-note')}
          >
            <span className="flex items-center text-xs">📝 Note</span>
          </button>
          <button
            className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
              activeTool === 'eraser' 
                ? 'bg-red-100 text-red-700' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onToolChange('eraser')}
          >
            <span className="flex items-center text-xs">❌ Erase</span>
          </button>
        </div>

        {/* Stamps Section */}
        <div className="border-t border-gray-200 pt-2">
          <h4 className="text-xs font-medium text-gray-700 mb-1">Stamps</h4>
          <div className="grid grid-cols-2 gap-1">
            <button
              className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
                activeTool === 'approved-stamp' 
                  ? 'bg-green-100 text-green-700' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onToolChange('approved-stamp')}
            >
              <span className="flex items-center text-xs">✓ Approve</span>
            </button>
            <button
              className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
                activeTool === 'rejected-stamp' 
                  ? 'bg-red-100 text-red-700' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onToolChange('rejected-stamp')}
            >
              <span className="flex items-center text-xs">✗ Reject</span>
            </button>
            <button
              className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
                activeTool === 'draft-stamp' 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onToolChange('draft-stamp')}
            >
              <span className="flex items-center text-xs">📄 Draft</span>
            </button>
            <button
              className={`p-1.5 rounded-lg text-left transition-all duration-200 ${
                activeTool === 'final-stamp' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => onToolChange('final-stamp')}
            >
              <span className="flex items-center text-xs">✅ Final</span>
            </button>
          </div>
        </div>

        {/* Style Controls */}
        <div className="border-t border-gray-200 pt-2 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full h-6 rounded-lg cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-xs font-medium text-gray-700">Width</label>
              <span className="text-xs text-gray-500">{width}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={width}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
          onClick={onSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
} 