import { ChangeEvent } from 'react'

interface SidebarProps {
    onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
    summary: string
    codeBlocks: string[]
  }
  
  export default function Sidebar({ onFileUpload, summary, codeBlocks }: SidebarProps) {
    return (
      <div className="w-64 bg-gray-100 p-4 overflow-auto">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Upload PDF
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={onFileUpload}
            className="mt-1 block w-full"
          />
        </div>
  
        {summary && (
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Summary</h3>
            <p className="text-sm text-gray-600">{summary}</p>
          </div>
        )}
  
        {codeBlocks.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Extracted Code</h3>
            {codeBlocks.map((code, index) => (
              <pre key={index} className="text-sm bg-gray-800 text-white p-2 rounded mt-2">
                {code}
              </pre>
            ))}
          </div>
        )}
      </div>
    )
  }