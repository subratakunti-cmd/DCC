export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

const FOLDER_NAME = 'Delicious Cake Corner - Bakery Records';

/**
 * Searches for or creates a dedicated folder in Google Drive for Delicious Cake Corner
 */
export async function getOrCreateBakeryFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`Drive search failed: ${err}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${err}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Uploads a text/JSON file into the bakery folder in Google Drive
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string = 'application/json'
): Promise<DriveFileItem> {
  const folderId = await getOrCreateBakeryFolder(accessToken);

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed: ${err}`);
  }

  return await res.json();
}

/**
 * Lists all bakery backup files from the Delicious Cake Corner folder in Google Drive
 */
export async function listBakeryFiles(accessToken: string): Promise<DriveFileItem[]> {
  try {
    const folderId = await getOrCreateBakeryFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,mimeType,createdTime,size,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to list files: ${await res.text()}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Error listing files from Drive:', err);
    throw err;
  }
}

/**
 * Downloads a file's text content from Google Drive
 */
export async function downloadFileContent(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to download file content: ${await res.text()}`);
  }

  return await res.text();
}

/**
 * Deletes a file from Google Drive (Mandatory user confirmation required by caller!)
 */
export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete file: ${await res.text()}`);
  }
}
