import type { StemToolApi } from '../shared/types'

declare global {
  interface Window {
    stemtool: StemToolApi
  }
}

export {}
