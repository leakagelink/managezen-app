/** Browser-safe rules for client project attachments, shared by the form and the server upload. */
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, string[]> = {
  png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'], svg: ['image/svg+xml'],
  pdf: ['application/pdf'],
  doc: ['application/msword'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  txt: ['text/plain'],
};
export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES).map(e => '.' + e).join(',');

export function checkFile(name: string, type: string, size: number): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const allowed = ALLOWED_TYPES[ext];
  if (!allowed) return 'File type not allowed';
  if (!allowed.includes(type)) return 'File type does not match its extension';
  if (size <= 0 || size > MAX_FILE_BYTES) return 'Each file must be under 10 MB';
  return null;
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').slice(-60) || 'file';
}
