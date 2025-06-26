
;; title: file-registry
;; version: 1.0.0
;; summary: A smart contract for managing file metadata and ownership in a decentralized file sharing system
;; description: This contract handles file registration, ownership tracking, and basic file operations

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_FILE_NOT_FOUND (err u101))
(define-constant ERR_FILE_ALREADY_EXISTS (err u102))
(define-constant ERR_INVALID_INPUT (err u103))

;; data vars
;; Counter for generating unique file IDs
(define-data-var file-counter uint u0)

;; data maps
;; Map to store file metadata
(define-map files
  { file-id: (string-ascii 64) }
  {
    owner: principal,
    file-name: (string-utf8 256),
    file-size: uint,
    file-hash: (string-ascii 64),
    gaia-url: (string-utf8 512),
    encryption-key-hash: (string-ascii 64),
    created-at: uint,
    is-public: bool
  }
)

;; Map to track file ownership
(define-map user-files
  { user: principal, file-id: (string-ascii 64) }
  { exists: bool }
)

;; private functions
(define-private (generate-file-id)
  (let ((counter (var-get file-counter)))
    (var-set file-counter (+ counter u1))
    (int-to-ascii counter)
  )
)

;; public functions
;; Register a new file
(define-public (register-file
  (file-name (string-utf8 256))
  (file-size uint)
  (file-hash (string-ascii 64))
  (gaia-url (string-utf8 512))
  (encryption-key-hash (string-ascii 64))
  (is-public bool)
)
  (let ((file-id (generate-file-id))
        (caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len file-name) u0) ERR_INVALID_INPUT)
    (asserts! (> file-size u0) ERR_INVALID_INPUT)
    (asserts! (> (len file-hash) u0) ERR_INVALID_INPUT)
    (asserts! (> (len gaia-url) u0) ERR_INVALID_INPUT)

    ;; Check if file already exists
    (asserts! (is-none (map-get? files { file-id: file-id })) ERR_FILE_ALREADY_EXISTS)

    ;; Store file metadata
    (map-set files
      { file-id: file-id }
      {
        owner: caller,
        file-name: file-name,
        file-size: file-size,
        file-hash: file-hash,
        gaia-url: gaia-url,
        encryption-key-hash: encryption-key-hash,
        created-at: stacks-block-height,
        is-public: is-public
      }
    )

    ;; Track user ownership
    (map-set user-files
      { user: caller, file-id: file-id }
      { exists: true }
    )

    (ok file-id)
  )
)

;; Update file visibility
(define-public (update-file-visibility (file-id (string-ascii 64)) (is-public bool))
  (let ((file-data (unwrap! (map-get? files { file-id: file-id }) ERR_FILE_NOT_FOUND)))
    ;; Check if caller is the owner
    (asserts! (is-eq tx-sender (get owner file-data)) ERR_NOT_AUTHORIZED)

    ;; Update the file
    (map-set files
      { file-id: file-id }
      (merge file-data { is-public: is-public })
    )

    (ok true)
  )
)

;; Delete a file (only owner can delete)
(define-public (delete-file (file-id (string-ascii 64)))
  (let ((file-data (unwrap! (map-get? files { file-id: file-id }) ERR_FILE_NOT_FOUND)))
    ;; Check if caller is the owner
    (asserts! (is-eq tx-sender (get owner file-data)) ERR_NOT_AUTHORIZED)

    ;; Remove file metadata
    (map-delete files { file-id: file-id })

    ;; Remove from user files
    (map-delete user-files { user: tx-sender, file-id: file-id })

    (ok true)
  )
)

;; read only functions
;; Get file metadata
(define-read-only (get-file-info (file-id (string-ascii 64)))
  (map-get? files { file-id: file-id })
)

;; Check if user owns a file
(define-read-only (is-file-owner (user principal) (file-id (string-ascii 64)))
  (match (map-get? files { file-id: file-id })
    file-data (is-eq (get owner file-data) user)
    false
  )
)

;; Get file owner
(define-read-only (get-file-owner (file-id (string-ascii 64)))
  (match (map-get? files { file-id: file-id })
    file-data (some (get owner file-data))
    none
  )
)

;; Get current file counter
(define-read-only (get-file-counter)
  (var-get file-counter)
)
