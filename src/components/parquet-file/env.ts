// The lab's ?still flag and the OS reduced-motion setting, as in datafusion-lab's src/app/env.ts. Guarded
// so importing this during a build (no window) doesn't throw; the island itself only runs in the browser.
const hasWindow = typeof window !== 'undefined'

export const params = new URLSearchParams(hasWindow ? window.location.search : '')
export const reducedMotion = params.has('still') || (hasWindow && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
