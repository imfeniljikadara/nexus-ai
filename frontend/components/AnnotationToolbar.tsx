import React from 'react'
import { ShapeType, TextAnnotationType, StampType } from '../types/annotations'

interface AnnotationToolbarProps {
  onSelectShape: (shape: ShapeType) => void
  onSelectTextTool: (tool: TextAnnotationType) => void
  onSelectStamp: (stamp: StampType) => void
  selectedTool: string
  color: string
  onColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (width: number) => void
}

export function AnnotationToolbar({
  onSelectShape,
  onSelectTextTool,
  onSelectStamp,
  selectedTool,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange
}: AnnotationToolbarProps) {
  return (
    <div className="fixed top-20 left-4 bg-white p-2 rounded-lg shadow-lg z-50">
      <div className="flex flex-col space-y-2">
        {/* Shape Tools */}
        <div className="border-b pb-2">
          <h3 className="text-sm font-medium mb-2">Shapes</h3>
          <div className="grid grid-cols-2 gap-1">
            <button
              className={`p-2 rounded ${selectedTool === 'rectangle' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectShape('rectangle')}
              title="Rectangle"
            >
              □
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'circle' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectShape('circle')}
              title="Circle"
            >
              ○
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'arrow' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectShape('arrow')}
              title="Arrow"
            >
              →
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'line' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectShape('line')}
              title="Line"
            >
              —
            </button>
          </div>
        </div>

        {/* Text Tools */}
        <div className="border-b pb-2">
          <h3 className="text-sm font-medium mb-2">Text</h3>
          <div className="grid grid-cols-2 gap-1">
            <button
              className={`p-2 rounded ${selectedTool === 'comment' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectTextTool('comment')}
              title="Comment"
            >
              💬
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'sticky-note' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectTextTool('sticky-note')}
              title="Sticky Note"
            >
              📝
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'typewriter' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectTextTool('typewriter')}
              title="Typewriter"
            >
              T
            </button>
          </div>
        </div>

        {/* Stamps */}
        <div className="border-b pb-2">
          <h3 className="text-sm font-medium mb-2">Stamps</h3>
          <div className="grid grid-cols-2 gap-1">
            <button
              className={`p-2 rounded ${selectedTool === 'approved' ? 'bg-green-100' : ''}`}
              onClick={() => onSelectStamp('approved')}
            >
              ✓
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'rejected' ? 'bg-red-100' : ''}`}
              onClick={() => onSelectStamp('rejected')}
            >
              ✗
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'draft' ? 'bg-yellow-100' : ''}`}
              onClick={() => onSelectStamp('draft')}
            >
              📄
            </button>
            <button
              className={`p-2 rounded ${selectedTool === 'final' ? 'bg-blue-100' : ''}`}
              onClick={() => onSelectStamp('final')}
            >
              ✅
            </button>
          </div>
        </div>

        {/* Style Controls */}
        <div>
          <h3 className="text-sm font-medium mb-2">Style</h3>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-full mb-2"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
} 