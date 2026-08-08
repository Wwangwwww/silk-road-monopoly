/** 加密/解密工具 - .srmap 文件格式 */

// MAGIC 头: SRMP (Silk Road Map Protocol)
const MAGIC_HEADER = 'SRMP';

/**
 * AES-CBC 加密
 */
export async function encryptAES(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data);
}

/**
 * AES-CBC 解密
 */
export async function decryptAES(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, data);
}

/**
 * 从密码生成 AES 密钥
 */
export async function deriveKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);

  const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: actualSalt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt: actualSalt };
}

/**
 * 加密地图数据为 .srmap 格式
 */
export async function encryptMapData(mapData: string, password: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const { key, salt } = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const data = encoder.encode(mapData);
  const encrypted = await encryptAES(data, key, iv);

  // 构造: MAGIC(4) + Salt(16) + IV(16) + 加密数据
  const header = encoder.encode(MAGIC_HEADER);
  const result = new Uint8Array(header.length + salt.length + iv.length + encrypted.byteLength);

  result.set(header, 0);
  result.set(salt, header.length);
  result.set(iv, header.length + salt.length);
  result.set(new Uint8Array(encrypted), header.length + salt.length + iv.length);

  return result.buffer;
}

/**
 * 解密 .srmap 格式的地图数据
 */
export async function decryptMapData(encryptedData: ArrayBuffer, password: string): Promise<string> {
  const decoder = new TextDecoder();
  const data = new Uint8Array(encryptedData);

  // 验证 MAGIC
  const magic = decoder.decode(data.slice(0, 4));
  if (magic !== MAGIC_HEADER) {
    throw new Error('无效的地图文件格式');
  }

  const salt = data.slice(4, 20);
  const iv = data.slice(20, 36);
  const encrypted = data.slice(36);

  const { key } = await deriveKey(password, salt);
  const decrypted = await decryptAES(encrypted, key, iv);

  return decoder.decode(decrypted);
}
