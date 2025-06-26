import { useState } from 'react'
import { encryptFile, generateEncryptionKey, generateFileHash, generateKeyHash } from '../utils/encryption'
import { uploadToGaia } from '../utils/gaia'

const FileUpload = ({ userSession, onFileUploaded }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setFileName(file.name)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !fileName) return

    setUploading(true)
    try {
      // Generate encryption key
      const encryptionKey = generateEncryptionKey()
      
      // Encrypt file
      const encryptedData = await encryptFile(selectedFile, encryptionKey)
      
      // Upload to Gaia
      const gaiaUrl = await uploadToGaia(userSession, encryptedData, fileName)
      
      // Generate hashes
      const fileHash = generateFileHash(encryptedData)
      const encryptionKeyHash = generateKeyHash(encryptionKey)

      // Call parent callback with file data
      await onFileUploaded({
        fileName,
        fileSize: selectedFile.size,
        fileHash,
        gaiaUrl,
        encryptionKeyHash,
        isPublic,
        encryptionKey
      })

      // Reset form
      setSelectedFile(null)
      setFileName('')
      setIsPublic(false)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-semibold mb-4">Upload File</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <input
          type="file"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {selectedFile && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Name
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Make file public</span>
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded"
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  )
}

export default FileUpload
