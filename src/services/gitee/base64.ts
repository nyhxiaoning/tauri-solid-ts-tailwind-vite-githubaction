/**
 * UTF-8 安全的 Base64 编解码。
 * btoa/atob 仅支持 Latin1 字符,中文内容必须先经 TextEncoder 中转。
 */

/** UTF-8 文本 → Base64(分块转换,避免大数组触发 Function.prototype.apply 参数上限) */
export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** Base64 → UTF-8 文本(Gitee 返回的 base64 每 60 字符插入换行,先剔除) */
export function decodeBase64Utf8(base64: string): string {
  const clean = base64.replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}
