import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface Env {
	DB: D1Database;
	JWT_SECRET: string;
	YOUTUBE_API_KEY: string;
	OPENAI_API_KEY: string;
}

const verifyToken = async (request: Request, env: Env): Promise<{ user: any } | Response> => {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const token = authHeader.split(' ')[1];
	try {
		const decoded = jwt.verify(token, env.JWT_SECRET);
		return { user: decoded };
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Invalid token' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

export default {
	async fetch(request, env): Promise<Response> {
		const { pathname } = new URL(request.url);
		console.log('pathname', pathname);

		if (pathname === '/api/register') {
			const email = request.headers.get('x-email');
			const password = request.headers.get('x-password');
			if (!email || !password) {
				return new Response(JSON.stringify({ error: 'Missing email or password' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const user = await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
			if (user) {
				console.log('User already exists');
				return new Response(JSON.stringify({ error: 'User already exists' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const saltRounds = 10;
			const hashedPassword = await bcrypt.hash(password, saltRounds);
			const { success } = await env.DB.prepare(`INSERT INTO Users (email, user_password, analyze_requests) VALUES (?, ?, ?)`)
				.bind(email, hashedPassword, 0)
				.run();
			if (success) {
				return new Response(JSON.stringify({ message: 'User added successfully' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} else {
				return new Response(JSON.stringify({ error: 'Failed to insert user' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		if (pathname === '/api/login') {
			const email = request.headers.get('x-email');
			const password = request.headers.get('x-password');
			if (!email || !password) {
				return new Response(JSON.stringify({ error: 'Missing email or password' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const user = await env.DB.prepare(`SELECT * FROM Users WHERE email = ?`).bind(email).first();
			if (!user) {
				return new Response(JSON.stringify({ error: 'User not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const match = await bcrypt.compare(password, user.user_password as string);
			if (!match) {
				return new Response(JSON.stringify({ error: 'Invalid password' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const token = jwt.sign({ email: user.email, userId: user.UserId }, env.JWT_SECRET, { expiresIn: '1h' });

			return new Response(JSON.stringify({ message: 'Login successful', access_token: token }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (pathname === '/api/profile') {
			const authResponse = await verifyToken(request, env);
			if (authResponse instanceof Response) return authResponse;

			const user = authResponse.user;
			console.log('Authenticated user:', user);

			const userFromDb = await env.DB.prepare(`SELECT email, analyze_requests FROM Users WHERE UserId = ?`).bind(user.userId).first();
			if (!userFromDb) {
				return new Response(JSON.stringify({ error: 'User not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ user: userFromDb }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (pathname === '/api/analyze') {
			const authResponse = await verifyToken(request, env);
			if (authResponse instanceof Response) return authResponse;

			const user = authResponse.user;
			const userFromDb = await env.DB.prepare(`SELECT UserId FROM Users WHERE UserId = ?`).bind(user.userId).first();
			if (!userFromDb) {
				return new Response(JSON.stringify({ error: 'User not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const requestBody = await request.json();
			// @ts-ignore
			const { url: videoUrl, prompt } = requestBody;

			if (!videoUrl) {
				return new Response(JSON.stringify({ error: 'Missing video URL' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Step 3: Extract the video ID from the YouTube URL
			const videoIdMatch =
				videoUrl.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/) ||
				videoUrl.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);
			if (!videoIdMatch) {
				return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const videoId = videoIdMatch[1];

			// Step 4: Fetch captions from YouTube API
			try {
				const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${env.YOUTUBE_API_KEY}`;
				const captionsListResponse = await fetch(captionsListUrl);

				if (!captionsListResponse.ok) {
					return new Response(JSON.stringify({ error: 'Failed to fetch captions list from YouTube' }), {
						status: captionsListResponse.status,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				const captionsListData: any = await captionsListResponse.json();
				if (!captionsListData.items || captionsListData.items.length === 0) {
					return new Response(JSON.stringify({ error: 'No captions available for this video' }), {
						status: 404,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				const captionId = captionsListData.items[0].id;
				const captionDataUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=ttml&key=${env.YOUTUBE_API_KEY}`;

				const captionResponse = await fetch(captionDataUrl);
				if (!captionResponse.ok) {
					return new Response(JSON.stringify({ error: 'Failed to fetch caption data' }), {
						status: captionResponse.status,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				const captionText = await captionResponse.text(); // You will get the captions in TTML or plain text depending on the format

				// Step 5: Analyze captions using OpenAI API
				const openAiResponse = await fetch('https://api.openai.com/v1/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${env.OPENAI_API_KEY}`,
					},
					body: JSON.stringify({
						model: 'text-davinci-003', // or another appropriate model
						prompt: `Analyze the following YouTube video transcript:\n${captionText}\n\n${prompt}`,
						max_tokens: 1500, // Adjust according to your requirements
					}),
				});

				if (!openAiResponse.ok) {
					return new Response(JSON.stringify({ error: 'Failed to analyze captions with OpenAI' }), {
						status: openAiResponse.status,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				const openAiData: any = await openAiResponse.json();

				// Return the analyzed data
				return new Response(JSON.stringify({ analysis: openAiData.choices[0].text.trim() }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				console.error('Error occurred during analysis:', error);
				return new Response(JSON.stringify({ error: 'Internal server error' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		return new Response('TubeScriptAiWorker');
	},
} satisfies ExportedHandler<Env>;
