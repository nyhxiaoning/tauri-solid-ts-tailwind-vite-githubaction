import { describe, expect, it } from 'vitest'
import packageMetadata from '../package.json'
import tauriConfig from '../src-tauri/tauri.conf.json'
import { APP_VERSION } from './app-metadata'

describe('application metadata', () => {
  it('uses root package.json as the frontend and Tauri version source', () => {
    expect(APP_VERSION).toBe(packageMetadata.version)
    expect(tauriConfig.version).toBe('../package.json')
  })
})
