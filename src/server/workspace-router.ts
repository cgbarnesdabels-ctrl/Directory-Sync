/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { google } from 'googleapis';

const router = express.Router();

const getAuth = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Authorization header missing');
  const token = authHeader.replace('Bearer ', '');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return auth;
};

// POST /api/workspace/gmail/send-report
router.post('/gmail/send-report', async (req, res) => {
  try {
    const auth = getAuth(req);
    const gmail = google.gmail({ version: 'v1', auth });
    const { to, subject, body } = req.body;

    const message = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    res.json({ success: true, message: 'Security report sent via Gmail.' });
  } catch (error: any) {
    console.error('Gmail Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workspace/gmail/messages
router.get('/gmail/messages', async (req, res) => {
  try {
    const auth = getAuth(req);
    const gmail = google.gmail({ version: 'v1', auth });
    
    // List messages with a simple query for "Security" or from "me"
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:(Security OR Audit OR Alert)',
      maxResults: 5
    });

    const messages = await Promise.all(
      (response.data.messages || []).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full'
        });
        
        const headers = detail.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers?.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers?.find(h => h.name === 'Date')?.value || '';
        
        return {
          id: msg.id,
          snippet: detail.data.snippet,
          subject,
          from,
          date
        };
      })
    );

    res.json({ success: true, messages });
  } catch (error: any) {
    console.error('Gmail List Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/calendar/schedule-audit
router.post('/calendar/schedule-audit', async (req, res) => {
  try {
    const auth = getAuth(req);
    const calendar = google.calendar({ version: 'v3', auth });
    const { summary, description, startTime } = req.body;

    const event = {
      summary,
      description,
      start: {
        dateTime: startTime, // ISO format
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(new Date(startTime).getTime() + 30 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      },
      colorId: '11', // Bold blue
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    res.json({ 
      success: true, 
      message: 'Security audit scheduled in Google Calendar.',
      link: response.data.htmlLink 
    });
  } catch (error: any) {
    console.error('Calendar Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/chat/post-alert
router.post('/chat/post-alert', async (req, res) => {
  try {
    const auth = getAuth(req);
    const chat = google.chat({ version: 'v1', auth });
    const { text, spaceName } = req.body;

    // We need a space name (e.g., spaces/XXXXXXXX)
    // If not provided, we try to list spaces and use the first one
    let targetSpace = spaceName;
    if (!targetSpace) {
      const spaces = await chat.spaces.list();
      if (spaces.data.spaces && spaces.data.spaces.length > 0) {
        targetSpace = spaces.data.spaces[0].name;
      }
    }

    if (!targetSpace) {
      throw new Error('No Google Chat space found to post message.');
    }

    await chat.spaces.messages.create({
      parent: targetSpace,
      requestBody: { text },
    });

    res.json({ success: true, message: `Alert posted to Google Chat space: ${targetSpace}` });
  } catch (error: any) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workspace/keep/create-note
router.post('/keep/create-note', async (req, res) => {
  try {
    const auth = getAuth(req);
    const keep = google.keep({ version: 'v1', auth });
    const { title, text } = req.body;

    await keep.notes.create({
      requestBody: {
        title,
        body: {
          text: { text }
        }
      }
    });

    res.json({ success: true, message: 'Security note saved to Google Keep.' });
  } catch (error: any) {
    console.error('Keep Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as workspaceRouter };
