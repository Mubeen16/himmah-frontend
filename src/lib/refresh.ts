export function triggerRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('himmah:refresh'))
  }
}
