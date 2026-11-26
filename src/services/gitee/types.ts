/** 仓库文件目标:owner / 仓库名 / 文件路径;读写分支留空 = 仓库默认分支(不硬编码) */
export interface FileTarget {
  owner: string
  repo: string
  path: string
  /** 读取分支 / 版本 ref */
  readRef?: string
  /** 写入分支 */
  writeBranch?: string
}

/** 远端文件:适配器解码后的 UTF-8 文本 + 版本标识(Gitee 对应 Blob SHA) */
export interface RemoteFile {
  content: string
  revision: string
}

/** 平台无关的仓库文件契约:更换平台只替换实现,快照协议保持不变 */
export interface FileProvider {
  /** null = 远端文件不存在(404) */
  readFile(target: FileTarget): Promise<RemoteFile | null>
  createFile(target: FileTarget, content: string, message: string): Promise<RemoteFile>
  updateFile(
    target: FileTarget,
    content: string,
    message: string,
    revision: string
  ): Promise<RemoteFile>
}
