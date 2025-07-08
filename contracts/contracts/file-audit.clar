;; title: file-audit
;; version: 1.0.0
;; summary: A smart contract for file integrity verification and audit trail management
;; description: This contract provides immutable audit logging for all file operations and integrity verification

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_INVALID_INPUT (err u301))
(define-constant ERR_AUDIT_NOT_FOUND (err u302))
(define-constant ERR_INTEGRITY_VIOLATION (err u303))

;; data vars
(define-data-var audit-counter uint u0)

;; data maps
;; Audit log for all file operations
(define-map audit-log
  { audit-id: uint }
  {
    file-id: (string-ascii 64),
    operation: (string-ascii 20), ;; "upload", "access", "share", "delete", "modify"
    actor: principal,
    timestamp: uint,
    block-height: uint,
    metadata: (string-utf8 256),
    file-hash-before: (optional (string-ascii 64)),
    file-hash-after: (optional (string-ascii 64))
  }
)

;; File integrity tracking
(define-map file-integrity
  { file-id: (string-ascii 64) }
  {
    original-hash: (string-ascii 64),
    current-hash: (string-ascii 64),
    last-verified: uint,
    verification-count: uint,
    integrity-status: (string-ascii 10) ;; "verified", "tampered", "unknown"
  }
)

;; User audit summary
(define-map user-audit-summary
  { user: principal }
  {
    total-operations: uint,
    last-activity: uint,
    files-uploaded: uint,
    files-accessed: uint,
    files-shared: uint
  }
)

;; File operation history index
(define-map file-operations
  { file-id: (string-ascii 64), operation-index: uint }
  { audit-id: uint }
)

;; private functions
(define-private (generate-audit-id)
  (let ((counter (var-get audit-counter)))
    (var-set audit-counter (+ counter u1))
    counter
  )
)

(define-private (update-user-summary (user principal) (operation (string-ascii 20)))
  (let ((current-summary (default-to 
                          { total-operations: u0, last-activity: u0, files-uploaded: u0, files-accessed: u0, files-shared: u0 }
                          (map-get? user-audit-summary { user: user }))))
    (map-set user-audit-summary
      { user: user }
      {
        total-operations: (+ (get total-operations current-summary) u1),
        last-activity: stacks-block-height,
        files-uploaded: (if (is-eq operation "upload") 
                          (+ (get files-uploaded current-summary) u1) 
                          (get files-uploaded current-summary)),
        files-accessed: (if (is-eq operation "access") 
                          (+ (get files-accessed current-summary) u1) 
                          (get files-accessed current-summary)),
        files-shared: (if (is-eq operation "share") 
                        (+ (get files-shared current-summary) u1) 
                        (get files-shared current-summary))
      }
    )
  )
)

;; public functions
;; Log a file operation
(define-public (log-file-operation
  (file-id (string-ascii 64))
  (operation (string-ascii 20))
  (metadata (string-utf8 256))
  (file-hash-before (optional (string-ascii 64)))
  (file-hash-after (optional (string-ascii 64)))
)
  (let ((audit-id (generate-audit-id))
        (caller tx-sender))
    
    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)
    (asserts! (> (len operation) u0) ERR_INVALID_INPUT)
    
    ;; Create audit log entry
    (map-set audit-log
      { audit-id: audit-id }
      {
        file-id: file-id,
        operation: operation,
        actor: caller,
        timestamp: stacks-block-height,
        block-height: stacks-block-height,
        metadata: metadata,
        file-hash-before: file-hash-before,
        file-hash-after: file-hash-after
      }
    )
    
    ;; Update user summary
    (update-user-summary caller operation)
    
    ;; Update file integrity if hash provided
    (match file-hash-after
      new-hash (begin (unwrap-panic (update-file-integrity file-id new-hash)) true)
      true
    )
    
    (ok audit-id)
  )
)

;; Initialize or update file integrity tracking
(define-public (update-file-integrity (file-id (string-ascii 64)) (current-hash (string-ascii 64)))
  (let ((existing-integrity (map-get? file-integrity { file-id: file-id })))
    (match existing-integrity
      integrity-data
        ;; Update existing integrity record
        (let ((status (if (is-eq (get original-hash integrity-data) current-hash) "verified" "tampered")))
          (map-set file-integrity
            { file-id: file-id }
            {
              original-hash: (get original-hash integrity-data),
              current-hash: current-hash,
              last-verified: stacks-block-height,
              verification-count: (+ (get verification-count integrity-data) u1),
              integrity-status: status
            }
          )
          (ok status)
        )
      ;; Create new integrity record
      (begin
        (map-set file-integrity
          { file-id: file-id }
          {
            original-hash: current-hash,
            current-hash: current-hash,
            last-verified: stacks-block-height,
            verification-count: u1,
            integrity-status: "verified"
          }
        )
        (ok "verified")
      )
    )
  )
)

;; Verify file integrity
(define-public (verify-file-integrity (file-id (string-ascii 64)) (provided-hash (string-ascii 64)))
  (let ((integrity-data (unwrap! (map-get? file-integrity { file-id: file-id }) ERR_AUDIT_NOT_FOUND)))
    (let ((is-valid (is-eq (get original-hash integrity-data) provided-hash))
          (status (if is-valid "verified" "tampered")))
      
      ;; Update integrity record
      (map-set file-integrity
        { file-id: file-id }
        (merge integrity-data {
          current-hash: provided-hash,
          last-verified: stacks-block-height,
          verification-count: (+ (get verification-count integrity-data) u1),
          integrity-status: status
        })
      )
      
      ;; Log verification attempt
      (unwrap-panic (log-file-operation 
        file-id 
        "verify" 
        (if is-valid u"Integrity verification passed" u"Integrity verification failed")
        (some (get current-hash integrity-data))
        (some provided-hash)
      ))
      
      (if is-valid
        (ok true)
        ERR_INTEGRITY_VIOLATION
      )
    )
  )
)

;; read only functions
;; Get audit log entry
(define-read-only (get-audit-entry (audit-id uint))
  (map-get? audit-log { audit-id: audit-id })
)

;; Get file integrity status
(define-read-only (get-file-integrity (file-id (string-ascii 64)))
  (map-get? file-integrity { file-id: file-id })
)

;; Get user audit summary
(define-read-only (get-user-audit-summary (user principal))
  (map-get? user-audit-summary { user: user })
)

;; Get audit trail for a file (returns list of audit IDs)
(define-read-only (get-file-audit-trail (file-id (string-ascii 64)) (limit uint))
  (let ((current-counter (var-get audit-counter)))
    ;; In a real implementation, we would iterate through audit logs
    ;; For simplicity, returning the current counter
    (ok current-counter)
  )
)

;; Check if file has been tampered with
(define-read-only (is-file-tampered (file-id (string-ascii 64)))
  (match (map-get? file-integrity { file-id: file-id })
    integrity-data (is-eq (get integrity-status integrity-data) "tampered")
    false
  )
)

;; Get current audit counter
(define-read-only (get-audit-counter)
  (var-get audit-counter)
)

;; Get system-wide audit statistics
(define-read-only (get-audit-statistics)
  {
    total-audits: (var-get audit-counter),
    current-block: stacks-block-height
  }
)
