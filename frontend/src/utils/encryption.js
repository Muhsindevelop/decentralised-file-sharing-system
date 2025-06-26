import CryptoJS from 'crypto-js'

export const generateEncryptionKey = () => {
  return CryptoJS.lib.WordArray.random(256/8).toString()
}

export const encryptFile = (file, password) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const encrypted = CryptoJS.AES.encrypt(e.target.result, password).toString()
        resolve(encrypted)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const decryptFile = (encryptedData, password) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, password)
    return decrypted.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    throw new Error('Failed to decrypt file')
  }
}

export const generateFileHash = (data) => {
  return CryptoJS.SHA256(data).toString()
}

export const generateKeyHash = (key) => {
  return CryptoJS.SHA256(key).toString()
}
