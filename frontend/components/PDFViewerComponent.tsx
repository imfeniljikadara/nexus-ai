import { useState, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { FormField } from './FormField'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { AnnotationToolbar } from './AnnotationToolbar'
import { ShapeType, TextAnnotationType, StampType } from '../types/annotations'
import type { fabric } from 'fabric'
import { DrawingToolbar } from './DrawingToolbar'

// Define unified drawing types
type DrawingTool = 
  | 'none'
  // Freehand tools
  | 'pen' 
  | 'highlighter'
  | 'eraser'
  // Shape tools
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  // Text tools
  | 'text'
  | 'sticky-note'
  | 'comment'
  // Stamps
  | 'approved-stamp'
  | 'rejected-stamp'
  | 'draft-stamp'
  | 'final-stamp'

interface DrawingState {
  tool: DrawingTool
  color: string
  width: number
  opacity: number
}

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFViewerProps {
  file: File | string
}

interface FormFieldData {
  id: string
  type: 'text' | 'checkbox' | 'radio' | 'signature'
  page: number
  position: { x: number; y: number }
  value: string
}

type DrawingMode = 
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
  | 'final-stamp'

interface Annotation {
  type: DrawingMode
  path: string
  color: string
  width: number
  page: number
}

// Add these helper functions at the top of the file after imports
const createEditableText = async (canvas: fabric.Canvas, pointer: { x: number, y: number }, options: any = {}) => {
  const { fabric } = await import('fabric');
  const text = new fabric.IText(options.text || '', {
    left: pointer.x,
    top: pointer.y,
    fontSize: options.fontSize || 20,
    fill: '#000000',
    fontFamily: 'Arial',
    selectable: true,
    editable: true,
    backgroundColor: 'transparent',
    padding: 5,
    ...options
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  canvas.requestRenderAll();
  return text;
};

const createStickyNote = async (canvas: fabric.Canvas, pointer: { x: number, y: number }, isTextEditing: boolean, setIsTextEditing: (value: boolean) => void) => {
  const { fabric } = await import('fabric');

  // Create background
  const background = new fabric.Rect({
    left: 0,
    top: 0,
    width: 200,
    height: 120,
    fill: '#fff59d',
    stroke: '#e6d649',
    strokeWidth: 1,
    rx: 5,
    ry: 5,
    selectable: false
  });

  // Create text
  const text = new fabric.IText('', {
    left: 25,
    top: 10,
    fontSize: 16,
    fill: '#000000',
    fontFamily: 'Arial',
    selectable: true,
    editable: true,
    backgroundColor: 'transparent'
  });

  // Create icon
  const icon = new fabric.Text('📝', {
    left: 5,
    top: 5,
    fontSize: 16,
    fill: '#000000',
    selectable: false,
    evented: false
  });

  // Create group
  const group = new fabric.Group([background, icon, text], {
    left: pointer.x,
    top: pointer.y,
    subTargetCheck: true,
    hasControls: true,
    lockUniScaling: true
  });

  // Add custom properties
  (group as any).toObject = (function(toObject) {
    return function(this: fabric.Group) {
      return fabric.util.object.extend(toObject.call(this), {
        subTargetCheck: this.subTargetCheck
      });
    };
  })(group.toObject);

  // Handle editing
  group.on('mousedown', function(this: fabric.Group) {
    if (isTextEditing) return;
    
    const objects = this.getObjects();
    const textObj = objects.find((obj: fabric.Object) => obj instanceof fabric.IText) as fabric.IText;
    if (textObj && canvas) {
      canvas.setActiveObject(textObj);
      textObj.enterEditing();
      setIsTextEditing(true);
      canvas.requestRenderAll();
    }
  });

  canvas.add(group);
  text.enterEditing();
  canvas.requestRenderAll();
  return group;
};

// Add this helper function for fabric initialization
const getFabric = async () => {
  const { fabric } = await import('fabric')
  return fabric
}

// Add this helper function
const createFabricObject = async (type: string, options: any) => {
  const { fabric } = await import('fabric')
  switch (type) {
    case 'rect':
      return new fabric.Rect(options)
    case 'circle':
      return new fabric.Circle(options)
    case 'line':
      return new fabric.Line(options.points, options.config)
    case 'text':
      return new fabric.Text(options.text, options.config)
    case 'itext':
      return new fabric.IText(options.text, options.config)
    case 'group':
      return new fabric.Group(options.objects, options.config)
    default:
      return null
  }
}

// Add these interfaces near the top of the file after imports
interface TextState {
  isEditing: boolean;
  activeText: fabric.IText | null;
}

interface Props {
  file: File | string
}

const PDFViewerComponent: React.FC<Props> = ({ file }) => {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isEditingForm, setIsEditingForm] = useState(false)
  const [selectedFieldType, setSelectedFieldType] = useState<FormFieldData['type'] | null>(null)
  const [formFields, setFormFields] = useState<FormFieldData[]>([])
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [activeTool, setActiveTool] = useState<DrawingMode>('none')
  const [drawingColor, setDrawingColor] = useState('#000000')
  const [drawingWidth, setDrawingWidth] = useState(2)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isTextMode, setIsTextMode] = useState(false)
  const [isTextEditing, setIsTextEditing] = useState(false)
  const [selectedText, setSelectedText] = useState<fabric.IText | null>(null)
  const [isDrawingShape, setIsDrawingShape] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null)
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null)
  const [allObjects, setAllObjects] = useState<any[]>([])
  const [drawnObjects, setDrawnObjects] = useState<any[]>([])
  const [currentShape, setCurrentShape] = useState<fabric.Object | null>(null)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 })
  const [currentPaths, setCurrentPaths] = useState<any[]>([])
  
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<fabric.Canvas | null>(null)
  const isDrawing = useRef(false)

  // Add new state for annotations
  const [selectedTool, setSelectedTool] = useState<string>('')
  const [annotationColor, setAnnotationColor] = useState('#000000')
  const [annotationWidth, setAnnotationWidth] = useState(2)

  // Add these states near other state declarations
  const [isEditing, setIsEditing] = useState(false);
  const [textState, setTextState] = useState<TextState>({
    isEditing: false,
    activeText: null
  });

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  async function generatePDFWithFormFields() {
    if (!pdfContainerRef.current) return null

    try {
      const canvas = await html2canvas(pdfContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      return pdf
    } catch (error) {
      console.error('Error generating PDF:', error)
      return null
    }
  }

  async function generateSinglePagePDF() {
    if (!pdfContainerRef.current) return null

    try {
      const canvas = await html2canvas(pdfContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      return pdf
    } catch (error) {
      console.error('Error generating PDF:', error)
      return null
    }
  }

  async function handleDownload(downloadType: 'current' | 'all') {
    setShowDownloadOptions(false)

    if (formFields.length === 0) {
      if (typeof file === 'string') {
        window.open(file, '_blank')
      } else if (file instanceof File) {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      return
    }

    const filename = typeof file === 'string' 
      ? file.split('/').pop() || 'document.pdf'
      : file.name

    if (downloadType === 'current') {
      const pdf = await generateSinglePagePDF()
      if (pdf) {
        pdf.save(`page_${pageNumber}_${filename}`)
      }
    } else {
      const pdf = await generatePDFWithFormFields()
      if (pdf) {
        pdf.save(`edited_${filename}`)
      }
    }
  }

  async function handlePrint() {
    if (formFields.length === 0) {
      if (typeof file === 'string') {
        const printWindow = window.open(file)
        printWindow?.print()
      }
      return
    }

    const pdf = await generatePDFWithFormFields()
    if (pdf) {
      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url)
      printWindow?.print()
      URL.revokeObjectURL(url)
    }
  }

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullScreen(true)
    } else {
      document.exitFullscreen()
      setIsFullScreen(false)
    }
  }

  function handlePageClick(event: React.MouseEvent<Element, MouseEvent>) {
    if (!isEditingForm || !selectedFieldType) return

    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    const position = {
      x: event.clientX - rect.left - scrollLeft,
      y: event.clientY - rect.top - scrollTop
    }

    setFormFields([
      ...formFields,
      {
        id: Date.now().toString(),
        type: selectedFieldType,
        page: pageNumber,
        position,
        value: ''
      }
    ])
  }

  // Update initializeCanvas function
  const initializeCanvas = async () => {
    if (!pdfContainerRef.current) return;

    const fabricModule = await import('fabric');
    const fabric = fabricModule.fabric;
    if (!fabric) return;

    const pdfPage = pdfContainerRef.current.querySelector('.react-pdf__Page');
    if (!pdfPage) return;

    const { width, height } = pdfPage.getBoundingClientRect();
    setCanvasDimensions({ width, height });

    // If canvas already exists, just update dimensions
    if (canvasRef.current) {
      canvasRef.current.setDimensions({ width, height });
      return canvasRef.current;
    }

    // Create new canvas
    const canvas = new fabric.Canvas('drawing-canvas', {
      width,
      height,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true
    });

    // Add text editing event listeners
    canvas.on('text:editing:entered', (e) => {
      if (e.target instanceof fabric.IText) {
        handleTextEdit(e.target);
      }
    });

    canvas.on('text:editing:exited', (e) => {
      if (e.target instanceof fabric.IText) {
        handleTextEditEnd(e.target);
      }
    });

    // Set up drawing brush
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    updateBrushSettings(canvas);

    canvasRef.current = canvas;
    return canvas;
  };

  // Add this helper function
  const updatePathSettings = (path: any) => {
    if (activeTool === 'eraser') {
      path.stroke = '#000000';
      path.globalCompositeOperation = 'destination-out';
    } else if (activeTool === 'highlighter') {
      path.stroke = drawingColor + '80';
      path.globalCompositeOperation = 'multiply';
    } else {
      path.stroke = drawingColor;
      path.globalCompositeOperation = 'source-over';
    }
    path.strokeWidth = activeTool === 'highlighter' || activeTool === 'eraser' ? 20 : drawingWidth;
  };

  // Update the updateBrushSettings function
  const updateBrushSettings = (canvas: fabric.Canvas) => {
    if (!canvas.freeDrawingBrush) return;

    const brush = canvas.freeDrawingBrush;
    
    switch (activeTool) {
      case 'pen':
        brush.color = drawingColor;
        brush.width = drawingWidth;
        (brush as any).globalCompositeOperation = 'source-over';
        break;
      case 'highlighter':
        brush.color = drawingColor + '80';
        brush.width = 20;
        (brush as any).globalCompositeOperation = 'multiply';
        break;
      case 'eraser':
        brush.color = '#ffffff';
        brush.width = 20;
        (brush as any).globalCompositeOperation = 'destination-out';
        break;
    }
  };

  // Update the handleDrawingModeChange function
  const handleDrawingModeChange = (newMode: DrawingTool) => {
    // Convert DrawingTool to DrawingMode
    const mode: DrawingMode = newMode as DrawingMode;
    setActiveTool(mode);
    if (canvasRef.current) {
      canvasRef.current.isDrawingMode = mode !== 'none';
      updateBrushSettings(canvasRef.current);
      canvasRef.current.renderAll();
    }
  };

  // Update canvas setup effect
  useEffect(() => {
    if (isDrawingMode) {
      const setupCanvas = async () => {
        const canvas = await initializeCanvas();
        if (canvas) {
          const drawingTools = ['pen', 'highlighter', 'eraser'];
          const isDrawingTool = drawingTools.includes(activeTool);
          
          canvas.isDrawingMode = isDrawingTool;
          canvas.selection = !isDrawingTool;

          if (!isDrawingTool) {
            canvas.on('mouse:down', handleCanvasMouseDown);
            canvas.on('mouse:move', handleCanvasMouseMove);
            canvas.on('mouse:up', handleCanvasMouseUp);
          }
        }
      };
      setupCanvas();
    }
  }, [isDrawingMode, pageNumber, scale, activeTool]);

  // Update drawing properties effect
  useEffect(() => {
    if (canvasRef.current && isDrawingMode) {
      updateBrushSettings(canvasRef.current);
      canvasRef.current.renderAll();
    }
  }, [activeTool, drawingColor, drawingWidth, isDrawingMode]);

  function saveAnnotation() {
    if (!canvasRef.current) return

    const json = canvasRef.current.toJSON()
    setAnnotations([
      ...annotations,
      {
        type: activeTool,
        path: JSON.stringify(json),
        color: drawingColor,
        width: drawingWidth,
        page: pageNumber
      }
    ])

    // Clear canvas
    canvasRef.current.clear()
  }

  function loadPageAnnotations() {
    if (!canvasRef.current) return

    canvasRef.current.clear()
    const pageAnnotations = annotations.filter(a => a.page === pageNumber)
    
    pageAnnotations.forEach(annotation => {
      const objects = JSON.parse(annotation.path)
      canvasRef.current?.loadFromJSON(objects, () => {
        canvasRef.current?.renderAll()
      })
    })
  }

  useEffect(() => {
    loadPageAnnotations()
  }, [pageNumber])

  // Update handleColorChange function
  const handleColorChange = (color: string) => {
    setDrawingColor(color);
    if (canvasRef.current) {
      updateBrushSettings(canvasRef.current);
      canvasRef.current.renderAll();
    }
  };

  // Update handleWidthChange function
  const handleWidthChange = (newWidth: number) => {
    setDrawingWidth(newWidth);
    if (canvasRef.current) {
      updateBrushSettings(canvasRef.current);
      canvasRef.current.renderAll();
    }
  };

  // Add handlers for annotation tools
  const handleShapeSelect = (shape: ShapeType) => {
    setSelectedTool(shape);
    setActiveTool('none');
    if (canvasRef.current) {
      canvasRef.current.isDrawingMode = false;
      canvasRef.current.renderAll();
    }
  }

  const handleTextToolSelect = (tool: TextAnnotationType) => {
    setSelectedTool(tool);
    if (canvasRef.current) {
      canvasRef.current.isDrawingMode = false;
      canvasRef.current.renderAll();
    }
  }

  const handleStampSelect = (stamp: StampType) => {
    setSelectedTool(stamp);
    if (canvasRef.current) {
      canvasRef.current.isDrawingMode = false;
      canvasRef.current.renderAll();
    }
  }

  // Update the handleToolChange function
  const handleToolChange = async (tool: DrawingMode) => {
    if (!canvasRef.current) return;

    // Clear existing event listeners
    canvasRef.current.off('mouse:down');
    canvasRef.current.off('mouse:move');
    canvasRef.current.off('mouse:up');
    canvasRef.current.off('text:editing:entered');
    canvasRef.current.off('text:editing:exited');

    setActiveTool(tool);
    const { fabric } = await import('fabric');

    // First disable drawing mode for all tools
    canvasRef.current.isDrawingMode = false;
    canvasRef.current.selection = true;

    switch (tool) {
      case 'text': {
        setIsTextMode(true);
        canvasRef.current.defaultCursor = 'text';
        canvasRef.current.selection = true;

        // Remove any existing mouse:down handlers
        canvasRef.current.off('mouse:down');
        canvasRef.current.off('text:editing:exited');

        canvasRef.current.on('mouse:down', function(opt) {
          if (!canvasRef.current) return;
          
          // If clicking on an existing object or already editing, do nothing
          if (opt.target || isTextEditing) return;
          
          const pointer = canvasRef.current.getPointer(opt.e);
          const text = new fabric.IText('', {
            left: pointer.x,
            top: pointer.y,
            fontSize: 20,
            fill: '#000000',
            fontFamily: 'Arial',
            selectable: true,
            editable: true,
            hasControls: true,
            hasBorders: true
          });

          canvasRef.current.add(text);
          canvasRef.current.setActiveObject(text);
          text.enterEditing();
          setIsTextEditing(true);
          canvasRef.current.requestRenderAll();
        });

        canvasRef.current.on('text:editing:exited', function(opt) {
          if (!canvasRef.current) return;
          setIsTextEditing(false);
          
          const text = opt.target as fabric.IText;
          if (text?.text?.trim() === '') {
            canvasRef.current.remove(text);
          }
          canvasRef.current.requestRenderAll();
        });
        break;
      }
      
      case 'sticky-note': {
        setIsTextMode(true);
        canvasRef.current.defaultCursor = 'pointer';
        canvasRef.current.selection = true;

        // Remove any existing mouse:down handlers
        canvasRef.current.off('mouse:down');
        canvasRef.current.off('text:editing:exited');
        canvasRef.current.off('mouse:up');

        // Add handler for creating new sticky notes
        canvasRef.current.on('mouse:down', async function(opt) {
          if (!canvasRef.current) return;
          
          // If clicking on an existing object or already editing, do nothing
          if (opt.target || isTextEditing) return;
          
          const pointer = canvasRef.current.getPointer(opt.e);
          await createStickyNote(canvasRef.current, pointer, isTextEditing, setIsTextEditing);
        });

        canvasRef.current.on('text:editing:exited', function(opt) {
          if (!canvasRef.current) return;
          setIsTextEditing(false);
          
          const text = opt.target as fabric.IText;
          if (text?.text?.trim() === '') {
            // If the text is empty, remove the entire group
            const group = text.group;
            if (group) {
              canvasRef.current.remove(group);
            }
          }
          canvasRef.current.requestRenderAll();
        });
        break;
      }

      case 'eraser': {
        canvasRef.current.defaultCursor = 'crosshair';
        let isErasing = false;
        
        // Setup eraser mode
        canvasRef.current.on('mouse:down', (e) => {
          isErasing = true;
          if (e.target && e.target.type !== 'image') {
            canvasRef.current!.remove(e.target);
            canvasRef.current!.requestRenderAll();
          }
        });

        canvasRef.current.on('mouse:move', (e) => {
          if (!isErasing) return;
          
          const pointer = canvasRef.current!.getPointer(e.e);
          const objects = canvasRef.current!.getObjects();
          
          objects.forEach((obj) => {
            if (obj.type !== 'image' && obj.containsPoint(new fabric.Point(pointer.x, pointer.y))) {
              canvasRef.current!.remove(obj);
            }
          });
          
          canvasRef.current!.requestRenderAll();
        });

        canvasRef.current.on('mouse:up', () => {
          isErasing = false;
        });
        break;
      }

      case 'pen': {
        canvasRef.current.isDrawingMode = true;
        canvasRef.current.defaultCursor = 'crosshair';
        const pencilBrush = new fabric.PencilBrush(canvasRef.current);
        pencilBrush.color = drawingColor;
        pencilBrush.width = drawingWidth;
        canvasRef.current.freeDrawingBrush = pencilBrush;
        break;
      }

      case 'highlighter': {
        canvasRef.current.isDrawingMode = true;
        canvasRef.current.defaultCursor = 'crosshair';
        const highlighterBrush = new fabric.PencilBrush(canvasRef.current);
        highlighterBrush.color = drawingColor + '80';
        highlighterBrush.width = 20;
        canvasRef.current.freeDrawingBrush = highlighterBrush;
        (canvasRef.current.freeDrawingBrush as any).globalCompositeOperation = 'multiply';
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'arrow': {
        setIsTextMode(false);
        canvasRef.current.defaultCursor = 'crosshair';
        setupShapeEvents(tool);
        break;
      }

      default: {
        setIsTextMode(false);
        canvasRef.current.defaultCursor = 'default';
        break;
      }
    }

    canvasRef.current.renderAll();
  };

  // Update the setupShapeEvents function
  const setupShapeEvents = (tool: DrawingMode) => {
    if (!canvasRef.current) return;

    // Clear existing event listeners
    canvasRef.current.off('mouse:down');
    canvasRef.current.off('mouse:move');
    canvasRef.current.off('mouse:up');

    // Add new mouse down handler
    canvasRef.current.on('mouse:down', (e) => {
      if (!e.target) {
        const pointer = canvasRef.current!.getPointer(e.e);
        setIsDrawingShape(true);
        setStartPoint({ x: pointer.x, y: pointer.y });
        setEndPoint({ x: pointer.x, y: pointer.y });
      }
    });

    // Add mouse move handler
    canvasRef.current.on('mouse:move', (e) => {
      if (isDrawingShape) {
        const pointer = canvasRef.current!.getPointer(e.e);
        setEndPoint({ x: pointer.x, y: pointer.y });
        updateShape(tool);
      }
    });

    // Add mouse up handler
    canvasRef.current.on('mouse:up', () => {
      setIsDrawingShape(false);
      setStartPoint(null);
      setEndPoint(null);
    });
  };

  // Create a new function to update shape during drawing
  const updateShape = async (tool: DrawingMode) => {
    if (!canvasRef.current || !startPoint || !endPoint) return;

    const { fabric } = await import('fabric');

    // Remove previous temporary shape if it exists
    const objects = canvasRef.current.getObjects();
    if (objects.length > 0) {
      canvasRef.current.remove(objects[objects.length - 1]);
    }

    let newObject;

    switch (tool) {
      case 'rectangle': {
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        const left = Math.min(startPoint.x, endPoint.x);
        const top = Math.min(startPoint.y, endPoint.y);

        newObject = new fabric.Rect({
          left,
          top,
          width,
          height,
          fill: 'transparent',
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: true,
          strokeUniform: true
        });
        break;
      }

      case 'circle': {
        const radius = Math.sqrt(
          Math.pow(endPoint.x - startPoint.x, 2) + 
          Math.pow(endPoint.y - startPoint.y, 2)
        ) / 2;

        const centerX = (startPoint.x + endPoint.x) / 2;
        const centerY = (startPoint.y + endPoint.y) / 2;

        newObject = new fabric.Circle({
          left: centerX - radius,
          top: centerY - radius,
          radius,
          fill: 'transparent',
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: true,
          strokeUniform: true
        });
        break;
      }

      case 'arrow': {
        // Create main line
        const mainLine = new fabric.Line([
          startPoint.x,
          startPoint.y,
          endPoint.x,
          endPoint.y
        ], {
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: true
        });

        // Calculate angle for arrow head
        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
        const headLength = 20;
        const headAngle = Math.PI / 6;

        // Create arrow head lines
        const arrowHead1 = new fabric.Line([
          endPoint.x - headLength * Math.cos(angle - headAngle),
          endPoint.y - headLength * Math.sin(angle - headAngle),
          endPoint.x,
          endPoint.y
        ], {
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: false
        });

        const arrowHead2 = new fabric.Line([
          endPoint.x - headLength * Math.cos(angle + headAngle),
          endPoint.y - headLength * Math.sin(angle + headAngle),
          endPoint.x,
          endPoint.y
        ], {
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: false
        });

        // Group all lines together
        newObject = new fabric.Group([mainLine, arrowHead1, arrowHead2], {
          selectable: true,
          evented: true,
          objectCaching: false
        });
        break;
      }
    }

    if (newObject) {
      canvasRef.current.add(newObject);
      canvasRef.current.renderAll();
    }
  };

  // Update save function
  const handleSaveDrawing = () => {
    if (canvasRef.current) {
      const json = canvasRef.current.toJSON();
      const newAnnotation: Annotation = {
        type: activeTool as DrawingMode,
        path: JSON.stringify(json),
        color: drawingColor,
        width: drawingWidth,
        page: pageNumber
      };
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  };

  // Update exit function
  const handleExitDrawing = () => {
    setIsDrawingMode(false);
    setActiveTool('none');
    if (canvasRef.current) {
      // Clear the canvas
      canvasRef.current.clear();
      canvasRef.current.isDrawingMode = false;
      // Reset drawn objects
      setDrawnObjects([]);
      setAllObjects([]);
    }
  };

  // Update the handleCanvasMouseDown function
  const handleCanvasMouseDown = async (e: any) => {
    if (!canvasRef.current || !isDrawingMode || ['pen', 'highlighter', 'eraser'].includes(activeTool)) return;

    const pointer = canvasRef.current.getPointer(e.e);
    const { fabric } = await import('fabric');

    // Remove any existing active object
    canvasRef.current.discardActiveObject();

    let newObject = null;

    switch (activeTool) {
      case 'rectangle':
        newObject = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: 'transparent',
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: true
        });
        break;

      case 'circle':
        newObject = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 1,
          fill: 'transparent',
          stroke: drawingColor,
          strokeWidth: drawingWidth,
          selectable: true
        });
        break;

      case 'arrow':
        const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: drawingColor,
          strokeWidth: drawingWidth
        });
        const triangle = new fabric.Triangle({
          left: pointer.x,
          top: pointer.y,
          width: drawingWidth * 3,
          height: drawingWidth * 3,
          fill: drawingColor,
          selectable: false
        });
        newObject = new fabric.Group([line, triangle], {
          selectable: true
        });
        break;

      case 'text':
        newObject = new fabric.IText('Click to edit', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: drawingColor,
          selectable: true,
          editable: true
        });
        break;

      case 'approved-stamp':
      case 'rejected-stamp':
      case 'draft-stamp':
      case 'final-stamp': {
        const stampConfig = {
          'approved-stamp': { text: '✓ APPROVED', color: '#28a745' },
          'rejected-stamp': { text: '✗ REJECTED', color: '#dc3545' },
          'draft-stamp': { text: '📄 DRAFT', color: '#ffc107' },
          'final-stamp': { text: '✅ FINAL', color: '#17a2b8' }
        }[activeTool];

        newObject = new fabric.Text(stampConfig.text, {
          left: pointer.x,
          top: pointer.y,
          fontSize: 24,
          fill: stampConfig.color,
          fontWeight: 'bold',
          selectable: true,
          transparentCorners: true,
          cornerColor: stampConfig.color
        });
        break;
      }
    }

    if (newObject) {
      canvasRef.current.add(newObject);
      canvasRef.current.setActiveObject(newObject);
      setActiveObject(newObject);
      canvasRef.current.renderAll();
    }
  };

  // Update the handleCanvasMouseMove function
  const handleCanvasMouseMove = (e: any) => {
    if (!canvasRef.current || !isDrawingShape || !startPoint || !activeObject) return;

    const pointer = canvasRef.current.getPointer(e.e);

    switch (activeTool) {
      case 'rectangle': {
        const rect = activeObject as fabric.Rect;
        const width = Math.abs(pointer.x - startPoint.x);
        const height = Math.abs(pointer.y - startPoint.y);
        const left = Math.min(pointer.x, startPoint.x);
        const top = Math.min(pointer.y, startPoint.y);
        rect.set({ left, top, width, height });
        break;
      }
      case 'circle': {
        const circle = activeObject as fabric.Circle;
        const radius = Math.sqrt(
          Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2)
        ) / 2;
        circle.set({
          radius,
          left: startPoint.x - radius,
          top: startPoint.y - radius
        });
        break;
      }
      case 'arrow': {
        const group = activeObject as fabric.Group;
        const line = group.getObjects()[0] as fabric.Line;
        const triangle = group.getObjects()[1] as fabric.Triangle;

        line.set({
          x2: pointer.x,
          y2: pointer.y
        });

        const angle = Math.atan2(pointer.y - startPoint.y, pointer.x - startPoint.x);
        triangle.set({
          left: pointer.x,
          top: pointer.y,
          angle: (angle * 180) / Math.PI
        });

        group.setCoords();
        break;
      }
    }

    canvasRef.current.renderAll();
  };

  // Add this function to handle mouse up events
  const handleCanvasMouseUp = () => {
    setIsDrawingShape(false)
    setStartPoint(null)
    setEndPoint(null)
    setActiveObject(null)
  }

  // Add this function after other handler functions
  const handleTextEdit = (e: fabric.IText) => {
    setIsEditing(true);
    setSelectedText(e);
  };

  const handleTextEditEnd = (e: fabric.IText) => {
    setIsEditing(false);
    setSelectedText(null);
    if (canvasRef.current) {
      canvasRef.current.renderAll();
    }
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        canvasRef.current.off('mouse:down');
        canvasRef.current.off('mouse:move');
        canvasRef.current.off('mouse:up');
        setIsTextMode(false);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="h-full overflow-auto relative font-['SF_Pro_Text',-apple-system,BlinkMacSystemFont,Roboto,'Segoe_UI',Helvetica,Arial,sans-serif,'Apple_Color_Emoji','Segoe_UI_Emoji','Segoe_UI_Symbol'] bg-gray-50">
      {/* Top Controls */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex justify-between items-center backdrop-blur-lg bg-white/90">
        <div className="flex items-center space-x-3">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 text-gray-700"
              onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all duration-200 text-gray-700"
              onClick={() => setScale(s => Math.min(s + 0.1, 2))}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          {/* Rotation Control */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-700"
            onClick={() => setRotation(r => (r + 90) % 360)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>

          {/* Drawing Mode Button */}
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isDrawingMode 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-50' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={() => setIsDrawingMode(!isDrawingMode)}
          >
            {isDrawingMode ? 'Exit Drawing Mode' : 'Drawing Mode'}
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Form Editing Controls */}
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isEditingForm 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-50' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            onClick={() => setIsEditingForm(!isEditingForm)}
          >
            {isEditingForm ? 'Done Editing' : 'Edit Form'}
          </button>

          {isEditingForm && (
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedFieldType === 'text'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedFieldType('text')}
              >
                Add Text Field
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedFieldType === 'signature'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedFieldType('signature')}
              >
                Add Signature
              </button>
              {selectedFieldType && (
                <button
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all duration-200"
                  onClick={() => setSelectedFieldType(null)}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Download Button with Options */}
          <div className="relative">
            <button
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all duration-200"
              onClick={() => setShowDownloadOptions(!showDownloadOptions)}
            >
              Download
            </button>
            
            {showDownloadOptions && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    onClick={() => handleDownload('current')}
                  >
                    Download Current Page
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                    onClick={() => handleDownload('all')}
                  >
                    Download Entire PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all duration-200"
            onClick={handlePrint}
          >
            Print
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-700"
            onClick={toggleFullScreen}
          >
            {isFullScreen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
                <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
                <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6"></path>
                <path d="M9 21H3v-6"></path>
                <path d="M21 3l-7 7"></path>
                <path d="M3 21l7-7"></path>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Drawing Toolbar */}
      {isDrawingMode && (
        <div className="fixed left-6 top-24 z-50">
          <DrawingToolbar
            activeTool={activeTool}
            color={drawingColor}
            width={drawingWidth}
            onToolChange={handleToolChange}
            onColorChange={setDrawingColor}
            onWidthChange={setDrawingWidth}
            onSave={handleSaveDrawing}
            onExit={handleExitDrawing}
          />
        </div>
      )}

      {/* PDF Document with Canvas Overlay */}
      <div className="flex justify-center p-6">
        <div className="relative">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center"
            loading={
              <div className="flex items-center justify-center p-8 text-gray-500">
                <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading PDF...
              </div>
            }
          >
            <div ref={pdfContainerRef} className="relative">
              <Page 
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                className="shadow-xl rounded-lg mb-4 bg-white"
                onClick={handlePageClick}
              />
              
              {/* Canvas Overlay */}
              <div 
                className="absolute top-0 left-0"
                style={{
                  width: canvasDimensions.width,
                  height: canvasDimensions.height,
                  pointerEvents: isDrawingMode ? 'auto' : 'none',
                  zIndex: 10
                }}
              >
                <canvas
                  id="drawing-canvas"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    touchAction: 'none'
                  }}
                />
              </div>

              {/* Form Fields */}
              <div className="absolute inset-0 pointer-events-none">
                {formFields
                  .filter(field => field.page === pageNumber)
                  .map(field => (
                    <div key={field.id} className="pointer-events-auto">
                      <FormField
                        type={field.type}
                        position={field.position}
                        value={field.value}
                        onChange={(value) => {
                          setFormFields(fields =>
                            fields.map(f =>
                              f.id === field.id ? { ...f, value } : f
                            )
                          )
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </Document>
        </div>
      </div>

      {/* Bottom Navigation */}
      {numPages > 0 && (
        <div className="fixed bottom-6 right-6">
          <div className="flex items-center space-x-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            <button
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span className="px-3 font-medium text-gray-700">
              Page {pageNumber} of {numPages}
            </span>
            <button
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PDFViewerComponent