import type { CreateSwitchInput } from '~/stores/switch'

export type SwitchFormErrors = Partial<Record<keyof CreateSwitchInput, string>>

const IPV4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
const PORT_MIN = 1
const PORT_MAX = 65535

/**
 * Validate a single switch field. Returns an error message or undefined.
 */
export function validateSwitchField<K extends keyof CreateSwitchInput>(field: K, data: Partial<CreateSwitchInput>): string | undefined {
  switch (field) {
    case 'name': {
      const name = data.name?.trim()
      if (!name)
        return 'Switch name is required'
      if (name.length > 100)
        return `Switch name must be 100 characters or less (currently ${name.length})`
      return undefined
    }
    case 'ipAddress': {
      const host = data.ipAddress?.trim()
      if (!host)
        return 'IP address or domain is required'
      if (IPV4.test(host))
        return undefined
      if (HOSTNAME.test(host))
        return undefined
      if (/\s/.test(host))
        return 'IP address or domain cannot contain spaces'
      if (host.includes('..') || host.startsWith('.') || host.endsWith('.') || host.startsWith('-') || host.endsWith('-'))
        return 'Domain cannot start/end with a dot or hyphen, or contain consecutive dots'
      if (/^\d+(?:\.\d+){3}$/.test(host))
        return 'Invalid IPv4 address: each octet must be a number between 0 and 255 (e.g. 192.168.1.1)'
      return 'Enter a valid IPv4 address (e.g. 192.168.1.1) or domain (e.g. aaa.sabawave.net)'
    }
    case 'companyId': {
      if (!data.companyId)
        return 'Company is required for a switch'
      return undefined
    }
    case 'username': {
      const username = data.username?.trim()
      if (!username)
        return 'Username is required'
      if (username.length > 64)
        return `Username must be 64 characters or less (currently ${username.length})`
      return undefined
    }
    case 'password': {
      const password = data.password
      if (!password)
        return 'Password is required'
      return undefined
    }
    case 'macAddress': {
      const mac = data.macAddress?.trim()
      if (!mac)
        return undefined
      if (!/^(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i.test(mac))
        return 'MAC must be in format 00:11:22:33:44:55 (six pairs of hex digits separated by : or -)'
      return undefined
    }
    case 'portCount': {
      const portCount = data.portCount
      if (portCount == null || (portCount as unknown) === '')
        return undefined
      if (!Number.isInteger(Number(portCount)))
        return 'Port count must be a whole number'
      if (Number(portCount) < 1 || Number(portCount) > 1024)
        return 'Port count must be between 1 and 1024'
      return undefined
    }
    case 'apiPort':
    case 'sshPort': {
      const port = data[field]
      if (port == null || (port as unknown) === '')
        return undefined
      if (!Number.isInteger(Number(port)))
        return `${field === 'apiPort' ? 'API' : 'SSH'} port must be a whole number`
      if (Number(port) < PORT_MIN || Number(port) > PORT_MAX)
        return `${field === 'apiPort' ? 'API' : 'SSH'} port must be between ${PORT_MIN} and ${PORT_MAX}`
      return undefined
    }
    default:
      return undefined
  }
}

export function validateSwitchForm(data: Partial<CreateSwitchInput>): SwitchFormErrors {
  const errors: SwitchFormErrors = {}
  const fields: (keyof CreateSwitchInput)[] = ['name', 'ipAddress', 'companyId', 'username', 'password', 'macAddress', 'portCount', 'apiPort', 'sshPort']
  for (const field of fields) {
    const error = validateSwitchField(field, data)
    if (error)
      errors[field] = error
  }
  return errors
}
