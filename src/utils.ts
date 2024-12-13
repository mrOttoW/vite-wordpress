import path from 'path';
import { NormalizedOutputOptions, OutputBundle, OutputChunk } from 'rollup';

export function camelToKebab(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function createBundleMap(bundleOptions: NormalizedOutputOptions, bundle: OutputBundle, bundleMap: Record<string, string> = {}) {
  // For each build file find the fileName with hash.
  for (const module of Object.values(bundle)) {
    if (module.type !== 'chunk' || !('facadeModuleId' in module)) {
      continue;
    }

    const chunk = module as OutputChunk;
    const hasImportedCss = chunk.viteMetadata?.importedCss?.size > 0;
    const hasImportedAssets = chunk.viteMetadata?.importedAssets?.size > 0;
    const bundleName = path.join(bundleOptions.dir, chunk.name);

    // Handle PHP file mapping
    if (chunk.facadeModuleId.endsWith('.php') && !bundleMap[`${bundleName}.php`] && hasImportedAssets) {
      bundleMap[`${bundleName}.php`] = chunk.viteMetadata.importedAssets.values().next().value;
      continue;
    }

    // Handle JS file mapping
    if (!bundleMap[`${bundleName}.js`]) {
      bundleMap[`${bundleName}.js`] = chunk.fileName;

      // Handle CSS file mapping if CSS is imported
      if (hasImportedCss && !bundleMap[`${bundleName}.css`]) {
        const importedCss = chunk.viteMetadata.importedCss as Set<string>;
        bundleMap[`${bundleName}.css`] = importedCss.values().next().value;
      }
    }
  }

  return bundleMap;
}

export const resolveHashedBlockFilePaths = (
  jsonFileName: string,
  jsonObject: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  bundleMap: Record<string, string> = {},
  bundleOptions: NormalizedOutputOptions
) => {
  const filePath = path.join(bundleOptions.dir, jsonFileName);
  const baseDir = path.dirname(filePath);

  for (const key in jsonObject) {
    if (typeof jsonObject[key] === 'string' && jsonObject[key].startsWith('file:')) {
      const relativePath = jsonObject[key].slice(5); // Remove "file:" prefix
      const absolutePath = path.resolve(baseDir, relativePath);

      if (bundleMap[absolutePath]) {
        jsonObject[key] = `file:./${path.basename(bundleMap[absolutePath])}`;
      }
    } else if (typeof jsonObject[key] === 'object' && jsonObject[key] !== null) {
      resolveHashedBlockFilePaths(filePath, jsonObject[key], bundleMap, bundleOptions);
    }
  }

  return jsonObject;
};
