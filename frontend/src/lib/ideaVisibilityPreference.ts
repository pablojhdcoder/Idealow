const KEY = 'idealow_privateIdeasByDefault'

export function readPrivateIdeasByDefault(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function writePrivateIdeasByDefault(value: boolean): void {
  try {
    localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}
