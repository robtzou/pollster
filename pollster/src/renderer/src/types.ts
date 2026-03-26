export type BlockType = 'markdown' | 'slide' | 'pulse'

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface MarkdownBlock extends BaseBlock {
  type: 'markdown'
  content: string
}

export interface SlideBlock extends BaseBlock {
  type: 'slide'
  localPath: string
}

export interface PulseBlock extends BaseBlock {
  type: 'pulse'
  question: string
  options: string[]
}

export type TimelineBlock = MarkdownBlock | SlideBlock | PulseBlock
