import React from 'react'

interface FormFieldProps {
  type: 'text' | 'checkbox' | 'radio' | 'signature'
  position: { x: number; y: number }
  value: string
  onChange: (value: string) => void
}

export function FormField({ type, position, value, onChange }: FormFieldProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 10,
    backgroundColor: 'white'
  }

  switch (type) {
    case 'text':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border rounded px-2 py-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={style}
          autoFocus
          placeholder="Enter text here..."
        />
      )
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="w-4 h-4"
          style={style}
        />
      )
    case 'signature':
      return (
        <div 
          className="border-2 border-dashed border-blue-500 p-2 cursor-pointer bg-white hover:bg-blue-50"
          style={{
            ...style,
            minWidth: '200px',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            const signature = prompt('Enter signature:')
            if (signature) {
              onChange(signature)
            }
          }}
        >
          {value ? (
            <div className="font-signature text-xl">{value}</div>
          ) : (
            <span className="text-gray-500">Click to add signature</span>
          )}
        </div>
      )
    default:
      return null
  }
} 