const ROOT_MODEL_FILE_PATTERN = /\.(glb|gltf)$/i;

function normalizeModelAssetPath(path: string) {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');
}

function getModelAssetCandidates(path: string) {
  const normalized = normalizeModelAssetPath(path);
  const decoded = normalizeModelAssetPath(decodeURIComponent(path));
  const candidates = new Set<string>([normalized, decoded]);

  const addTail = (value: string) => {
    const parts = value.split('/');
    const tail = parts[parts.length - 1];

    if (tail) {
      candidates.add(tail);
    }
  };

  addTail(normalized);
  addTail(decoded);

  return [...candidates].filter(Boolean);
}

export function isRootModelFile(name: string) {
  return ROOT_MODEL_FILE_PATTERN.test(name);
}

export function createUploadedModelAssetSet(files: File[]) {
  const rootFile = files.find((file) =>
    isRootModelFile(file.webkitRelativePath || file.name),
  );

  if (!rootFile) {
    return null;
  }

  const assetUrls: Record<string, string> = {};

  for (const file of files) {
    const objectUrl = URL.createObjectURL(file);
    const relativePath = normalizeModelAssetPath(file.webkitRelativePath || file.name);

    assetUrls[relativePath] = objectUrl;

    const fileName = normalizeModelAssetPath(file.name);
    if (!assetUrls[fileName]) {
      assetUrls[fileName] = objectUrl;
    }
  }

  const rootKey = normalizeModelAssetPath(rootFile.webkitRelativePath || rootFile.name);
  const rootUrl = assetUrls[rootKey] ?? assetUrls[normalizeModelAssetPath(rootFile.name)];

  return {
    rootFile,
    rootUrl,
    assetUrls,
  };
}

export function resolveUploadedModelAssetUrl(
  requestUrl: string,
  assetUrls: Record<string, string>,
) {
  if (!requestUrl || requestUrl.startsWith('data:')) {
    return requestUrl;
  }

  for (const candidate of getModelAssetCandidates(requestUrl)) {
    if (assetUrls[candidate]) {
      return assetUrls[candidate];
    }
  }

  try {
    const parsedUrl = new URL(requestUrl);

    for (const candidate of getModelAssetCandidates(parsedUrl.pathname)) {
      if (assetUrls[candidate]) {
        return assetUrls[candidate];
      }
    }
  } catch {
    // Ignore invalid URLs and fall back to the original request.
  }

  return requestUrl;
}

export function revokeUploadedModelAssetUrls(
  assetUrls: Record<string, string> | null | undefined,
) {
  if (!assetUrls) {
    return;
  }

  const seen = new Set<string>();

  for (const url of Object.values(assetUrls)) {
    if (!url.startsWith('blob:') || seen.has(url)) {
      continue;
    }

    seen.add(url);
    URL.revokeObjectURL(url);
  }
}
