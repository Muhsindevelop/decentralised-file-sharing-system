import { Storage } from '@stacks/storage'

export const uploadToGaia = async (userSession, data, fileName) => {
  try {
    const storage = new Storage({ userSession })
    const filePath = `files/${Date.now()}-${fileName}`
    
    await storage.putFile(filePath, data, {
      encrypt: false, // We handle encryption ourselves
    })
    
    const userData = userSession.loadUserData()
    return `${userData.hubUrl}${filePath}`
  } catch (error) {
    console.error('Error uploading to Gaia:', error)
    throw error
  }
}

export const downloadFromGaia = async (userSession, filePath) => {
  try {
    const storage = new Storage({ userSession })
    const data = await storage.getFile(filePath, {
      decrypt: false,
    })
    return data
  } catch (error) {
    console.error('Error downloading from Gaia:', error)
    throw error
  }
}

export const deleteFromGaia = async (userSession, filePath) => {
  try {
    const storage = new Storage({ userSession })
    await storage.deleteFile(filePath)
    return true
  } catch (error) {
    console.error('Error deleting from Gaia:', error)
    throw error
  }
}
