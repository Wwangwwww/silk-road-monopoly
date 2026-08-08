/** pako 类型声明 */

declare module 'pako' {
  export function gzip(data: Uint8Array, options?: any): Uint8Array;
  export function ungzip(data: Uint8Array, options?: any): Uint8Array;
  export function deflate(data: Uint8Array, options?: any): Uint8Array;
  export function inflate(data: Uint8Array, options?: any): Uint8Array;
}
