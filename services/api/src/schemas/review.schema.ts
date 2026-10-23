import { z } from 'zod';
import { config } from '../config.js';

const SafeFilePathSchema = z
  .string()
  .min(1, 'File path cannot be empty')
  .max(300, 'File path too long')
  .refine(
    (val) => !val.startsWith('/') && !val.startsWith('\\') && !val.includes('..') && !/^[a-zA-Z]:/.test(val),
    { message: 'File path cannot be absolute, contain Windows drive letters, or directory traversal segments (..)' }
  );

export const CreateReviewSchema = z
  .object({
    projectId: z.string().uuid('Invalid projectId format').nullable().optional(),
    title: z.string().min(1, 'Title is required').max(200),
    sourceType: z.enum(['manual', 'github_pr']).default('manual'),
    language: z.string().min(1).default('typescript'),
    categories: z
      .array(z.enum(['bugs', 'security', 'performance', 'quality', 'tests']))
      .min(1, 'At least one review category must be selected')
      .default(['bugs', 'security', 'performance', 'quality', 'tests']),
    files: z
      .array(
        z.object({
          path: SafeFilePathSchema,
          content: z.string().min(1, 'File content cannot be empty'),
        })
      )
      .min(1, 'At least one file must be submitted')
      .max(config.MAX_FILES_PER_REVIEW, `Exceeded maximum file count of ${config.MAX_FILES_PER_REVIEW}`),
  })
  .refine(
    (data) => {
      const totalBytes = data.files.reduce((sum, f) => sum + Buffer.byteLength(f.content, 'utf8'), 0);
      return totalBytes <= config.MAX_SOURCE_BYTES;
    },
    { message: `Total source payload exceeds limit of ${config.MAX_SOURCE_BYTES} bytes` }
  );

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
