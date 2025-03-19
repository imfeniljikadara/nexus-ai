export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line'
export type TextAnnotationType = 'comment' | 'sticky-note' | 'typewriter'
export type StampType = 'approved' | 'rejected' | 'draft' | 'final'

export interface Shape {
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  color: string
  strokeWidth: number
}

export interface TextAnnotation {
  type: TextAnnotationType
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export interface Stamp {
  type: StampType
  x: number
  y: number
  rotation: number
} 