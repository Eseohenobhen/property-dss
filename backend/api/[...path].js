import { createApp } from '../src/app.js';

const app = createApp();

export default function handler(req, res) {
	if (process.env.VERCEL) {
		req.url = req.url.replace(/^\/api(?=\/|$)/, '') || '/';
	}

	return app(req, res);
}
