import type { Component } from 'solid-js'

export interface FileEntry {
  id: string
  name: string
  size: number
  ext: string
  path: string
}

interface FileListProps {
  files: FileEntry[]
  onRemove: (id: string) => void
  onClear: () => void
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    pdf: '📄',
    epub: '📘',
    mobi: '📘',
    azw3: '📘',
    doc: '📋',
    docx: '📋',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽',
    pptx: '📽',
    txt: '📝',
    csv: '📊',
    json: '📋',
    md: '📝',
    zip: '🗜',
    rar: '🗜',
    '7z': '🗜',
    tar: '🗜',
    gz: '🗜',
    jpg: '🖼',
    jpeg: '🖼',
    png: '🖼',
    gif: '🖼',
    webp: '🖼',
    svg: '🖼',
    mp4: '🎬',
    mov: '🎬',
    avi: '🎬',
    mkv: '🎬',
    mp3: '🎵',
    wav: '🎵',
    flac: '🎵',
  }
  return icons[ext] || '📄'
}

const FileList: Component<FileListProps> = props => {
  return (
    <div>
      {props.files.length > 0 && (
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-500">{props.files.length} file(s)</span>
          <button
            onClick={props.onClear}
            class="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {props.files.length === 0 ? (
        <div class="text-center py-8 text-gray-400">
          <p class="text-sm">No files added yet</p>
        </div>
      ) : (
        <ul class="space-y-2">
          {props.files.map(file => (
            <li class="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <span class="text-2xl flex-shrink-0">{getFileIcon(file.ext)}</span>
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{file.name}</p>
                  <p class="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => props.onRemove(file.id)}
                class="flex-shrink-0 ml-2 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove file"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FileList