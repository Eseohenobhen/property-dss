import serverless from 'serverless-http';
import { createApp } from '../src/app.js';

export default serverless(createApp());
