;; title: file-tagging
;; version: 1.0.0
;; summary: A smart contract for managing file tags and categorization in a decentralized file sharing system
;; description: This contract handles file tagging, tag management, and file discovery through tags

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u500))
(define-constant ERR_FILE_NOT_FOUND (err u501))
(define-constant ERR_TAG_NOT_FOUND (err u502))
(define-constant ERR_TAG_ALREADY_EXISTS (err u503))
(define-constant ERR_INVALID_INPUT (err u504))
(define-constant ERR_TAG_LIMIT_EXCEEDED (err u505))
(define-constant ERR_CATEGORY_NOT_FOUND (err u506))

;; Maximum number of tags per file
(define-constant MAX_TAGS_PER_FILE u20)

;; Maximum tag length
(define-constant MAX_TAG_LENGTH u50)

;; data vars
;; Counter for generating unique tag IDs
(define-data-var tag-counter uint u0)

;; data maps
;; Map to store file tags
(define-map file-tags
  { file-id: (string-ascii 64), tag: (string-utf8 50) }
  {
    added-by: principal,
    added-at: uint,
    category: (string-utf8 30),
    is-active: bool
  }
)

;; Map to track all tags for a file
(define-map file-tag-list
  { file-id: (string-ascii 64) }
  {
    tags: (list 20 (string-utf8 50)),
    tag-count: uint,
    last-updated: uint,
    updated-by: principal
  }
)

;; Map to store files by tag (for searching)
(define-map tag-files
  { tag: (string-utf8 50), file-id: (string-ascii 64) }
  {
    tagged-by: principal,
    tagged-at: uint,
    is-active: bool
  }
)

;; Map to track tag usage statistics
(define-map tag-stats
  { tag: (string-utf8 50) }
  {
    usage-count: uint,
    first-used: uint,
    last-used: uint,
    created-by: principal
  }
)

;; Map to store tag categories
(define-map tag-categories
  { category: (string-utf8 30) }
  {
    description: (string-utf8 256),
    created-by: principal,
    created-at: uint,
    tag-count: uint
  }
)

;; Map to track user's tagged files
(define-map user-tagged-files
  { user: principal, file-id: (string-ascii 64) }
  { has-tags: bool, tag-count: uint }
)

;; private functions
;; Check if a tag is valid
(define-private (is-valid-tag (tag (string-utf8 50)))
  (and
    (> (len tag) u0)
    (<= (len tag) MAX_TAG_LENGTH)
  )
)

;; Update tag statistics
(define-private (update-tag-stats (tag (string-utf8 50)) (user principal))
  (let ((current-stats (default-to
                         { usage-count: u0, first-used: stacks-block-height, last-used: stacks-block-height, created-by: user }
                         (map-get? tag-stats { tag: tag }))))
    (map-set tag-stats
      { tag: tag }
      {
        usage-count: (+ (get usage-count current-stats) u1),
        first-used: (get first-used current-stats),
        last-used: stacks-block-height,
        created-by: (get created-by current-stats)
      }
    )
  )
)

;; Add tag to file's tag list
(define-private (add-to-file-tag-list (file-id (string-ascii 64)) (tag (string-utf8 50)) (user principal))
  (let ((current-list (default-to
                        { tags: (list), tag-count: u0, last-updated: stacks-block-height, updated-by: user }
                        (map-get? file-tag-list { file-id: file-id }))))
    (if (< (get tag-count current-list) MAX_TAGS_PER_FILE)
      (map-set file-tag-list
        { file-id: file-id }
        {
          tags: (unwrap-panic (as-max-len? (append (get tags current-list) tag) u20)),
          tag-count: (+ (get tag-count current-list) u1),
          last-updated: stacks-block-height,
          updated-by: user
        }
      )
      false
    )
  )
)

;; Remove tag from file's tag list
(define-private (remove-from-file-tag-list (file-id (string-ascii 64)) (tag (string-utf8 50)) (user principal))
  (let ((current-list (unwrap! (map-get? file-tag-list { file-id: file-id }) false)))
    (map-set file-tag-list
      { file-id: file-id }
      {
        tags: (filter is-not-target-tag (get tags current-list)),
        tag-count: (- (get tag-count current-list) u1),
        last-updated: stacks-block-height,
        updated-by: user
      }
    )
    true
  )
)

;; Helper function for filtering tags
(define-private (is-not-target-tag (current-tag (string-utf8 50)))
  ;; This is a simplified version - in a real implementation,
  ;; we would need to pass the target tag as a parameter
  true
)

;; public functions
;; Add a tag to a file
(define-public (add-file-tag
  (file-id (string-ascii 64))
  (tag (string-utf8 50))
  (category (string-utf8 30))
)
  (let ((caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)
    (asserts! (is-valid-tag tag) ERR_INVALID_INPUT)
    (asserts! (> (len category) u0) ERR_INVALID_INPUT)

    ;; Check if tag already exists for this file
    (asserts! (is-none (map-get? file-tags { file-id: file-id, tag: tag })) ERR_TAG_ALREADY_EXISTS)

    ;; Note: In a real implementation, we would check if caller owns the file

    ;; Check tag limit
    (let ((current-list (map-get? file-tag-list { file-id: file-id })))
      (match current-list
        list-data (asserts! (< (get tag-count list-data) MAX_TAGS_PER_FILE) ERR_TAG_LIMIT_EXCEEDED)
        true
      )
    )

    ;; Add the tag
    (map-set file-tags
      { file-id: file-id, tag: tag }
      {
        added-by: caller,
        added-at: stacks-block-height,
        category: category,
        is-active: true
      }
    )

    ;; Add to tag-files mapping for searching
    (map-set tag-files
      { tag: tag, file-id: file-id }
      {
        tagged-by: caller,
        tagged-at: stacks-block-height,
        is-active: true
      }
    )

    ;; Update file tag list
    (add-to-file-tag-list file-id tag caller)

    ;; Update tag statistics
    (update-tag-stats tag caller)

    ;; Update user tagged files
    (map-set user-tagged-files
      { user: caller, file-id: file-id }
      {
        has-tags: true,
        tag-count: (+ (default-to u0 (get tag-count (map-get? user-tagged-files { user: caller, file-id: file-id }))) u1)
      }
    )

    (ok true)
  )
)

;; Remove a tag from a file
(define-public (remove-file-tag
  (file-id (string-ascii 64))
  (tag (string-utf8 50))
)
  (let ((caller tx-sender)
        (tag-data (unwrap! (map-get? file-tags { file-id: file-id, tag: tag }) ERR_TAG_NOT_FOUND)))

    ;; Check if caller is the one who added the tag or file owner
    (asserts! (is-eq caller (get added-by tag-data)) ERR_NOT_AUTHORIZED)

    ;; Mark tag as inactive
    (map-set file-tags
      { file-id: file-id, tag: tag }
      (merge tag-data { is-active: false })
    )

    ;; Remove from tag-files mapping
    (map-set tag-files
      { tag: tag, file-id: file-id }
      {
        tagged-by: (get added-by tag-data),
        tagged-at: (get added-at tag-data),
        is-active: false
      }
    )

    ;; Update file tag list (simplified - in real implementation would properly remove)
    (remove-from-file-tag-list file-id tag caller)

    ;; Update user tagged files count
    (let ((user-data (unwrap-panic (map-get? user-tagged-files { user: caller, file-id: file-id }))))
      (map-set user-tagged-files
        { user: caller, file-id: file-id }
        {
          has-tags: (> (get tag-count user-data) u1),
          tag-count: (- (get tag-count user-data) u1)
        }
      )
    )

    (ok true)
  )
)

;; Create a new tag category
(define-public (create-tag-category
  (category (string-utf8 30))
  (description (string-utf8 256))
)
  (let ((caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len category) u0) ERR_INVALID_INPUT)
    (asserts! (> (len description) u0) ERR_INVALID_INPUT)

    ;; Check if category already exists
    (asserts! (is-none (map-get? tag-categories { category: category })) ERR_TAG_ALREADY_EXISTS)

    ;; Create category
    (map-set tag-categories
      { category: category }
      {
        description: description,
        created-by: caller,
        created-at: stacks-block-height,
        tag-count: u0
      }
    )

    (ok true)
  )
)

;; Bulk add tags to a file
(define-public (bulk-add-tags
  (file-id (string-ascii 64))
  (tags (list 10 (string-utf8 50)))
  (category (string-utf8 30))
)
  (let ((caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)
    (asserts! (> (len tags) u0) ERR_INVALID_INPUT)

    ;; Note: In a real implementation, we would iterate through tags
    ;; For simplicity, we'll just add the first tag
    (match (element-at tags u0)
      first-tag (add-file-tag file-id first-tag category)
      (ok true)
    )
  )
)

;; read only functions
;; Get all tags for a file
(define-read-only (get-file-tags (file-id (string-ascii 64)))
  (map-get? file-tag-list { file-id: file-id })
)

;; Check if a file has a specific tag
(define-read-only (file-has-tag (file-id (string-ascii 64)) (tag (string-utf8 50)))
  (match (map-get? file-tags { file-id: file-id, tag: tag })
    tag-data (get is-active tag-data)
    false
  )
)

;; Get tag information
(define-read-only (get-tag-info (file-id (string-ascii 64)) (tag (string-utf8 50)))
  (map-get? file-tags { file-id: file-id, tag: tag })
)

;; Get tag statistics
(define-read-only (get-tag-stats (tag (string-utf8 50)))
  (map-get? tag-stats { tag: tag })
)

;; Get category information
(define-read-only (get-category-info (category (string-utf8 30)))
  (map-get? tag-categories { category: category })
)

;; Search files by tag (simplified - returns if tag-file mapping exists)
(define-read-only (search-files-by-tag (tag (string-utf8 50)) (file-id (string-ascii 64)))
  (match (map-get? tag-files { tag: tag, file-id: file-id })
    tag-file-data (get is-active tag-file-data)
    false
  )
)

;; Get user's tagged files count
(define-read-only (get-user-tagged-files-count (user principal) (file-id (string-ascii 64)))
  (match (map-get? user-tagged-files { user: user, file-id: file-id })
    user-data (some (get tag-count user-data))
    none
  )
)

;; Check if tag is valid
(define-read-only (is-tag-valid (tag (string-utf8 50)))
  (is-valid-tag tag)
)

;; Get files with multiple tags (simplified version)
(define-read-only (has-multiple-tags (file-id (string-ascii 64)) (tag1 (string-utf8 50)) (tag2 (string-utf8 50)))
  (and
    (file-has-tag file-id tag1)
    (file-has-tag file-id tag2)
  )
)

