import { describe, expect, it } from 'vitest'
import packageMetadata from '../package.json'
import tauriConfig from '../src-tauri/tauri.conf.json'
import { APP_VERSION } from './app-metadata'

describe('application metadata', () => {
  it('uses root package.json as the frontend and Tauri version source', () => {
    expect(APP_VERSION).toBe(packageMetadata.version)
    expect(tauriConfig.version).toBe('../package.json')
  })

  it('identifies the product instead of the original starter template', () => {
    expect(packageMetadata.name).toBe('macos-cleanup-hub')
    expect(packageMetadata.description).toBe(
      'A confirmation-first macOS disk cleanup desktop app built with Tauri and SolidJS'
    )
    expect(tauriConfig.productName).toBe('macOS Cleanup Hub')
  })
})
