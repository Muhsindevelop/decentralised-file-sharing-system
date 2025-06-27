import { useState, useEffect } from 'react'
import { useStacks } from '../hooks/useStacks'

const FileVersions = ({ file, onClose, onVersionSelected }) => {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const { userSession } = useStacks()

  useEffect(() => {
    loadVersions()
  }, [file])

  const loadVersions = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would call the smart contract
      // For now, we'll simulate version data
      const mockVersions = [
        {
          version: 1,
          fileSize: file.fileSize,
          fileHash: file.fileHash,
          gaiaUrl: file.gaiaUrl,
          uploadedAt: file.createdAt,
          versionNotes: "Initial version",
          previousVersion: null
        }
      ]
      
      // Add mock additional versions if file has them
      if (file.totalVersions > 1) {
        for (let i = 2; i <= file.totalVersions; i++) {
          mockVersions.push({
            version: i,
            fileSize: file.fileSize + (i * 100),
            fileHash: `hash-v${i}`,
            gaiaUrl: `${file.gaiaUrl}-v${i}`,
            uploadedAt: file.createdAt + (i * 86400),
            versionNotes: `Version ${i} - Updates and improvements`,
            previousVersion: i - 1
          })
        }
      }
      
      setVersions(mockVersions.reverse()) // Show newest first
    } catch (error) {
      console.error('Error loading versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (version) => {
    if (window.confirm(`Are you sure you want to rollback to version ${version}?`)) {
      try {
        // In a real implementation, call the rollback-to-version contract function
        console.log(`Rolling back to version ${version}`)
        onVersionSelected(version)
        onClose()
      } catch (error) {
        console.error('Error rolling back:', error)
        alert('Error rolling back to version: ' + error.message)
      }
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString()
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900">{file.fileName}</h3>
            <p className="text-sm text-gray-500">
              Current Version: {file.currentVersion} | Total Versions: {file.totalVersions}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {versions.map((version) => (
                <div
                  key={version.version}
                  className={`border rounded-lg p-4 ${
                    version.version === file.currentVersion
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">
                          Version {version.version}
                        </h4>
                        {version.version === file.currentVersion && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Size:</strong> {formatFileSize(version.fileSize)}</p>
                        <p><strong>Uploaded:</strong> {formatDate(version.uploadedAt)}</p>
                        <p><strong>Hash:</strong> <code className="bg-gray-100 px-1 rounded">{version.fileHash}</code></p>
                        {version.versionNotes && (
                          <p><strong>Notes:</strong> {version.versionNotes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedVersion(version)}
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                      
                      {version.version !== file.currentVersion && (
                        <button
                          onClick={() => handleRollback(version.version)}
                          className="text-orange-500 hover:text-orange-700 text-sm font-medium"
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {version.previousVersion && (
                    <div className="mt-2 text-xs text-gray-500">
                      Previous version: {version.previousVersion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default FileVersions
