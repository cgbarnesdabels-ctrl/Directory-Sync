/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { google } from 'googleapis';
import { Readable } from 'stream';

const router = express.Router();

// POST /api/drive/upload-audit-log
router.post('/upload-audit-log', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'OAuth Access Token is required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { logs, filename = 'audit-log-export.csv' } = req.body;

  if (!logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: 'Valid audit logs are required for export' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const drive = google.drive({ version: 'v3', auth });

    // Convert logs to CSV string
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Result', 'Device ID'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        `"${log.timestamp}"`,
        `"${log.userEmail}"`,
        `"${log.action}"`,
        `"${log.resource}"`,
        `"${log.result}"`,
        `"${log.deviceId || 'unknown'}"`
      ].join(','))
    ].join('\n');

    const fileMetadata = {
      name: filename,
      mimeType: 'text/csv'
    };

    const media = {
      mimeType: 'text/csv',
      body: Readable.from([csvContent])
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    res.json({
      success: true,
      message: 'Audit log successfully exported to Google Drive.',
      fileId: response.data.id,
      fileName: response.data.name,
      link: response.data.webViewLink
    });
  } catch (error: any) {
    console.error('Google Drive Upload Error:', error);
    res.status(500).json({
      error: 'Failed to upload audit log to Google Drive',
      details: error.message
    });
  }
});

export { router as driveRouter };
