export const errorResponse = (message: string, status: number) => {
	return new Response(JSON.stringify({ error: message }), {
		status: status,
		headers: { 'Content-Type': 'application/json' },
	});
};

// export const successResponse = (message: string, status: number, data: object) => {
// 	return new Response(JSON.stringify({ message: message, data }), {
// 		status: 200,
// 		headers: { 'Content-Type': 'application/json' },
// 	});
// };
