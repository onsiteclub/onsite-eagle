'use client'

import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Rect, Text, Transformer, Group } from 'react-konva'
import Konva from 'konva'
import { Plus, Trash2, Save, MousePointer, Square, Loader2, RotateCcw } from 'lucide-react'

interface DrawnLot {
  id: string
  x: number
  y: number
  width: number
  height: number
  lotNumber: string
}

interface LotDrawerProps {
  siteId: string
  onSave: (lots: DrawnLot[], svg: string) => Promise<void>
}

type Tool = 'select' | 'draw'

export default function LotDrawer({ siteId, onSave }: LotDrawerProps) {
  const [lots, setLots] = useState<DrawnLot[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [newLot, setNewLot] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resize stage to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        const height = Math.max(500, window.innerHeight - 400)
        setStageSize({ width, height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current && stageRef.current) {
      const node = stageRef.current.findOne(`#${selectedId}`)
      if (node) {
        transformerRef.current.nodes([node])
        transformerRef.current.getLayer()?.batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [selectedId])

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool !== 'draw') return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Deselect if clicking on empty space
    if (e.target === stage) {
      setSelectedId(null)
    }

    setIsDrawing(true)
    setNewLot({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    })
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !newLot) return

    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    setNewLot({
      ...newLot,
      width: pos.x - newLot.x,
      height: pos.y - newLot.y,
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !newLot) return

    // Only create lot if it has some size
    if (Math.abs(newLot.width) > 20 && Math.abs(newLot.height) > 20) {
      const lotNumber = (lots.length + 1).toString()
      const id = `lot-${Date.now()}`

      // Normalize negative width/height
      const normalizedLot: DrawnLot = {
        id,
        x: newLot.width < 0 ? newLot.x + newLot.width : newLot.x,
        y: newLot.height < 0 ? newLot.y + newLot.height : newLot.y,
        width: Math.abs(newLot.width),
        height: Math.abs(newLot.height),
        lotNumber,
      }

      setLots([...lots, normalizedLot])
    }

    setIsDrawing(false)
    setNewLot(null)
  }

  const handleLotClick = (id: string) => {
    if (tool === 'select') {
      setSelectedId(id)
    }
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null)
    }
  }

  const handleTransformEnd = (id: string, node: Konva.Node) => {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale and apply to width/height
    node.scaleX(1)
    node.scaleY(1)

    setLots(lots.map(lot =>
      lot.id === id
        ? {
            ...lot,
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          }
        : lot
    ))
  }

  const handleDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    setLots(lots.map(lot =>
      lot.id === id
        ? { ...lot, x: e.target.x(), y: e.target.y() }
        : lot
    ))
  }

  const deleteLot = (id: string) => {
    setLots(lots.filter(lot => lot.id !== id))
    setSelectedId(null)
  }

  const updateLotNumber = (id: string, newNumber: string) => {
    setLots(lots.map(lot =>
      lot.id === id ? { ...lot, lotNumber: newNumber } : lot
    ))
  }

  const clearAll = () => {
    setLots([])
    setSelectedId(null)
  }

  const generateSvg = (): string => {
    const colors: Record<string, string> = {
      default: '#8E8E93',
    }

    const lotElements = lots.map(lot => {
      const centerX = lot.x + lot.width / 2
      const centerY = lot.y + lot.height / 2

      return `
    <g class="lot" data-lot="${lot.lotNumber}">
      <rect
        class="lot-rect"
        x="${lot.x}"
        y="${lot.y}"
        width="${lot.width}"
        height="${lot.height}"
        fill="${colors.default}"
        stroke="#6E6E73"
        stroke-width="1"
        rx="4"
      />
      <text
        x="${centerX}"
        y="${centerY}"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-size="14"
        font-weight="600"
      >${lot.lotNumber}</text>
    </g>`
    }).join('')

    return `<svg viewBox="0 0 ${stageSize.width} ${stageSize.height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .lot-rect { cursor: pointer; transition: opacity 0.2s; }
    .lot-rect:hover { opacity: 0.8; }
  </style>
  <rect width="100%" height="100%" fill="#F5F5F7"/>
  ${lotElements}
</svg>`
  }

  const handleSave = async () => {
    if (lots.length === 0) return

    setSaving(true)
    try {
      const svg = generateSvg()
      await onSave(lots, svg)
    } finally {
      setSaving(false)
    }
  }

  const selectedLot = lots.find(l => l.id === selectedId)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Tool Selection */}
          <div className="flex bg-white border border-[#D2D2D7] rounded-lg overflow-hidden">
            <button
              onClick={() => setTool('select')}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                tool === 'select' ? 'bg-[#007AFF] text-white' : 'text-[#6E6E73] hover:bg-[#F5F5F7]'
              }`}
              title="Select Tool"
            >
              <MousePointer className="w-4 h-4" />
              <span className="text-sm">Select</span>
            </button>
            <button
              onClick={() => { setTool('draw'); setSelectedId(null) }}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                tool === 'draw' ? 'bg-[#007AFF] text-white' : 'text-[#6E6E73] hover:bg-[#F5F5F7]'
              }`}
              title="Draw Rectangle"
            >
              <Square className="w-4 h-4" />
              <span className="text-sm">Draw</span>
            </button>
          </div>

          {/* Delete Selected */}
          {selectedId && (
            <button
              onClick={() => deleteLot(selectedId)}
              className="flex items-center gap-2 px-3 py-2 text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg hover:bg-[#FF3B30]/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Delete</span>
            </button>
          )}

          {/* Clear All */}
          {lots.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-2 text-[#86868B] bg-white border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">Clear</span>
            </button>
          )}
        </div>

        {/* Lot Count & Save */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#86868B]">
            {lots.length} lot{lots.length !== 1 ? 's' : ''} drawn
          </span>
          <button
            onClick={handleSave}
            disabled={lots.length === 0 || saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#34C759] text-white rounded-lg hover:bg-[#2DB14D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Lots</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected Lot Editor */}
      {selectedLot && (
        <div className="flex items-center gap-3 p-3 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-lg">
          <span className="text-sm text-[#6E6E73]">Lot Number:</span>
          <input
            type="text"
            value={selectedLot.lotNumber}
            onChange={(e) => updateLotNumber(selectedId!, e.target.value)}
            className="w-20 px-2 py-1 border border-[#D2D2D7] rounded text-center text-sm font-medium focus:outline-none focus:border-[#007AFF]"
          />
          <span className="text-xs text-[#AEAEB2]">
            Size: {Math.round(selectedLot.width)} x {Math.round(selectedLot.height)}
          </span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="bg-white border border-[#D2D2D7] rounded-xl overflow-hidden"
        style={{ cursor: tool === 'draw' ? 'crosshair' : 'default' }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
        >
          <Layer>
            {/* Grid background */}
            {Array.from({ length: Math.ceil(stageSize.width / 50) }).map((_, i) => (
              <Rect
                key={`vline-${i}`}
                x={i * 50}
                y={0}
                width={1}
                height={stageSize.height}
                fill="#E5E5EA"
              />
            ))}
            {Array.from({ length: Math.ceil(stageSize.height / 50) }).map((_, i) => (
              <Rect
                key={`hline-${i}`}
                x={0}
                y={i * 50}
                width={stageSize.width}
                height={1}
                fill="#E5E5EA"
              />
            ))}

            {/* Existing lots */}
            {lots.map((lot) => (
              <Group key={lot.id}>
                <Rect
                  id={lot.id}
                  x={lot.x}
                  y={lot.y}
                  width={lot.width}
                  height={lot.height}
                  fill={selectedId === lot.id ? '#007AFF' : '#8E8E93'}
                  stroke={selectedId === lot.id ? '#0056B3' : '#6E6E73'}
                  strokeWidth={selectedId === lot.id ? 2 : 1}
                  cornerRadius={4}
                  draggable={tool === 'select'}
                  onClick={() => handleLotClick(lot.id)}
                  onTap={() => handleLotClick(lot.id)}
                  onDragEnd={(e) => handleDragEnd(lot.id, e)}
                  onTransformEnd={(e) => handleTransformEnd(lot.id, e.target)}
                />
                <Text
                  x={lot.x}
                  y={lot.y}
                  width={lot.width}
                  height={lot.height}
                  text={lot.lotNumber}
                  fontSize={16}
                  fontStyle="bold"
                  fill="white"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            ))}

            {/* Currently drawing lot */}
            {newLot && (
              <Rect
                x={newLot.width < 0 ? newLot.x + newLot.width : newLot.x}
                y={newLot.height < 0 ? newLot.y + newLot.height : newLot.y}
                width={Math.abs(newLot.width)}
                height={Math.abs(newLot.height)}
                fill="#007AFF"
                opacity={0.5}
                stroke="#007AFF"
                strokeWidth={2}
                cornerRadius={4}
              />
            )}

            {/* Transformer for selected lot */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit minimum size
                if (newBox.width < 20 || newBox.height < 20) {
                  return oldBox
                }
                return newBox
              }}
            />
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <div className="text-sm text-[#86868B] text-center">
        {tool === 'draw' ? (
          <p>Click and drag to draw a lot rectangle. Release to create.</p>
        ) : (
          <p>Click a lot to select it. Drag to move, use handles to resize.</p>
        )}
      </div>
    </div>
  )
}
