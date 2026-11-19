export interface BilliConfig {
  zIndex?: number
  headerHeight?: number
  appearAfter?: number
  mobile?: 'companion' | 'full' | 'off'
  accent?: [number, number, number]
  onPet?: () => void
}

export function mountBilli(config?: BilliConfig): { dispose?: () => void } | null
