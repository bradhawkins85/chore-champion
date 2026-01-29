import { BiometricCredential } from './types'

export interface BiometricSupport {
  available: boolean
  platformAuthenticator: boolean
  conditionalMediation: boolean
}

export async function checkBiometricSupport(): Promise<BiometricSupport> {
  if (!window.PublicKeyCredential) {
    return {
      available: false,
      platformAuthenticator: false,
      conditionalMediation: false,
    }
  }

  try {
    const [platformAuthenticator, conditionalMediation] = await Promise.all([
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
      PublicKeyCredential.isConditionalMediationAvailable?.() ?? Promise.resolve(false),
    ])

    return {
      available: platformAuthenticator,
      platformAuthenticator,
      conditionalMediation,
    }
  } catch {
    return {
      available: false,
      platformAuthenticator: false,
      conditionalMediation: false,
    }
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function registerBiometric(
  credentialName: string
): Promise<BiometricCredential> {
  const support = await checkBiometricSupport()
  if (!support.available) {
    throw new Error('Biometric authentication is not available on this device')
  }

  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'ChoreQuest',
      id: window.location.hostname,
    },
    user: {
      id: new Uint8Array(16),
      name: 'parent',
      displayName: 'Parent',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Failed to create credential')
    }

    const response = credential.response as AuthenticatorAttestationResponse
    const publicKeyBase64 = arrayBufferToBase64(response.getPublicKey()!)
    const credentialIdBase64 = arrayBufferToBase64(credential.rawId)

    return {
      id: credentialIdBase64,
      publicKey: publicKeyBase64,
      counter: 0,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      name: credentialName,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric registration was cancelled')
      }
      throw new Error(`Biometric registration failed: ${error.message}`)
    }
    throw new Error('Biometric registration failed')
  }
}

export async function authenticateWithBiometric(
  credentials: BiometricCredential[]
): Promise<string> {
  const support = await checkBiometricSupport()
  if (!support.available) {
    throw new Error('Biometric authentication is not available on this device')
  }

  if (credentials.length === 0) {
    throw new Error('No biometric credentials registered')
  }

  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)

  const allowCredentials = credentials.map((cred) => ({
    id: base64ToArrayBuffer(cred.id),
    type: 'public-key' as const,
    transports: ['internal'] as AuthenticatorTransport[],
  }))

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials,
    timeout: 60000,
    userVerification: 'required',
    rpId: window.location.hostname,
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential

    if (!assertion) {
      throw new Error('Authentication failed')
    }

    const credentialIdBase64 = arrayBufferToBase64(assertion.rawId)
    return credentialIdBase64
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric authentication was cancelled')
      }
      throw new Error(`Biometric authentication failed: ${error.message}`)
    }
    throw new Error('Biometric authentication failed')
  }
}

export function getBiometricDisplayName(platform: string = navigator.platform): string {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'Face ID or Touch ID'
  } else if (/android/.test(userAgent)) {
    return 'Fingerprint or Face Unlock'
  } else if (/mac/.test(platform.toLowerCase())) {
    return 'Touch ID'
  } else if (/win/.test(platform.toLowerCase())) {
    return 'Windows Hello'
  }
  
  return 'Biometric Authentication'
}
