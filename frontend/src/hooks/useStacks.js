import { useState, useEffect } from 'react'
import { AppConfig, UserSession, showConnect, openContractCall } from '@stacks/connect'
// Network will be configured in the connect options
import { stringUtf8CV, stringAsciiCV, uintCV, boolCV, principalCV, someCV, noneCV } from '@stacks/transactions'

export const useStacks = () => {
  const [userData, setUserData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const appConfig = new AppConfig(['store_write', 'publish_data'])
  const userSession = new UserSession({ appConfig })
  // Network configuration will be handled by Stacks Connect
  
  const appDetails = {
    name: 'Decentralized File Sharing',
    icon: 'https://freesvg.org/img/1541103084.png',
  }

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData)
        setIsLoading(false)
      })
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData())
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [])

  const connectWallet = () => {
    showConnect({
      appDetails,
      onFinish: () => window.location.reload(),
      userSession,
    })
  }

  const registerFile = async (fileName, fileSize, fileHash, gaiaUrl, encryptionKeyHash, isPublic) => {
    const options = {
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Replace with actual contract address
      contractName: 'file-registry',
      functionName: 'register-file',
      functionArgs: [
        stringUtf8CV(fileName),
        uintCV(fileSize),
        stringAsciiCV(fileHash),
        stringUtf8CV(gaiaUrl),
        stringAsciiCV(encryptionKeyHash),
        boolCV(isPublic)
      ],
      // network will be auto-detected by wallet
      appDetails,
    }

    return openContractCall(options)
  }

  const grantFileAccess = async (fileId, user, accessType, expiresAt) => {
    const options = {
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Replace with actual contract address
      contractName: 'file-access-control',
      functionName: 'grant-file-access',
      functionArgs: [
        stringAsciiCV(fileId),
        principalCV(user),
        stringAsciiCV(accessType),
        expiresAt ? someCV(uintCV(expiresAt)) : noneCV()
      ],
      // network will be auto-detected by wallet
      appDetails,
    }

    return openContractCall(options)
  }

  const revokeFileAccess = async (fileId, user) => {
    const options = {
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Replace with actual contract address
      contractName: 'file-access-control',
      functionName: 'revoke-file-access',
      functionArgs: [
        stringAsciiCV(fileId),
        principalCV(user)
      ],
      // network will be auto-detected by wallet
      appDetails,
    }

    return openContractCall(options)
  }

  return {
    userData,
    userSession,
    isLoading,
    connectWallet,
    registerFile,
    grantFileAccess,
    revokeFileAccess,

    appDetails
  }
}
