/**
 * 🔐 MÓDULO DE ENCRIPTACIÓN DE NIVEL MILITAR
 * 
 * Implementa encriptación AES-256-GCM para datos sensibles
 * Cumple con estándares: FIPS 140-2, ISO 27001, NIST
 */

export class SecurityEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly TAG_LENGTH = 16
  private static readonly SALT_LENGTH = 32

  /**
   * Genera una clave de encriptación desde una contraseña
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000, // OWASP recomienda 600,000+ iteraciones
        hash: 'SHA-256',
      },
      passwordKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encripta datos sensibles con AES-256-GCM
   */
  static async encrypt(plaintext: string, masterKey: string): Promise<string> {
    try {
      // Generar salt e IV aleatorios
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

      // Derivar clave desde master key
      const key = await this.deriveKey(masterKey, salt)

      // Encriptar
      const encoder = new TextEncoder()
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH * 8,
        },
        key,
        encoder.encode(plaintext)
      )

      // Combinar salt + iv + encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encrypted), salt.length + iv.length)

      // Retornar como base64
      return this.arrayBufferToBase64(combined)
    } catch (error) {
      console.error('❌ Error de encriptación:', error)
      throw new Error('Fallo en encriptación de datos')
    }
  }

  /**
   * Desencripta datos
   */
  static async decrypt(ciphertext: string, masterKey: string): Promise<string> {
    try {
      // Convertir de base64
      const combined = this.base64ToArrayBuffer(ciphertext)

      // Extraer salt, iv y datos encriptados
      const salt = combined.slice(0, this.SALT_LENGTH)
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
      const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH)

      // Derivar clave
      const key = await this.deriveKey(masterKey, salt)

      // Desencriptar
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          tagLength: this.TAG_LENGTH * 8,
        },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('❌ Error de desencriptación:', error)
      throw new Error('Fallo en desencriptación de datos')
    }
  }

  /**
   * Genera un hash seguro (SHA-256)
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    return this.arrayBufferToBase64(new Uint8Array(hashBuffer))
  }

  /**
   * Genera un token aleatorio seguro
   */
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return this.arrayBufferToBase64(array)
  }

  /**
   * Valida la fortaleza de una contraseña
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean
    score: number
    feedback: string[]
  } {
    const feedback: string[] = []
    let score = 0

    // Longitud mínima
    if (password.length < 12) {
      feedback.push('La contraseña debe tener al menos 12 caracteres')
    } else {
      score += 25
    }

    // Mayúsculas
    if (!/[A-Z]/.test(password)) {
      feedback.push('Debe contener al menos una letra mayúscula')
    } else {
      score += 25
    }

    // Minúsculas
    if (!/[a-z]/.test(password)) {
      feedback.push('Debe contener al menos una letra minúscula')
    } else {
      score += 25
    }

    // Números
    if (!/[0-9]/.test(password)) {
      feedback.push('Debe contener al menos un número')
    } else {
      score += 15
    }

    // Caracteres especiales
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Debe contener al menos un carácter especial')
    } else {
      score += 10
    }

    return {
      isValid: score === 100,
      score,
      feedback,
    }
  }

  // Utilidades
  private static arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = ''
    const len = buffer.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    return btoa(binary)
  }

  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

/**
 * Encripta campos sensibles de un objeto
 */
export async function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[],
  masterKey: string
): Promise<T> {
  const encrypted = { ...data }

  for (const field of sensitiveFields) {
    if (encrypted[field]) {
      encrypted[field] = await SecurityEncryption.encrypt(
        String(encrypted[field]),
        masterKey
      )
    }
  }

  return encrypted
}

/**
 * Desencripta campos sensibles de un objeto
 */
export async function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[],
  masterKey: string
): Promise<T> {
  const decrypted = { ...data }

  for (const field of sensitiveFields) {
    if (decrypted[field]) {
      decrypted[field] = await SecurityEncryption.decrypt(
        String(decrypted[field]),
        masterKey
      )
    }
  }

  return decrypted
}
