import { useState } from 'react'
import { useStacks } from './hooks/useStacks'
import FileUpload from './components/FileUpload'
import FileBrowser from './components/FileBrowser'

function App() {
  const [files, setFiles] = useState([])
  const { userData, userSession, isLoading, connectWallet, registerFile, uploadNewVersion } = useStacks()

  const handleFileUploaded = async (fileData) => {
    try {
      const result = await registerFile(
        fileData.fileName,
        fileData.fileSize,
        fileData.fileHash,
        fileData.gaiaUrl,
        fileData.encryptionKeyHash,
        fileData.isPublic
      )

      // Store encryption key locally (in production, use secure key management)
      localStorage.setItem(`encryption-key-${result.txId}`, fileData.encryptionKey)

      // Add to local files list (in production, fetch from blockchain)
      const newFile = {
        id: result.txId,
        txId: result.txId,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileHash: fileData.fileHash,
        gaiaUrl: fileData.gaiaUrl,
        isPublic: fileData.isPublic,
        createdAt: Date.now() / 1000,
        currentVersion: 1,
        totalVersions: 1
      }

      setFiles(prev => [...prev, newFile])
    } catch (error) {
      console.error('Error registering file:', error)
      throw error
    }
  }

  const handleDeleteFile = async (file) => {
    if (window.confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      try {
        // In a real implementation, call the delete-file contract function
        console.log('Deleting file:', file.id)

        // Remove from local storage
        localStorage.removeItem(`encryption-key-${file.txId}`)

        // Remove from files list
        setFiles(prev => prev.filter(f => f.id !== file.id))
      } catch (error) {
        console.error('Error deleting file:', error)
        alert('Error deleting file: ' + error.message)
      }
    }
  }

  const handleShareFile = (file) => {
    // In a real implementation, open a modal to share the file
    const recipient = prompt('Enter the Stacks address to share with:')
    if (recipient) {
      console.log(`Sharing file ${file.fileName} with ${recipient}`)
      // Call grantFileAccess function
    }
  }

  const handleNewVersionUploaded = async (versionData) => {
    try {
      const result = await uploadNewVersion(
        versionData.fileId,
        versionData.fileSize,
        versionData.fileHash,
        versionData.gaiaUrl,
        versionData.encryptionKeyHash,
        versionData.versionNotes
      )

      // Store encryption key locally
      localStorage.setItem(`encryption-key-${result.txId}`, versionData.encryptionKey)

      // Update local files list
      setFiles(prev => prev.map(file =>
        file.id === versionData.fileId
          ? {
              ...file,
              fileSize: versionData.fileSize,
              fileHash: versionData.fileHash,
              gaiaUrl: versionData.gaiaUrl,
              currentVersion: file.currentVersion + 1,
              totalVersions: file.totalVersions + 1
            }
          : file
      ))

      console.log('New version uploaded successfully:', result)
    } catch (error) {
      console.error('Error uploading new version:', error)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Decentralized File Sharing
          </h1>
          <p className="text-gray-600">
            Secure file sharing powered by Stacks blockchain and Gaia storage
          </p>
        </header>

        {!userData ? (
          <div className="text-center">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-4">Welcome</h2>
              <p className="text-gray-600 mb-6">
                Connect your Stacks wallet to start sharing files securely on the blockchain.
              </p>
              <button
                onClick={connectWallet}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600">
                Connected as: <span className="font-mono text-blue-600">{userData.profile?.stxAddress?.mainnet}</span>
              </p>
            </div>

            <FileUpload
              userSession={userSession}
              onFileUploaded={handleFileUploaded}
            />

            <FileBrowser
              files={files}
              userSession={userSession}
              onDeleteFile={handleDeleteFile}
              onShareFile={handleShareFile}
              onNewVersionUploaded={handleNewVersionUploaded}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
