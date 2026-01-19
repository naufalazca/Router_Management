import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type HeadObjectCommandInput,
  type ListObjectsV2CommandInput
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { config } from '../config';

/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible, so we use AWS SDK v3 with R2 endpoint
 * Documentation: https://developers.cloudflare.com/r2/api/s3/api/
 */
class R2Client {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    // R2 endpoint format: https://<account_id>.r2.cloudflarestorage.com
    const endpoint = `https://${config.r2.accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: config.r2.region,
      endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey
      }
    });

    this.bucketName = config.r2.bucketName;
  }

  /**
   * Upload file to R2
   * @param key - Object key (path) in bucket
   * @param body - File content (Buffer or Readable stream)
   * @param contentType - MIME type
   * @returns Upload result with ETag and key
   */
  async upload(
    key: string,
    body: Buffer | Readable | string,
    contentType: string = 'application/octet-stream'
  ): Promise<{ key: string; etag: string; size: number }> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    };

    // Use Upload for better handling of large files (multipart upload)
    const upload = new Upload({
      client: this.client,
      params
    });

    const result = await upload.done();

    return {
      key,
      etag: result.ETag || '',
      size: typeof body === 'string' ? Buffer.byteLength(body) : body instanceof Buffer ? body.length : 0
    };
  }

  /**
   * Download file from R2
   * @param key - Object key in bucket
   * @returns File content as Buffer
   */
  async download(key: string): Promise<Buffer> {
    const params: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key
    };

    const command = new GetObjectCommand(params);
    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Download file as stream (for large files)
   * @param key - Object key in bucket
   * @returns Readable stream
   */
  async downloadStream(key: string): Promise<Readable> {
    const params: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key
    };

    const command = new GetObjectCommand(params);
    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    return response.Body as Readable;
  }

  /**
   * Delete file from R2
   * @param key - Object key in bucket
   */
  async delete(key: string): Promise<void> {
    const params: DeleteObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key
    };

    const command = new DeleteObjectCommand(params);
    await this.client.send(command);
  }

  /**
   * Delete multiple files from R2
   * @param keys - Array of object keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    const deletePromises = keys.map(key => this.delete(key));
    await Promise.all(deletePromises);
  }

  /**
   * Check if file exists in R2
   * @param key - Object key in bucket
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const params: HeadObjectCommandInput = {
        Bucket: this.bucketName,
        Key: key
      };

      const command = new HeadObjectCommand(params);
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param key - Object key in bucket
   * @returns File metadata (size, etag, last modified, etc)
   */
  async getMetadata(key: string): Promise<{
    size: number;
    etag: string;
    lastModified: Date;
    contentType: string;
  }> {
    const params: HeadObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key
    };

    const command = new HeadObjectCommand(params);
    const response = await this.client.send(command);

    return {
      size: response.ContentLength || 0,
      etag: response.ETag || '',
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType || 'application/octet-stream'
    };
  }

  /**
   * Generate presigned URL for temporary download access
   * @param key - Object key in bucket
   * @param expiresIn - URL expiration in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params: GetObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key
    };

    const command = new GetObjectCommand(params);
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * List objects with specific prefix
   * @param prefix - Key prefix to filter
   * @param maxKeys - Maximum number of keys to return
   * @returns Array of object keys
   */
  async listObjects(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    const params: ListObjectsV2CommandInput = {
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys
    };

    const command = new ListObjectsV2Command(params);
    const response = await this.client.send(command);

    return (response.Contents || []).map(obj => obj.Key || '').filter(key => key !== '');
  }

  /**
   * Get storage statistics for a prefix
   * @param prefix - Key prefix to analyze
   * @returns Total size and count
   */
  async getStorageStats(prefix: string): Promise<{ totalSize: number; fileCount: number }> {
    const params: ListObjectsV2CommandInput = {
      Bucket: this.bucketName,
      Prefix: prefix
    };

    const command = new ListObjectsV2Command(params);
    const response = await this.client.send(command);

    const contents = response.Contents || [];
    const totalSize = contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);

    return {
      totalSize,
      fileCount: contents.length
    };
  }
}

// Export singleton instance
export const r2Client = new R2Client();
