import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Pastikan Anda menambahkan ENCRYPTION_KEY di file .env
// Key harus 32 karakter untuk algoritma aes-256-cbc
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'kunci_rahasia_32_karakter_wajib_diganti!!'
const IV_LENGTH = 16 // Untuk AES, ini selalu 16

/**
 * Mengenkripsi text (misal: 2FA Secret)
 */
export function encrypt(text: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])

    // Format simpan: iv:content (agar bisa didekripsi nanti)
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

/**
 * Mendekripsi text dari database
 */
export function decrypt(text: string): string {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')

    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString()
}