import { type Component } from 'solid-js'
import { open } from '@tauri-apps/plugin-dialog'

interface FileDropZoneProps {
  onFilesAdded: (paths: string[]) => void
}

const FileDropZone: Component<FileDropZoneProps> = props => {
  let dropRef: HTMLDivElement | undefined

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropRef) {
      dropRef.classList.add('border-blue-500', 'bg-blue-50')
    }
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropRef) {
      dropRef.classList.remove('border-blue-500', 'bg-blue-50')
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropRef) {
      dropRef.classList.remove('border-blue-500', 'bg-blue-50')
    }

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const paths: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = (file as unknown as { path?: string }).path
        if (path) {
          paths.push(path)
        }
      }
      if (paths.length > 0) {
        props.onFilesAdded(paths)
      }
    }
  }

  const handleClick = async () => {
    try {
      const selected = await open({
        multiple: true,
        title: 'Select files to share',
      })
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected]
        if (paths.length > 0) {
          props.onFilesAdded(paths)
        }
      }
    } catch (e) {
      console.error('File picker cancelled or failed:', e)
    }
  }

  return (
    <div
      ref={dropRef}
      onClick={() => void handleClick()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-gray-400 hover:bg-gray-50"
    >
      <div class="text-4xl mb-2">📁</div>
      <p class="text-gray-600 text-sm">
        Drag files here, or <span class="text-blue-500 underline">click to select</span>
      </p>
      <p class="text-gray-400 text-xs mt-1">Files are shared from their original location</p>
    </div>
  )
}

export default FileDropZone