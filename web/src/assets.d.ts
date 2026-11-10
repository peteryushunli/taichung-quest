declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.mp4' {
  const url: string;
  export default url;
}
// Vite's eager glob import (the subset this project uses).
interface ImportMeta {
  glob<T = unknown>(pattern: string, options: { eager: true; import: 'default' }): Record<string, T>;
}
