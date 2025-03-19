import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import PDFViewer with no SSR
const PDFViewer = dynamic(() => import('./PDFViewerComponent'), {
  ssr: false,
  loading: () => <div>Loading PDF viewer...</div>
})

export default PDFViewer