# 🔐 Módulo de Seguridad - Guía de Uso

## Inicio Rápido

### 1. Inicializar Seguridad

En tu `app/layout.tsx`:

```typescript
import { initializeSecurity } from '@/lib/security'

export default function RootLayout({ children }) {
  useEffect(() => {
    initializeSecurity()
  }, [])
  
  return <html>{children}</html>
}
```

### 2. Verificar Estado de Seguridad

```typescript
import { getSecurityStatus } from '@/lib/security'

const status = getSecurityStatus()
console.log('Sistema seguro:', status.healthy)
```

## Módulos Disponibles

### 🔐 Encriptación

```typescript
import { SecurityEncryption } from '@/lib/security'

// Encriptar
const encrypted = await SecurityEncryption.encrypt(
  'datos sensibles',
  process.env.NEXT_PUBLIC_MASTER_KEY!
)

// Desencriptar
const decrypted = await SecurityEncryption.decrypt(
  encrypted,
  process.env.NEXT_PUBLIC_MASTER_KEY!
)

// Hash
const hash = await SecurityEncryption.hash('password')

// Token seguro
const token = SecurityEncryption.generateSecureToken(32)
```

### 📝 Auditoría

```typescript
import { auditLogger, AuditEventType, logUserAction } from '@/lib/security'

// Registrar acción
await logUserAction(
  AuditEventType.POLIZA_VIEW,
  user.id,
  user.email,
  user.role,
  'polizas',
  'view_details',
  { polizaId: '123' }
)

// Obtener logs
const logs = auditLogger.getLogs({
  userId: 'user123',
  startDate: '2025-01-01'
})

// Detectar actividad sospechosa
const suspicious = auditLogger.detectSuspiciousActivity('user123', 5)
```

### 🛡️ Rate Limiting

```typescript
import { rateLimiter, checkRateLimit } from '@/lib/security'

// Verificar límite
const result = await checkRateLimit(userId, 'login')

if (!result.success) {
  return { error: result.error }
}

// Proceder con la acción
```

### 🔒 Gestión de Sesiones

```typescript
import { sessionManager } from '@/lib/security'

// Crear sesión
const session = await sessionManager.createSession(
  userId,
  userEmail,
  userRole
)

// Validar sesión
const validation = await sessionManager.validateSession(sessionId)

// Terminar sesión
await sessionManager.terminateSession(sessionId)
```

### ⚖️ Protección de Datos

```typescript
import { dataProtectionManager, ConsentType, ARCORight } from '@/lib/security'

// Registrar consentimiento
dataProtectionManager.recordConsent(
  userId,
  ConsentType.MARKETING,
  true
)

// Verificar consentimiento
const hasConsent = dataProtectionManager.hasConsent(
  userId,
  ConsentType.MARKETING
)

// Solicitud ARCO
await dataProtectionManager.processARCORequest(
  userId,
  ARCORight.ACCESS
)
```

### ✅ Validación de Entrada

```typescript
import { InputValidator, validators } from '@/lib/security'

// Validar email
const emailCheck = InputValidator.validateEmail(email)

// Validar RFC
const rfcCheck = InputValidator.validateRFC(rfc)

// Validar entrada general
const validation = InputValidator.validateInput(userInput, 'Nombre')

// Validar objeto completo
const result = InputValidator.validateObject(data, {
  email: validators.email,
  phone: validators.phone,
  amount: validators.amount
})
```

## Variables de Entorno

Crea un archivo `.env.local`:

```bash
# Clave maestra para encriptación (generar con: openssl rand -base64 32)
NEXT_PUBLIC_MASTER_KEY=tu_clave_super_secreta_aqui

# Entorno
NODE_ENV=development
```

## Mejores Prácticas

1. **Siempre encripta datos sensibles** antes de guardarlos
2. **Registra todas las acciones críticas** en auditoría
3. **Valida toda entrada de usuario** antes de procesarla
4. **Verifica rate limits** en endpoints públicos
5. **Usa sesiones seguras**, no localStorage directo
6. **Implementa HTTPS** en producción
7. **Rota claves** regularmente
8. **Revisa logs** semanalmente

## Producción

Antes de desplegar:

- [ ] Configurar `MASTER_KEY` en variables de entorno
- [ ] Habilitar HTTPS obligatorio
- [ ] Configurar backup de logs
- [ ] Integrar servicio de logging externo
- [ ] Configurar alertas
- [ ] Realizar penetration testing

## Soporte

Para reportar vulnerabilidades: security@conductocrm.com
