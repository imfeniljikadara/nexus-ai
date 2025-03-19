declare module 'react-pdf' {
  import { ComponentType, ReactElement } from 'react'

  export interface DocumentProps {
    file: string | File | { url: string } | ArrayBuffer | Blob
    onLoadSuccess?: (result: { numPages: number }) => void
    onLoadError?: (error: Error) => void
    loading?: ReactElement
    className?: string
    options?: {
      cMapUrl?: string
      cMapPacked?: boolean
    }
    children?: ReactElement | ReactElement[]
  }

  export interface PageProps {
    pageNumber: number
    width?: number
    height?: number
    scale?: number
    rotate?: number
    renderTextLayer?: boolean
    renderAnnotationLayer?: boolean
    className?: string
    loading?: ReactElement
    onClick?: (event: React.MouseEvent) => void
    onMouseMove?: (event: React.MouseEvent) => void
  }

  export interface PDFDocumentProxy {
    numPages: number
    getPage: (pageNumber: number) => Promise<PDFPageProxy>
    getMetadata: () => Promise<any>
  }

  export interface PDFPageProxy {
    getTextContent: () => Promise<any>
    getViewport: (options: { scale: number }) => any
  }

  export const Document: ComponentType<DocumentProps>
  export const Page: ComponentType<PageProps>
  export const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string
    }
    version: string
  }
} 