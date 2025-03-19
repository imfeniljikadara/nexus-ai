export type DrawingMode = 
  | 'none'
  | 'pen' 
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'sticky-note'
  | 'approved-stamp'
  | 'rejected-stamp'
  | 'draft-stamp'
  | 'final-stamp';

export interface Annotation {
  type: DrawingMode;
  path: string;
  color: string;
  width: number;
  page: number;
}

export interface DrawingState {
  tool: DrawingMode
  color: string
  width: number
  opacity: number
  objects: any[] // To store all drawn objects
} 