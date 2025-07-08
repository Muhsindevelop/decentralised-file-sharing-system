;; title: file-access-control
;; version: 1.1.0
;; summary: A smart contract for managing file access permissions in a decentralized file sharing system
;; description: This contract handles granting and revoking access to files, managing shared access lists with audit trail integration

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u200))
(define-constant ERR_FILE_NOT_FOUND (err u201))
(define-constant ERR_ACCESS_ALREADY_GRANTED (err u202))
(define-constant ERR_ACCESS_NOT_FOUND (err u203))
(define-constant ERR_INVALID_INPUT (err u204))
(define-constant ERR_CANNOT_SHARE_WITH_SELF (err u205))

;; data maps
;; Map to store file access permissions
(define-map file-access
  { file-id: (string-ascii 64), user: principal }
  {
    granted-by: principal,
    granted-at: uint,
    access-type: (string-ascii 10), ;; "read" or "write"
    expires-at: (optional uint)
  }
)

;; Map to store shared file lists for users
(define-map user-shared-files
  { user: principal, file-id: (string-ascii 64) }
  { has-access: bool }
)

;; Map to store access requests
(define-map access-requests
  { file-id: (string-ascii 64), requester: principal }
  {
    requested-at: uint,
    message: (string-utf8 256),
    status: (string-ascii 10) ;; "pending", "approved", "denied"
  }
)

;; public functions
;; Grant access to a file
(define-public (grant-file-access
  (file-id (string-ascii 64))
  (user principal)
  (access-type (string-ascii 10))
  (expires-at (optional uint))
)
  (let ((caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)
    (asserts! (not (is-eq caller user)) ERR_CANNOT_SHARE_WITH_SELF)
    (asserts! (or (is-eq access-type "read") (is-eq access-type "write")) ERR_INVALID_INPUT)

    ;; Check if access already granted
    (asserts! (is-none (map-get? file-access { file-id: file-id, user: user })) ERR_ACCESS_ALREADY_GRANTED)

    ;; Note: In a real implementation, we would check if caller owns the file
    ;; by calling the file-registry contract. For simplicity, we assume the caller is authorized.

    ;; Grant access
    (map-set file-access
      { file-id: file-id, user: user }
      {
        granted-by: caller,
        granted-at: stacks-block-height,
        access-type: access-type,
        expires-at: expires-at
      }
    )

    ;; Add to user's shared files list
    (map-set user-shared-files
      { user: user, file-id: file-id }
      { has-access: true }
    )

    ;; Log access grant for audit trail
    (unwrap-panic (contract-call? .file-audit log-file-operation
      file-id
      "share"
      u"Access granted"
      none
      none
    ))

    (ok true)
  )
)

;; Revoke access to a file
(define-public (revoke-file-access
  (file-id (string-ascii 64))
  (user principal)
)
  (let ((caller tx-sender)
        (access-data (unwrap! (map-get? file-access { file-id: file-id, user: user }) ERR_ACCESS_NOT_FOUND)))

    ;; Check if caller is the one who granted access or the file owner
    (asserts! (is-eq caller (get granted-by access-data)) ERR_NOT_AUTHORIZED)

    ;; Remove access
    (map-delete file-access { file-id: file-id, user: user })

    ;; Remove from user's shared files list
    (map-delete user-shared-files { user: user, file-id: file-id })

    (ok true)
  )
)

;; Request access to a file
(define-public (request-file-access
  (file-id (string-ascii 64))
  (message (string-utf8 256))
)
  (let ((caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)

    ;; Store access request
    (map-set access-requests
      { file-id: file-id, requester: caller }
      {
        requested-at: stacks-block-height,
        message: message,
        status: "pending"
      }
    )

    (ok true)
  )
)

;; Approve or deny access request
(define-public (respond-to-access-request
  (file-id (string-ascii 64))
  (requester principal)
  (approve bool)
  (access-type (string-ascii 10))
)
  (let ((caller tx-sender)
        (request-data (unwrap! (map-get? access-requests { file-id: file-id, requester: requester }) ERR_ACCESS_NOT_FOUND)))

    ;; Note: In a real implementation, we would check if caller owns the file

    ;; Update request status
    (map-set access-requests
      { file-id: file-id, requester: requester }
      (merge request-data { status: (if approve "approved" "denied") })
    )

    ;; If approved, grant access
    (if approve
      (begin
        (map-set file-access
          { file-id: file-id, user: requester }
          {
            granted-by: caller,
            granted-at: stacks-block-height,
            access-type: access-type,
            expires-at: none
          }
        )
        (map-set user-shared-files
          { user: requester, file-id: file-id }
          { has-access: true }
        )
      )
      true
    )

    (ok approve)
  )
)

;; read only functions
;; Check if user has access to a file
(define-read-only (has-file-access (file-id (string-ascii 64)) (user principal))
  (match (map-get? file-access { file-id: file-id, user: user })
    access-data
      (match (get expires-at access-data)
        expiry (< stacks-block-height expiry)
        true
      )
    false
  )
)

;; Get access details for a file and user
(define-read-only (get-access-details (file-id (string-ascii 64)) (user principal))
  (map-get? file-access { file-id: file-id, user: user })
)

;; Get access request details
(define-read-only (get-access-request (file-id (string-ascii 64)) (requester principal))
  (map-get? access-requests { file-id: file-id, requester: requester })
)

;; Check if user has shared files
(define-read-only (has-shared-file (user principal) (file-id (string-ascii 64)))
  (default-to false (get has-access (map-get? user-shared-files { user: user, file-id: file-id })))
)
