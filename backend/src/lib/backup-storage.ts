import { createHash } from 'crypto';
import { r2Client } from './r2-client';

/**
 * Backup Storage Utilities
 *
 * Helper functions for managing router backups in R2 storage
 */

/**
 * Generate storage key for backup file
 * Format: backups/{routerId}/{timestamp}-{backupType}.rsc
 *
 * @param routerId - Router UUID
 * @param backupType - Type of backup (EXPORT, BINARY, etc)
 * @returns Storage key path
 */
export function generateBackupStorageKey(routerId: string, backupType: string = 'EXPORT'): string {
  const timestamp = Date.now();
  const extension = backupType === 'BINARY' ? 'backup' : 'rsc';
  return `backups/${routerId}/${timestamp}-${backupType.toLowerCase()}.${extension}`;
}

/**
 * Calculate SHA256 checksum of file content
 *
 * @param content - File content as Buffer or string
 * @returns SHA256 hash in hexadecimal
 */
export function calculateChecksum(content: Buffer | string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Upload backup file to R2 storage
 *
 * @param storageKey - Storage key path
 * @param content - Backup file content
 * @param contentType - MIME type (default: text/plain for .rsc)
 * @returns Upload result with checksum
 */
export async function uploadBackup(
  storageKey: string,
  content: Buffer | string,
  contentType: string = 'text/plain'
): Promise<{
  storageKey: string;
  checksum: string;
  fileSize: number;
  etag: string;
}> {
  // Calculate checksum before upload
  const checksum = calculateChecksum(content);
  const fileSize = typeof content === 'string' ? Buffer.byteLength(content) : content.length;

  // Upload to R2
  const result = await r2Client.upload(storageKey, content, contentType);

  return {
    storageKey,
    checksum,
    fileSize,
    etag: result.etag
  };
}

/**
 * Download backup file from R2 storage
 *
 * @param storageKey - Storage key path
 * @returns Backup file content as Buffer
 */
export async function downloadBackup(storageKey: string): Promise<Buffer> {
  return await r2Client.download(storageKey);
}

/**
 * Download backup and verify checksum
 *
 * @param storageKey - Storage key path
 * @param expectedChecksum - Expected SHA256 checksum
 * @returns Backup file content if checksum matches
 * @throws Error if checksum mismatch
 */
export async function downloadAndVerifyBackup(
  storageKey: string,
  expectedChecksum: string
): Promise<Buffer> {
  const content = await r2Client.download(storageKey);
  const actualChecksum = calculateChecksum(content);

  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch for ${storageKey}. Expected: ${expectedChecksum}, Got: ${actualChecksum}`
    );
  }

  return content;
}

/**
 * Delete backup file from R2 storage
 *
 * @param storageKey - Storage key path
 */
export async function deleteBackup(storageKey: string): Promise<void> {
  await r2Client.delete(storageKey);
}

/**
 * Delete multiple backup files from R2 storage
 *
 * @param storageKeys - Array of storage key paths
 */
export async function deleteBackups(storageKeys: string[]): Promise<void> {
  await r2Client.deleteMany(storageKeys);
}

/**
 * Generate presigned URL for backup download
 * Used to provide temporary download links to users
 *
 * @param storageKey - Storage key path
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns Presigned download URL
 */
export async function generateBackupDownloadUrl(
  storageKey: string,
  expiresIn: number = 3600
): Promise<string> {
  return await r2Client.getPresignedUrl(storageKey, expiresIn);
}

/**
 * Check if backup file exists in R2 storage
 *
 * @param storageKey - Storage key path
 * @returns true if exists, false otherwise
 */
export async function backupExists(storageKey: string): Promise<boolean> {
  return await r2Client.exists(storageKey);
}

/**
 * Get backup file metadata from R2
 *
 * @param storageKey - Storage key path
 * @returns File metadata
 */
export async function getBackupMetadata(storageKey: string): Promise<{
  size: number;
  etag: string;
  lastModified: Date;
  contentType: string;
}> {
  return await r2Client.getMetadata(storageKey);
}

/**
 * List all backups for a specific router
 *
 * @param routerId - Router UUID
 * @returns Array of storage keys
 */
export async function listRouterBackups(routerId: string): Promise<string[]> {
  const prefix = `backups/${routerId}/`;
  return await r2Client.listObjects(prefix);
}

/**
 * Get storage statistics for a router's backups
 *
 * @param routerId - Router UUID
 * @returns Total size and file count
 */
export async function getRouterBackupStats(routerId: string): Promise<{
  totalSize: number;
  fileCount: number;
  totalSizeMB: number;
}> {
  const prefix = `backups/${routerId}/`;
  const stats = await r2Client.getStorageStats(prefix);

  return {
    ...stats,
    totalSizeMB: Math.round((stats.totalSize / 1024 / 1024) * 100) / 100
  };
}

/**
 * Parse configuration summary from RouterOS export content
 * This extracts key statistics from .rsc file
 *
 * @param content - RouterOS export content
 * @returns Configuration summary object
 */
export function parseConfigSummary(content: string): Record<string, number> {
  const summary: Record<string, number> = {};

  // Count various configuration sections
  const patterns = {
    interfaces: /\/interface /g,
    ipAddresses: /\/ip address add/g,
    firewallRules: /\/ip firewall filter add/g,
    natRules: /\/ip firewall nat add/g,
    routes: /\/ip route add/g,
    dhcpServers: /\/ip dhcp-server add/g,
    users: /\/user add/g,
    scripts: /\/system script add/g,
    scheduler: /\/system scheduler add/g,
    queues: /\/queue /g
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    summary[key] = matches ? matches.length : 0;
  }

  return summary;
}

/**
 * Extract RouterOS version from export content
 * RouterOS exports typically have a comment line with version info
 *
 * @param content - RouterOS export content
 * @returns RouterOS version string or null
 */
export function extractRouterOSVersion(content: string): string | null {
  // Look for version in header comment
  // Example: "# jan/19/2026 12:34:56 by RouterOS 7.16"
  const versionMatch = content.match(/by RouterOS ([\d.]+)/);
  if (versionMatch) {
    return versionMatch[1];
  }

  // Alternative pattern: "# software id = XXXX"
  const softwareMatch = content.match(/# software id = ([^\n]+)/);
  if (softwareMatch) {
    return softwareMatch[1].trim();
  }

  return null;
}
