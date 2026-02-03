/**
 * 🛡️ PROTECCIÓN DE DATOS Y COMPLIANCE
 * 
 * Cumplimiento con GDPR, LFPDPPP (México), HIPAA
 * Gestión de consentimientos y derechos ARCO
 */

export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
}

export enum ConsentType {
  MARKETING = 'MARKETING',
  ANALYTICS = 'ANALYTICS',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
  PROFILING = 'PROFILING',
}

export enum ARCORight {
  ACCESS = 'ACCESS', // Acceso
  RECTIFICATION = 'RECTIFICATION', // Rectificación
  CANCELLATION = 'CANCELLATION', // Cancelación
  OPPOSITION = 'OPPOSITION', // Oposición
}

export interface DataSubject {
  id: string
  email: string
  name: string
  consents: Map<ConsentType, ConsentRecord>
  arcoRequests: ARCORequest[]
  dataRetentionUntil?: string
  isAnonymized: boolean
  createdAt: string
  updatedAt: string
}

export interface ConsentRecord {
  granted: boolean
  grantedAt?: string
  revokedAt?: string
  version: string
  ipAddress?: string
  userAgent?: string
}

export interface ARCORequest {
  id: string
  type: ARCORight
  requestedAt: string
  processedAt?: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  reason?: string
  completedBy?: string
}

export interface DataRetentionPolicy {
  dataType: string
  retentionPeriodDays: number
  classification: DataClassification
  autoDelete: boolean
  requiresApproval: boolean
}

export class DataProtectionManager {
  private subjects: Map<string, DataSubject> = new Map()
  private readonly STORAGE_KEY = 'crm-data-protection'
  
  private readonly retentionPolicies: DataRetentionPolicy[] = [
    {
      dataType: 'polizas_activas',
      retentionPeriodDays: 3650, // 10 años (requisito legal)
      classification: DataClassification.CONFIDENTIAL,
      autoDelete: false,
      requiresApproval: true,
    },
    {
      dataType: 'polizas_canceladas',
      retentionPeriodDays: 1825, // 5 años
      classification: DataClassification.CONFIDENTIAL,
      autoDelete: true,
      requiresApproval: false,
    },
    {
      dataType: 'prospectos_no_convertidos',
      retentionPeriodDays: 365, // 1 año
      classification: DataClassification.INTERNAL,
      autoDelete: true,
      requiresApproval: false,
    },
    {
      dataType: 'logs_auditoria',
      retentionPeriodDays: 2555, // 7 años (SOX compliance)
      classification: DataClassification.RESTRICTED,
      autoDelete: false,
      requiresApproval: true,
    },
    {
      dataType: 'datos_marketing',
      retentionPeriodDays: 730, // 2 años
      classification: DataClassification.INTERNAL,
      autoDelete: true,
      requiresApproval: false,
    },
  ]

  constructor() {
    this.loadData()
  }

  /**
   * Registra un nuevo sujeto de datos
   */
  registerDataSubject(id: string, email: string, name: string): DataSubject {
    const subject: DataSubject = {
      id,
      email,
      name,
      consents: new Map(),
      arcoRequests: [],
      isAnonymized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.subjects.set(id, subject)
    this.saveData()

    return subject
  }

  /**
   * Registra consentimiento
   */
  recordConsent(
    subjectId: string,
    consentType: ConsentType,
    granted: boolean,
    version: string = '1.0',
    ipAddress?: string,
    userAgent?: string
  ): void {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      throw new Error('Sujeto de datos no encontrado')
    }

    const consent: ConsentRecord = {
      granted,
      grantedAt: granted ? new Date().toISOString() : undefined,
      revokedAt: !granted ? new Date().toISOString() : undefined,
      version,
      ipAddress,
      userAgent,
    }

    subject.consents.set(consentType, consent)
    subject.updatedAt = new Date().toISOString()

    this.saveData()
  }

  /**
   * Verifica si hay consentimiento para una acción
   */
  hasConsent(subjectId: string, consentType: ConsentType): boolean {
    const subject = this.subjects.get(subjectId)
    if (!subject) return false

    const consent = subject.consents.get(consentType)
    return consent?.granted === true
  }

  /**
   * Procesa solicitud ARCO
   */
  async processARCORequest(
    subjectId: string,
    type: ARCORight,
    reason?: string
  ): Promise<ARCORequest> {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      throw new Error('Sujeto de datos no encontrado')
    }

    const request: ARCORequest = {
      id: `arco-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      reason,
    }

    subject.arcoRequests.push(request)
    subject.updatedAt = new Date().toISOString()

    this.saveData()

    // En producción, esto dispararía un workflow de aprobación
    console.log(`📋 Nueva solicitud ARCO: ${type} para ${subject.email}`)

    return request
  }

  /**
   * Completa solicitud ARCO
   */
  async completeARCORequest(
    subjectId: string,
    requestId: string,
    completedBy: string,
    status: 'completed' | 'rejected' = 'completed'
  ): Promise<void> {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      throw new Error('Sujeto de datos no encontrado')
    }

    const request = subject.arcoRequests.find((r) => r.id === requestId)
    if (!request) {
      throw new Error('Solicitud ARCO no encontrada')
    }

    request.status = status
    request.processedAt = new Date().toISOString()
    request.completedBy = completedBy

    // Ejecutar acción según el tipo de solicitud
    if (status === 'completed') {
      switch (request.type) {
        case ARCORight.ACCESS:
          await this.exportPersonalData(subjectId)
          break
        case ARCORight.CANCELLATION:
          await this.deletePersonalData(subjectId)
          break
        case ARCORight.OPPOSITION:
          // Marcar para no procesar ciertos datos
          this.recordConsent(subjectId, ConsentType.MARKETING, false)
          this.recordConsent(subjectId, ConsentType.PROFILING, false)
          break
      }
    }

    subject.updatedAt = new Date().toISOString()
    this.saveData()
  }

  /**
   * Exporta todos los datos personales (derecho de acceso)
   */
  async exportPersonalData(subjectId: string): Promise<any> {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      throw new Error('Sujeto de datos no encontrado')
    }

    // En producción, esto recopilaría datos de todas las tablas
    const personalData = {
      subject: {
        id: subject.id,
        email: subject.email,
        name: subject.name,
        createdAt: subject.createdAt,
      },
      consents: Array.from(subject.consents.entries()).map(([type, record]) => ({
        type,
        ...record,
      })),
      arcoRequests: subject.arcoRequests,
      // Aquí se agregarían: pólizas, pagos, documentos, etc.
    }

    console.log(`📦 Exportando datos personales para ${subject.email}`)

    return personalData
  }

  /**
   * Elimina datos personales (derecho de cancelación)
   */
  async deletePersonalData(subjectId: string): Promise<void> {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      throw new Error('Sujeto de datos no encontrado')
    }

    // Verificar si hay datos que deben retenerse por ley
    const hasActiveRetention = this.checkRetentionRequirements(subjectId)

    if (hasActiveRetention) {
      // Anonimizar en lugar de eliminar
      await this.anonymizeData(subjectId)
    } else {
      // Eliminar completamente
      this.subjects.delete(subjectId)
      this.saveData()
    }

    console.log(`🗑️ Datos eliminados/anonimizados para ${subject.email}`)
  }

  /**
   * Anonimiza datos (cuando no se pueden eliminar por requisitos legales)
   */
  async anonymizeData(subjectId: string): Promise<void> {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      throw new Error('Sujeto de datos no encontrado')
    }

    // Reemplazar datos personales con valores anónimos
    subject.email = `anonymized-${subject.id}@example.com`
    subject.name = `Usuario Anónimo ${subject.id.substr(0, 8)}`
    subject.isAnonymized = true
    subject.updatedAt = new Date().toISOString()

    // Revocar todos los consentimientos
    subject.consents.forEach((consent) => {
      consent.granted = false
      consent.revokedAt = new Date().toISOString()
    })

    this.saveData()

    console.log(`🎭 Datos anonimizados para sujeto ${subjectId}`)
  }

  /**
   * Verifica requisitos de retención de datos
   */
  checkRetentionRequirements(subjectId: string): boolean {
    // En producción, verificaría si hay pólizas activas, procesos legales, etc.
    // Por ahora, retorna false para permitir eliminación
    return false
  }

  /**
   * Aplica políticas de retención de datos
   */
  async applyRetentionPolicies(): Promise<{
    reviewed: number
    deleted: number
    anonymized: number
  }> {
    let reviewed = 0
    let deleted = 0
    let anonymized = 0

    const now = new Date()

    for (const [subjectId, subject] of this.subjects.entries()) {
      reviewed++

      if (subject.dataRetentionUntil) {
        const retentionDate = new Date(subject.dataRetentionUntil)

        if (now > retentionDate) {
          const hasActiveRetention = this.checkRetentionRequirements(subjectId)

          if (hasActiveRetention) {
            await this.anonymizeData(subjectId)
            anonymized++
          } else {
            this.subjects.delete(subjectId)
            deleted++
          }
        }
      }
    }

    this.saveData()

    return { reviewed, deleted, anonymized }
  }

  /**
   * Genera reporte de cumplimiento
   */
  generateComplianceReport(): {
    totalSubjects: number
    anonymizedSubjects: number
    pendingARCORequests: number
    consentStats: Record<ConsentType, { granted: number; revoked: number }>
    retentionPolicies: DataRetentionPolicy[]
  } {
    const subjects = Array.from(this.subjects.values())

    const anonymizedSubjects = subjects.filter((s) => s.isAnonymized).length

    const pendingARCORequests = subjects.reduce(
      (count, subject) =>
        count + subject.arcoRequests.filter((r) => r.status === 'pending').length,
      0
    )

    const consentStats: Record<ConsentType, { granted: number; revoked: number }> = {
      [ConsentType.MARKETING]: { granted: 0, revoked: 0 },
      [ConsentType.ANALYTICS]: { granted: 0, revoked: 0 },
      [ConsentType.THIRD_PARTY_SHARING]: { granted: 0, revoked: 0 },
      [ConsentType.PROFILING]: { granted: 0, revoked: 0 },
    }

    subjects.forEach((subject) => {
      subject.consents.forEach((consent, type) => {
        if (consent.granted) {
          consentStats[type].granted++
        } else {
          consentStats[type].revoked++
        }
      })
    })

    return {
      totalSubjects: subjects.length,
      anonymizedSubjects,
      pendingARCORequests,
      consentStats,
      retentionPolicies: this.retentionPolicies,
    }
  }

  /**
   * Clasifica datos según sensibilidad
   */
  classifyData(dataType: string): DataClassification {
    const sensitiveData = ['polizas', 'pagos', 'documentos', 'datos_medicos']
    const confidentialData = ['clientes', 'cotizaciones', 'comisiones']
    const internalData = ['prospectos', 'actividades', 'recordatorios']

    if (sensitiveData.some((type) => dataType.includes(type))) {
      return DataClassification.RESTRICTED
    }
    if (confidentialData.some((type) => dataType.includes(type))) {
      return DataClassification.CONFIDENTIAL
    }
    if (internalData.some((type) => dataType.includes(type))) {
      return DataClassification.INTERNAL
    }

    return DataClassification.PUBLIC
  }

  // Métodos privados
  private loadData(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          this.subjects = new Map(
            data.map((s: any) => [
              s.id,
              {
                ...s,
                consents: new Map(Object.entries(s.consents || {})),
              },
            ])
          )
        }
      } catch (error) {
        console.error('Error cargando datos de protección:', error)
      }
    }
  }

  private saveData(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = Array.from(this.subjects.values()).map((s) => ({
          ...s,
          consents: Object.fromEntries(s.consents),
        }))
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
      } catch (error) {
        console.error('Error guardando datos de protección:', error)
      }
    }
  }
}

// Singleton instance
export const dataProtectionManager = new DataProtectionManager()
