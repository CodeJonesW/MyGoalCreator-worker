import { Env } from '../../types';

export async function performBatchInserts(env: Env, sqlInserts: string[]) {
	const db = env.DB;

	try {
		await db.exec('BEGIN TRANSACTION');

		for (const sql of sqlInserts) {
			await db.prepare(sql).run();
		}

		await db.exec('COMMIT');
		console.log('All inserts completed successfully.');
	} catch (error) {
		await db.exec('ROLLBACK');
		console.error('Transaction failed, rolled back.', error);
		throw error;
	}
}
