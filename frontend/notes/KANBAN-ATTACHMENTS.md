# Kanban Attachments Feature

Fitur upload dan manage file attachments untuk tasks di Kanban board.

## Overview

Setiap task dapat memiliki multiple file attachments yang disimpan di Cloudflare R2 storage. Attachments hanya dapat di-upload dan manage melalui task edit modal (bukan saat create task).

## Features

### 1. Upload Attachment
- **Location**: Task Edit Modal > Attachments Section
- **Max File Size**: 50MB (dikonfigurasi di backend)
- **Supported Files**: All file types
- **Upload Progress**: Real-time progress bar saat upload
- **Storage**: Cloudflare R2 bucket

### 2. View Attachments List
Menampilkan semua attachments dengan informasi:
- File name
- File size (formatted: KB/MB/GB)
- File type icon (image vs file)
- Upload date & time

### 3. Download Attachment
- Click download button untuk download file
- Presigned URL valid selama 1 jam
- Browser auto-download dengan original filename

### 4. Delete Attachment
- Click trash icon untuk delete
- File dihapus dari R2 storage dan database
- Hanya uploader yang bisa delete

## UI Components

### Upload Section
```vue
<!-- File input + Upload button -->
<Input type="file" @change="handleFileSelect" />
<Button @click="uploadAttachment">Upload</Button>

<!-- Progress bar (shown during upload) -->
<div>{{ uploadProgress }}%</div>
<div class="progress-bar" :style="{ width: `${uploadProgress}%` }" />
```

### Attachments List
```vue
<div v-for="attachment in attachments">
  <!-- File icon (image/file) -->
  <Icon :name="isImage ? 'lucide:image' : 'lucide:file'" />

  <!-- File info -->
  <p>{{ fileName }}</p>
  <p>{{ formatFileSize(fileSize) }}</p>

  <!-- Actions -->
  <Button @click="download">Download</Button>
  <Button @click="delete">Delete</Button>
</div>
```

## Store Integration

### Kanban Attachment Store
Location: `frontend/app/stores/kanban-attachment.ts`

**State:**
```typescript
{
  attachments: TaskAttachment[]
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number  // 0-100
  error: string | null
}
```

**Actions:**
```typescript
// Fetch attachments for task
await attachmentStore.fetchTaskAttachments(taskId)

// Upload file
await attachmentStore.uploadAttachment(taskId, file)

// Download file
await attachmentStore.downloadAttachment(taskId, attachmentId)

// Delete attachment
await attachmentStore.deleteAttachment(taskId, attachmentId)
```

**Getters:**
```typescript
attachmentStore.attachmentCount        // Total count
attachmentStore.totalSizeMB            // Total size in MB
attachmentStore.imageAttachments       // Filter images only
attachmentStore.documentAttachments    // Filter documents only
```

## Backend API Endpoints

### Upload Attachment
```
POST /api/kanban/tasks/:taskId/attachments
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'file' field
```

### Get Attachments
```
GET /api/kanban/tasks/:taskId/attachments
Authorization: Bearer <token>
```

### Download Attachment
```
GET /api/kanban/tasks/:taskId/attachments/:id/download
Authorization: Bearer <token>

Returns: File stream with Content-Disposition header
```

### Delete Attachment
```
DELETE /api/kanban/tasks/:taskId/attachments/:id
Authorization: Bearer <token>
```

## Storage Details

### Cloudflare R2 Configuration
- **Bucket**: Configured via `R2_BUCKET_NAME` env variable
- **Path Structure**: `kanban/attachments/{taskId}/{attachmentId}-{filename}`
- **Access**: Private (presigned URLs for downloads)
- **URL Expiry**: 1 hour

### Database Schema
```typescript
TaskAttachment {
  id: string          // UUID
  taskId: string      // Foreign key to Task
  uploadedBy: string  // Foreign key to User
  fileName: string    // Original filename
  fileSize: bigint    // Size in bytes
  mimeType: string    // MIME type
  r2Key: string       // R2 object key
  r2Url: string       // Presigned URL (temporary)
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Usage Example

### In KanbanBoard.vue
```typescript
import { useKanbanAttachmentStore } from '~/stores/kanban'

const attachmentStore = useKanbanAttachmentStore()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

// Handle file selection
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null
  }
}

// Upload file
async function uploadAttachment() {
  if (!selectedFile.value || !taskId) return

  const result = await attachmentStore.uploadAttachment(taskId, selectedFile.value)

  if (result.success) {
    // Clear selection
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''

    // Refresh list
    await attachmentStore.fetchTaskAttachments(taskId)
  }
}

// Delete attachment
async function deleteAttachment(attachmentId: string) {
  await attachmentStore.deleteAttachment(taskId, attachmentId)
  await attachmentStore.fetchTaskAttachments(taskId)
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / k ** i * 100) / 100} ${sizes[i]}`
}
```

## UI States

### Empty State
```
No attachments yet
```

### Loading State
```
<Icon name="lucide:loader-2" class="animate-spin" />
Loading attachments...
```

### Uploading State
```
Uploading... 45%
[===========         ] Progress bar
```

### Error State
```
Failed to upload: File size exceeds 50MB limit
```

## Best Practices

1. **File Size**: Check file size on frontend before upload
2. **File Types**: Validate file types if restricting certain formats
3. **Error Handling**: Show user-friendly error messages
4. **Progress**: Always show upload progress for large files
5. **Cleanup**: Clear file input after successful upload
6. **Refresh**: Reload attachments list after upload/delete

## Limitations

1. **Max File Size**: 50MB per file (backend configuration)
2. **Upload Mode**: Only available in edit mode, not create mode
3. **Concurrent Uploads**: One file at a time
4. **Storage Quota**: Tracked per user (future feature)
5. **File Preview**: Not implemented yet (future feature)

## Future Enhancements

- [ ] Image preview/thumbnail
- [ ] Drag & drop upload
- [ ] Multiple file selection
- [ ] Storage quota per user
- [ ] File type restrictions
- [ ] Inline image display in task description
- [ ] Attachment search
- [ ] Bulk download (zip)
