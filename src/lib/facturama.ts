const BASE_URL = 'https://apisandbox.facturama.mx'

function getHeaders(): HeadersInit {
  const user = process.env.FACTURAMA_USER ?? ''
  const pass = process.env.FACTURAMA_PASS ?? ''
  const token = Buffer.from(`${user}:${pass}`).toString('base64')
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
  }
}

export interface FacturamaItem {
  ProductCode: string
  IdentificationNumber?: string
  Description: string
  Unit: string
  UnitCode: string
  UnitPrice: number
  Quantity: number
  Subtotal: number
  Discount?: number
  Taxes: { Total: number; Name: string; Base: number; Rate: number; IsRetention: boolean }[]
  Total: number
}

export interface FacturamaPayload {
  Serie: string
  Currency: string
  ExpeditionPlace: string
  CfdiType: string
  PaymentForm: string
  PaymentMethod: string
  Receiver: {
    Rfc: string
    Name: string
    CfdiUse: string
    FiscalRegime: string
    TaxZipCode: string
  }
  Items: FacturamaItem[]
}

async function parseErrorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `HTTP ${res.status} ${res.statusText}`
  try {
    const json = JSON.parse(text)
    return JSON.stringify(json)
  } catch {
    return text
  }
}

export async function timbrarCFDI(payload: FacturamaPayload) {
  const res = await fetch(`${BASE_URL}/api/4/cfdis`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const msg = await parseErrorBody(res)
    throw new Error(msg)
  }

  return res.json()
}

export async function cancelarCFDI(id: string, motivo: string) {
  const res = await fetch(`${BASE_URL}/api/cfdis/${id}?type=issued&motive=${motivo}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  if (!res.ok) {
    const msg = await parseErrorBody(res)
    throw new Error(msg)
  }

  return res.json()
}

export async function getDocumento(id: string, formato: 'pdf' | 'xml') {
  const res = await fetch(`${BASE_URL}/api/cfdis/${formato}/issued/${id}`, {
    headers: getHeaders(),
  })

  if (!res.ok) throw new Error('No se pudo obtener el documento')

  return res.json()
}
