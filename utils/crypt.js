import { createCipheriv, createDecipheriv } from 'crypto'

const algorithm = 'aes-256-gcm'

function encrypt(text) {
  let cipher = createCipheriv(
    algorithm,
    process.env.CRYPTO_PASSWORD,
    process.env.CRYPTO_IV
  )
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return encrypted
}

function decrypt(encrypted) {
  let decipher = createDecipheriv(
    algorithm,
    process.env.CRYPTO_PASSWORD,
    process.env.CRYPTO_IV
  )
  let dec = decipher.update(encrypted, 'hex', 'utf8')

  return dec
}

export { encrypt, decrypt }
