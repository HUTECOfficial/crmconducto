/**
 * 🛡️ VALIDADOR DE ENTRADA - PREVENCIÓN DE ATAQUES
 * 
 * Protege contra: XSS, SQL Injection, Command Injection, Path Traversal
 */

export class InputValidator {
  /**
   * Sanitiza entrada de texto para prevenir XSS
   */
  static sanitizeHTML(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    }

    return input.replace(/[&<>"'/]/g, (char) => map[char])
  }

  /**
   * Valida email
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    if (!email || email.length === 0) {
      return { valid: false, error: 'Email es requerido' }
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email demasiado largo' }
    }

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Formato de email inválido' }
    }

    // Detectar emails sospechosos
    const suspiciousPatterns = [
      /script/i,
      /<.*>/,
      /javascript:/i,
      /on\w+=/i,
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return { valid: false, error: 'Email contiene caracteres no permitidos' }
      }
    }

    return { valid: true }
  }

  /**
   * Valida RFC (México)
   */
  static validateRFC(rfc: string): { valid: boolean; error?: string } {
    // RFC Persona Física: 13 caracteres
    // RFC Persona Moral: 12 caracteres
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/

    if (!rfc || rfc.length === 0) {
      return { valid: false, error: 'RFC es requerido' }
    }

    const rfcUpper = rfc.toUpperCase().trim()

    if (rfcUpper.length !== 12 && rfcUpper.length !== 13) {
      return { valid: false, error: 'RFC debe tener 12 o 13 caracteres' }
    }

    if (!rfcRegex.test(rfcUpper)) {
      return { valid: false, error: 'Formato de RFC inválido' }
    }

    return { valid: true }
  }

  /**
   * Valida CURP (México)
   */
  static validateCURP(curp: string): { valid: boolean; error?: string } {
    const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/

    if (!curp || curp.length === 0) {
      return { valid: false, error: 'CURP es requerido' }
    }

    const curpUpper = curp.toUpperCase().trim()

    if (curpUpper.length !== 18) {
      return { valid: false, error: 'CURP debe tener 18 caracteres' }
    }

    if (!curpRegex.test(curpUpper)) {
      return { valid: false, error: 'Formato de CURP inválido' }
    }

    return { valid: true }
  }

  /**
   * Valida teléfono (México)
   */
  static validatePhone(phone: string): { valid: boolean; error?: string } {
    // Acepta: 10 dígitos, con o sin código de país (+52)
    const phoneRegex = /^(\+52)?[1-9]\d{9}$/

    if (!phone || phone.length === 0) {
      return { valid: false, error: 'Teléfono es requerido' }
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, '')

    if (!phoneRegex.test(cleanPhone)) {
      return { valid: false, error: 'Formato de teléfono inválido (10 dígitos)' }
    }

    return { valid: true }
  }

  /**
   * Valida número de póliza
   */
  static validatePolizaNumber(poliza: string): { valid: boolean; error?: string } {
    if (!poliza || poliza.length === 0) {
      return { valid: false, error: 'Número de póliza es requerido' }
    }

    if (poliza.length < 5 || poliza.length > 50) {
      return { valid: false, error: 'Número de póliza debe tener entre 5 y 50 caracteres' }
    }

    // Solo alfanuméricos y guiones
    const polizaRegex = /^[A-Z0-9\-]+$/i

    if (!polizaRegex.test(poliza)) {
      return { valid: false, error: 'Número de póliza solo puede contener letras, números y guiones' }
    }

    return { valid: true }
  }

  /**
   * Valida monto monetario
   */
  static validateAmount(amount: number | string): { valid: boolean; error?: string; value?: number } {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

    if (isNaN(numAmount)) {
      return { valid: false, error: 'Monto inválido' }
    }

    if (numAmount < 0) {
      return { valid: false, error: 'Monto no puede ser negativo' }
    }

    if (numAmount > 999999999) {
      return { valid: false, error: 'Monto excede el límite permitido' }
    }

    // Máximo 2 decimales
    const decimals = (numAmount.toString().split('.')[1] || '').length
    if (decimals > 2) {
      return { valid: false, error: 'Monto solo puede tener 2 decimales' }
    }

    return { valid: true, value: numAmount }
  }

  /**
   * Valida fecha
   */
  static validateDate(date: string | Date): { valid: boolean; error?: string; date?: Date } {
    let dateObj: Date

    if (typeof date === 'string') {
      dateObj = new Date(date)
    } else {
      dateObj = date
    }

    if (isNaN(dateObj.getTime())) {
      return { valid: false, error: 'Fecha inválida' }
    }

    // Verificar rango razonable (1900 - 2100)
    const year = dateObj.getFullYear()
    if (year < 1900 || year > 2100) {
      return { valid: false, error: 'Fecha fuera de rango permitido' }
    }

    return { valid: true, date: dateObj }
  }

  /**
   * Valida rango de fechas
   */
  static validateDateRange(
    startDate: string | Date,
    endDate: string | Date
  ): { valid: boolean; error?: string } {
    const start = this.validateDate(startDate)
    const end = this.validateDate(endDate)

    if (!start.valid) {
      return { valid: false, error: `Fecha inicio: ${start.error}` }
    }

    if (!end.valid) {
      return { valid: false, error: `Fecha fin: ${end.error}` }
    }

    if (start.date! > end.date!) {
      return { valid: false, error: 'Fecha inicio debe ser anterior a fecha fin' }
    }

    return { valid: true }
  }

  /**
   * Detecta intentos de SQL Injection
   */
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\bOR\b|\bAND\b).*=.*=/i,
      /(\bUNION\b.*\bSELECT\b)/i,
      /'.*--/,
      /\bxp_\w+/i,
    ]

    return sqlPatterns.some((pattern) => pattern.test(input))
  }

  /**
   * Detecta intentos de XSS
   */
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /eval\(/gi,
      /expression\(/gi,
    ]

    return xssPatterns.some((pattern) => pattern.test(input))
  }

  /**
   * Detecta intentos de Path Traversal
   */
  static detectPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
    ]

    return pathPatterns.some((pattern) => pattern.test(input))
  }

  /**
   * Valida entrada general (detecta múltiples tipos de ataques)
   */
  static validateInput(
    input: string,
    fieldName: string = 'Campo'
  ): { valid: boolean; error?: string; sanitized?: string } {
    if (!input || input.length === 0) {
      return { valid: false, error: `${fieldName} es requerido` }
    }

    if (input.length > 10000) {
      return { valid: false, error: `${fieldName} excede la longitud máxima` }
    }

    // Detectar ataques
    if (this.detectSQLInjection(input)) {
      return { valid: false, error: `${fieldName} contiene patrones sospechosos (SQL)` }
    }

    if (this.detectXSS(input)) {
      return { valid: false, error: `${fieldName} contiene patrones sospechosos (XSS)` }
    }

    if (this.detectPathTraversal(input)) {
      return { valid: false, error: `${fieldName} contiene patrones sospechosos (Path Traversal)` }
    }

    // Sanitizar
    const sanitized = this.sanitizeHTML(input)

    return { valid: true, sanitized }
  }

  /**
   * Valida archivo subido
   */
  static validateFile(
    file: File,
    options: {
      maxSizeMB?: number
      allowedTypes?: string[]
      allowedExtensions?: string[]
    } = {}
  ): { valid: boolean; error?: string } {
    const {
      maxSizeMB = 10,
      allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'],
      allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
    } = options

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `Archivo excede el tamaño máximo de ${maxSizeMB}MB` }
    }

    // Validar tipo MIME
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no permitido' }
    }

    // Validar extensión
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!extension || !allowedExtensions.includes(extension)) {
      return { valid: false, error: 'Extensión de archivo no permitida' }
    }

    // Detectar nombres de archivo sospechosos
    if (this.detectPathTraversal(file.name)) {
      return { valid: false, error: 'Nombre de archivo contiene caracteres no permitidos' }
    }

    return { valid: true }
  }

  /**
   * Valida URL
   */
  static validateURL(url: string): { valid: boolean; error?: string } {
    try {
      const urlObj = new URL(url)

      // Solo permitir HTTP y HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'Protocolo no permitido' }
      }

      // Detectar URLs sospechosas
      if (this.detectXSS(url)) {
        return { valid: false, error: 'URL contiene patrones sospechosos' }
      }

      return { valid: true }
    } catch {
      return { valid: false, error: 'URL inválida' }
    }
  }

  /**
   * Valida JSON
   */
  static validateJSON(json: string): { valid: boolean; error?: string; data?: any } {
    try {
      const data = JSON.parse(json)
      return { valid: true, data }
    } catch (error) {
      return { valid: false, error: 'JSON inválido' }
    }
  }

  /**
   * Limpia y valida nombre de archivo
   */
  static sanitizeFilename(filename: string): string {
    // Remover caracteres peligrosos
    let clean = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

    // Prevenir path traversal
    clean = clean.replace(/\.\./g, '')

    // Limitar longitud
    if (clean.length > 255) {
      const extension = clean.match(/\.[^.]+$/)?.[0] || ''
      clean = clean.substring(0, 255 - extension.length) + extension
    }

    return clean
  }

  /**
   * Valida objeto completo
   */
  static validateObject<T extends Record<string, any>>(
    obj: T,
    schema: Record<keyof T, (value: any) => { valid: boolean; error?: string }>
  ): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
    const errors: Partial<Record<keyof T, string>> = {}

    for (const key in schema) {
      const validator = schema[key]
      const result = validator(obj[key])

      if (!result.valid) {
        errors[key] = result.error || 'Valor inválido'
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  }
}

// Helpers de validación comunes
export const validators = {
  required: (value: any) => ({
    valid: value !== null && value !== undefined && value !== '',
    error: 'Este campo es requerido',
  }),

  minLength: (min: number) => (value: string) => ({
    valid: value && value.length >= min,
    error: `Debe tener al menos ${min} caracteres`,
  }),

  maxLength: (max: number) => (value: string) => ({
    valid: !value || value.length <= max,
    error: `No puede exceder ${max} caracteres`,
  }),

  min: (min: number) => (value: number) => ({
    valid: value >= min,
    error: `Debe ser mayor o igual a ${min}`,
  }),

  max: (max: number) => (value: number) => ({
    valid: value <= max,
    error: `Debe ser menor o igual a ${max}`,
  }),

  pattern: (regex: RegExp, message: string) => (value: string) => ({
    valid: regex.test(value),
    error: message,
  }),

  email: (value: string) => InputValidator.validateEmail(value),

  phone: (value: string) => InputValidator.validatePhone(value),

  rfc: (value: string) => InputValidator.validateRFC(value),

  curp: (value: string) => InputValidator.validateCURP(value),

  amount: (value: number | string) => InputValidator.validateAmount(value),

  date: (value: string | Date) => InputValidator.validateDate(value),
}
