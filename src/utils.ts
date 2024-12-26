import path from 'path';
import fs from 'fs';
import { NormalizedOutputOptions } from 'rollup';
import { ManifestChunk } from 'vite';

export const camelToKebab = (str: string): string => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const getFileExtension = (filePath: string): string => {
  const lastDotIndex = filePath.lastIndexOf('.');
  return lastDotIndex !== -1 ? filePath.slice(lastDotIndex + 1) : '';
};

export const resolveHashedBlockFilePaths = (
  jsonFileName: string,
  jsonObject: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  buildFileMap: Record<string, ManifestChunk> = {},
  bundleOptions: NormalizedOutputOptions
) => {
  const filePath = path.join(bundleOptions.dir, jsonFileName);
  const baseDir = path.dirname(filePath);

  for (const key in jsonObject) {
    if (typeof jsonObject[key] === 'string' && jsonObject[key].startsWith('file:')) {
      const relativePath = jsonObject[key].slice(5); // Remove "file:" prefix
      const absolutePath = path.resolve(baseDir, relativePath);
      const extension = getFileExtension(relativePath);
      const mappedFile = Object.values(buildFileMap).find(chunk => {
        return path.join(bundleOptions.dir, `${chunk.name}.${extension}`) === absolutePath;
      });

      if (mappedFile) {
        jsonObject[key] = `file:./${path.basename(mappedFile['file'])}`;
      }
    } else if (typeof jsonObject[key] === 'object' && jsonObject[key] !== null) {
      resolveHashedBlockFilePaths(filePath, jsonObject[key], buildFileMap, bundleOptions);
    }
  }
  return jsonObject;
};

export const checkForInteractivity = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('@wordpress/interactivity')) {
    return true;
  }

  return false;
};
