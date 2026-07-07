import serverless from 'serverless-http';
import { createApp } from '../src/app.js';

const handler = serverless(createApp());

export default async function vercelHandler(req, res) {
  // serverless-http returns a handler compatible with (req, res)
  return handler(req, res);
}
