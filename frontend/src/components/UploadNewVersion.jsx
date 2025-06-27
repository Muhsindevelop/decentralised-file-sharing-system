import { useState } from 'react'
import { encryptFile, generateEncryptionKey, generateFileHash, generateKeyHash } from '../utils/encryption'
import { uploadToGaia } from '../utils/gaia'

const UploadNewVersion = ({ file, userSession, onVersionUploaded, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (event) => {
    const newFile = event.target.files[0]
    if (newFile) {
      setSelectedFile(newFile)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !versionNotes.trim()) {
      alert('Please select a file and provide version notes')
      return
    }

    setUploading(true)
    try {
      // Generate encryption key
      const encryptionKey = generateEncryptionKey()
      
      // Encrypt file
      const encryptedData = await encryptFile(selectedFile, encryptionKey)
      
      // Upload to Gaia
      const gaiaUrl = await uploadToGaia(userSession, encryptedData, `${file.fileName}-v${file.currentVersion + 1}`)
      
      // Generate hashes
      const fileHash = generateFileHash(encryptedData)
      const encryptionKeyHash = generateKeyHash(encryptionKey)

      // Call parent callback with new version data
      await onVersionUploaded({
        fileId: file.id,
        fileSize: selectedFile.size,
        fileHash,
        gaiaUrl,
        encryptionKeyHash,
        versionNotes: versionNotes.trim(),
        encryptionKey
      })

      onClose()
    } catch (error) {
      console.error('Error uploading new version:', error)
      alert('Error uploading new version: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Upload New Version</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{file.fileName}</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Current Version:</span> {file.currentVersion}
                </div>
                <div>
                  <span className="font-medium">Total Versions:</span> {file.totalVersions}
                </div>
                <div>
                  <span className="font-medium">Current Size:</span> {formatFileSize(file.fileSize)}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(file.createdAt * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New File Version
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Selected: {selectedFile.name}</p>
                  <p>Size: {formatFileSize(selectedFile.size)}</p>
                  {selectedFile.size > file.fileSize && (
                    <p className="text-orange-600">⚠️ New file is larger than current version</p>
                  )}
                  {selectedFile.size < file.fileSize && (
                    <p className="text-green-600">✓ New file is smaller than current version</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Describe the changes, bug fixes, or improvements in this version
              </p>
            </div>

            {selectedFile && versionNotes.trim() && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Version Summary</h4>
                <div className="text-sm text-blue-800">
                  <p><strong>New Version:</strong> {file.currentVersion + 1}</p>
                  <p><strong>File:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                  <p><strong>Notes:</strong> {versionNotes.trim()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !versionNotes.trim() || uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload New Version'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadNewVersion
