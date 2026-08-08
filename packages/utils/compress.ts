/** pako gzip 压缩/解压 */

import pako from 'pako';

/**
 * gzip 压缩
 */
export function compress(data: string | Uint8Array): Uint8Array {
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    return pako.gzip(encoder.encode(data));
  }
  return pako.gzip(data);
}

/**
 * gzip 解压
 */
export function decompress(data: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(pako.ungzip(data));
}
