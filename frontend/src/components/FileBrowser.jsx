import { useState } from 'react'
import { downloadFromGaia } from '../utils/gaia'
import { decryptFile } from '../utils/encryption'

const FileBrowser = ({ files, userSession, onDeleteFile, onShareFile }) => {
  const [downloading, setDownloading] = useState({})

  const handleDownload = async (file) => {
    setDownloading(prev => ({ ...prev, [file.id]: true }))
    
    try {
      // Get encryption key from local storage
      const encryptionKey = localStorage.getItem(`encryption-key-${file.txId}`)
      if (!encryptionKey) {
        throw new Error('Encryption key not found')
      }

      // Download encrypted file from Gaia
      const encryptedData = await downloadFromGaia(userSession, file.gaiaUrl)
      
      // Decrypt file
      const decryptedData = decryptFile(encryptedData, encryptionKey)
      
      // Create download link
      const blob = new Blob([decryptedData], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Error downloading file: ' + error.message)
    } finally {
      setDownloading(prev => ({ ...prev, [file.id]: false }))
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Your Files</h2>
      
      {files.length === 0 ? (
        <p className="text-gray-500">No files uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{file.fileName}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    <span>Size: {formatFileSize(file.fileSize)}</span>
                    <span className="mx-2">•</span>
                    <span>Uploaded: {formatDate(file.createdAt)}</span>
                    <span className="mx-2">•</span>
                    <span className={file.isPublic ? 'text-green-600' : 'text-orange-600'}>
                      {file.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading[file.id]}
                    className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 text-sm font-medium"
                  >
                    {downloading[file.id] ? 'Downloading...' : 'Download'}
                  </button>
                  
                  <button
                    onClick={() => onShareFile(file)}
                    className="text-green-500 hover:text-green-700 text-sm font-medium"
                  >
                    Share
                  </button>
                  
                  <button
                    onClick={() => onDeleteFile(file)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-400">
                File ID: {file.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileBrowser
