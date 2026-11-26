/** 回车是否可触发提交:排除输入法组合中的 Enter(isComposing / keyCode 229) */
export function isCommitEnter(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && !e.isComposing && e.keyCode !== 229
}
